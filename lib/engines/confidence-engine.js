// /lib/engines/confidence-engine.js

const ENGINE_VERSION = "1.0.0-foundation";

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function average(values) {
  const valid = values.filter((value) => typeof value === "number");
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function getTrustLevel(score) {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function scoreFlightConfidence({ flightIntelligence, sources }) {
  const decision = flightIntelligence?.flightDecision || sources?.flight?.decision || null;

  if (!decision) {
    return {
      score: 35,
      trustLevel: "low",
      reasons: ["Sem decisão de voo disponível."],
      risks: ["Hora e estado do voo não validados por fonte externa."],
    };
  }

  const selectedSourceType = decision.selectedSourceType || sources?.flight?.sourceType;
  const liveDataActive = Boolean(decision.liveDataActive);
  const sourcesUsed = decision.sourcesUsed || 0;
  const conflicts = decision.conflictsDetected || 0;

  let score = decision.confidenceScore ?? 50;
  const reasons = [];
  const risks = [];

  if (liveDataActive) {
    score += 12;
    reasons.push("Dados de voo live disponíveis.");
  } else {
    score -= 18;
    risks.push("Voo em fallback manual ou sem validação live.");
  }

  if (sourcesUsed >= 2) {
    score += 10;
    reasons.push("Mais do que uma fonte de voo disponível.");
  }

  if (sourcesUsed <= 1) {
    score -= 8;
    risks.push("A decisão de voo depende de uma única fonte.");
  }

  if (conflicts > 0) {
    score -= conflicts * 8;
    risks.push("Existem conflitos entre fontes de voo.");
  }

  if (selectedSourceType === "manual_fallback_time") {
    score -= 18;
    risks.push("Hora do voo introduzida manualmente.");
  }

  return {
    score: clamp(score),
    trustLevel: getTrustLevel(score),
    reasons,
    risks,
  };
}

function scoreAirportConfidence({ airportIntelligence }) {
  const op = airportIntelligence?.operationalIntelligence || null;

  if (!op) {
    return {
      score: 45,
      trustLevel: "low",
      reasons: [],
      risks: ["Sem inteligência aeroportuária estruturada."],
    };
  }

  let score = op.confidenceScore ?? 55;
  const reasons = [];
  const risks = [];

  if (op.liveDataActive) {
    score += 15;
    reasons.push("Dados aeroportuários live disponíveis.");
  } else {
    risks.push("Aeroporto baseado em perfil interno, sem filas live oficiais.");
  }

  if (airportIntelligence?.airport?.dedicatedProfile) {
    score += 8;
    reasons.push("Aeroporto com perfil dedicado.");
  }

  if (op.estimatedSecurityMinutes) {
    score += 5;
    reasons.push("Estimativa de segurança disponível.");
  }

  if (op.estimatedWalkingMinutes) {
    score += 5;
    reasons.push("Estimativa de deslocação interna disponível.");
  }

  return {
    score: clamp(score),
    trustLevel: getTrustLevel(score),
    reasons,
    risks,
  };
}

function scoreRouteConfidence({ routeIntelligence }) {
  const reliability = routeIntelligence?.reliability || null;

  if (!reliability) {
    return {
      score: 40,
      trustLevel: "low",
      reasons: [],
      risks: ["Sem inteligência de rota disponível."],
    };
  }

  let score = reliability.confidenceScore ?? reliability.score ?? 55;
  const reasons = [];
  const risks = [];

  if (reliability.liveDataActive) {
    score += 12;
    reasons.push("Rota com estimativa live disponível.");
  } else {
    score -= 10;
    risks.push("Rota baseada em estimativa não-live.");
  }

  if (routeIntelligence?.operationalProfile?.routeRiskLevel === "low") {
    score += 6;
    reasons.push("Rota dentro do esperado.");
  }

  if (routeIntelligence?.operationalProfile?.routeRiskLevel === "high") {
    score -= 18;
    risks.push("Rota com risco operacional elevado.");
  }

  return {
    score: clamp(score),
    trustLevel: getTrustLevel(score),
    reasons,
    risks,
  };
}

function scoreWeatherConfidence({ weatherIntelligence }) {
  const weather = weatherIntelligence?.weatherIntelligence || null;

  if (!weather) {
    return {
      score: 50,
      trustLevel: "medium",
      reasons: [],
      risks: ["Sem meteorologia integrada."],
    };
  }

  let score = weather.confidenceScore ?? 65;
  const reasons = [];
  const risks = [];

  if (weather.liveDataActive) {
    score += 10;
    reasons.push("Previsão meteorológica live disponível.");
  }

  if (weather.weatherRisk === "low") {
    score += 5;
    reasons.push("Meteorologia sem impacto relevante.");
  }

  if (weather.weatherRisk === "medium") {
    score -= 8;
    risks.push("Meteorologia com impacto operacional moderado.");
  }

  if (weather.weatherRisk === "high") {
    score -= 20;
    risks.push("Meteorologia com impacto operacional elevado.");
  }

  return {
    score: clamp(score),
    trustLevel: getTrustLevel(score),
    reasons,
    risks,
  };
}

function scoreUserComplexity({ journey }) {
  const profile = journey?.profile || {};
  let score = 90;
  const reasons = [];
  const risks = [];

  if (profile.bags) {
    score -= 10;
    risks.push("Bagagem de porão aumenta variabilidade.");
  } else {
    reasons.push("Sem bagagem de porão.");
  }

  if (profile.kids) {
    score -= 12;
    risks.push("Viagem com crianças aumenta fricção operacional.");
  }

  if (profile.checkedIn) {
    score += 8;
    reasons.push("Check-in online confirmado.");
  } else {
    score -= 8;
    risks.push("Check-in online ainda não confirmado.");
  }

  if (profile.fastTrack) {
    score += 6;
    reasons.push("Fast track reduz risco na segurança.");
  }

  if (profile.priorityBoarding) {
    score += 3;
    reasons.push("Embarque prioritário reduz pressão na porta.");
  }

  return {
    score: clamp(score),
    trustLevel: getTrustLevel(score),
    reasons,
    risks,
  };
}

export function runConfidenceEngine({
  journey = null,
  flightIntelligence = null,
  airportIntelligence = null,
  routeIntelligence = null,
  weatherIntelligence = null,
  sources = null,
} = {}) {
  const flight = scoreFlightConfidence({ flightIntelligence, sources });
  const airport = scoreAirportConfidence({ airportIntelligence });
  const route = scoreRouteConfidence({ routeIntelligence });
  const weather = scoreWeatherConfidence({ weatherIntelligence });
  const user = scoreUserComplexity({ journey });

  const weightedScore = clamp(
    flight.score * 0.4 +
      airport.score * 0.2 +
      route.score * 0.15 +
      weather.score * 0.1 +
      user.score * 0.15
  );

  const reasons = [
    ...flight.reasons,
    ...airport.reasons,
    ...route.reasons,
    ...weather.reasons,
    ...user.reasons,
  ];

  const risks = [
    ...flight.risks,
    ...airport.risks,
    ...route.risks,
    ...weather.risks,
    ...user.risks,
  ];

  return {
    success: true,
    engine: "Home2Flight Confidence Engine",
    version: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),

    overall: {
      confidenceScore: weightedScore,
      trustLevel: getTrustLevel(weightedScore),
      recommendationReliability:
        weightedScore >= 80 ? "strong" : weightedScore >= 60 ? "usable" : "weak",
    },

    breakdown: {
      flight,
      airport,
      route,
      weather,
      user,
    },

    explanation: {
      headline:
        weightedScore >= 80
          ? "Timeline com confiança forte."
          : weightedScore >= 60
          ? "Timeline utilizável, mas com limitações."
          : "Timeline frágil. Recomenda validação manual.",
      reasons: reasons.slice(0, 6),
      riskFactors: risks.slice(0, 8),
    },

    weights: {
      flight: 0.4,
      airport: 0.2,
      route: 0.15,
      weather: 0.1,
      user: 0.15,
    },
  };
}

export default runConfidenceEngine;