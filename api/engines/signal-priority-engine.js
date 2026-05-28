// /api/engines/signal-priority-engine.js

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function severityScore(severity) {
  switch (String(severity || "").toLowerCase()) {
    case "critical":
      return 100;
    case "high":
      return 82;
    case "medium":
      return 56;
    case "low":
      return 18;
    default:
      return 40;
  }
}

function sourceStrength(sourceType) {
  switch (sourceType) {
    case "official_airport":
    case "official_airline":
    case "official_transport":
      return 100;

    case "aviationstack_live":
    case "google_maps_route_estimate":
    case "weather_live":
      return 82;

    case "validated_community":
      return 72;

    case "user_profile":
      return 68;

    case "structured_internal_operational_model":
    case "airport_profile":
    case "city_transport_profile":
    case "internal_event_disruption_profile":
      return 52;

    case "manual_fallback_time":
    case "safe_fallback":
      return 36;

    default:
      return 45;
  }
}

function freshnessScore(freshness) {
  switch (freshness) {
    case "live":
      return 100;
    case "recent":
      return 82;
    case "cached":
      return 62;
    case "profile":
      return 48;
    case "fallback":
      return 30;
    default:
      return 45;
  }
}

function isPositiveSignal(signal) {
  const severity = String(signal.severity || "").toLowerCase();

  if (severity !== "low") return false;

  const title = String(signal.title || "").toLowerCase();
  const reasoning = String(signal.reasoning || "").toLowerCase();

  return (
    title.includes("dentro do esperado") ||
    title.includes("estável") ||
    title.includes("sem atraso") ||
    title.includes("disponíveis") ||
    reasoning.includes("dentro do esperado") ||
    reasoning.includes("sem atraso") ||
    reasoning.includes("estável")
  );
}

function operationalDomainWeight(signal) {
  const affects = signal.affects || [];

  if (affects.includes("flight") || affects.includes("departure_time")) {
    return 1.15;
  }

  if (
    affects.includes("route") ||
    affects.includes("airport_access") ||
    affects.includes("public_transport") ||
    affects.includes("leave_home_time")
  ) {
    return 1.05;
  }

  if (
    affects.includes("security") ||
    affects.includes("airport") ||
    affects.includes("check_in") ||
    affects.includes("bag_drop")
  ) {
    return 1;
  }

  if (
    affects.includes("passport_control") ||
    affects.includes("gate_timing") ||
    affects.includes("boarding")
  ) {
    return 0.92;
  }

  return 0.8;
}

function normalizeSignal(signal) {
  const confidence = number(signal.confidenceScore, 50);
  const buffer = number(signal.extraBufferMinutes, 0);
  const positive = isPositiveSignal(signal);

  const riskComponent =
    severityScore(signal.severity) * 0.34 +
    confidence * 0.18 +
    clamp(buffer * 3, 0, 100) * 0.2 +
    sourceStrength(signal.sourceType) * 0.14 +
    freshnessScore(signal.freshness) * 0.14;

  const confidenceComponent =
    sourceStrength(signal.sourceType) * 0.38 +
    freshnessScore(signal.freshness) * 0.32 +
    confidence * 0.3;

  const priorityScore = Math.round(
    clamp(
      (positive ? confidenceComponent : riskComponent) *
        operationalDomainWeight(signal),
      0,
      100
    )
  );

  let priority = "low";

  if (!positive) {
    if (priorityScore >= 78) {
      priority = "critical";
    } else if (priorityScore >= 62) {
      priority = "high";
    } else if (priorityScore >= 42) {
      priority = "medium";
    }
  } else {
    if (priorityScore >= 75) {
      priority = "confidence_high";
    } else if (priorityScore >= 55) {
      priority = "confidence_medium";
    } else {
      priority = "confidence_low";
    }
  }

  return {
    id: signal.id || signal.type || "unknown_signal",
    type: signal.type || "operational_signal",
    title: signal.title || signal.label || "Operational signal",
    severity: signal.severity || "medium",
    confidenceScore: clamp(confidence),
    sourceType: signal.sourceType || "unknown",
    freshness: signal.freshness || "profile",
    affects: signal.affects || [],
    extraBufferMinutes: buffer,
    reasoning:
      signal.reasoning ||
      "Sinal operacional considerado pela Home2Flight.",
    priorityScore,
    priority,
    positive,
    riskSignal: !positive,
    raw: signal,
  };
}

function detectContradictions(signals) {
  const contradictions = [];

  const liveRouteStable = signals.find(
    (signal) =>
      signal.positive &&
      signal.freshness === "live" &&
      signal.affects.includes("route")
  );

  const profileRouteMedium = signals.find(
    (signal) =>
      !signal.positive &&
      signal.freshness === "profile" &&
      signal.affects.includes("route") &&
      ["medium", "high"].includes(signal.severity)
  );

  if (liveRouteStable && profileRouteMedium) {
    contradictions.push({
      type: "live_route_vs_profile_route",
      severity: "low",
      title: "Rota live estável vs. perfil conservador",
      confidenceSignalId: liveRouteStable.id,
      riskSignalId: profileRouteMedium.id,
      resolution:
        "A fonte live aumenta confiança na rota, mas o perfil conservador mantém pequena margem.",
    });
  }

  const flightFallback = signals.find(
    (signal) => signal.id === "flight_manual_fallback"
  );

  const routeLive = signals.find(
    (signal) =>
      signal.positive &&
      signal.freshness === "live" &&
      signal.affects.includes("route")
  );

  if (flightFallback && routeLive) {
    contradictions.push({
      type: "manual_flight_vs_live_route",
      severity: "medium",
      title: "Voo em fallback manual, mas rota live disponível",
      riskSignalId: flightFallback.id,
      confidenceSignalId: routeLive.id,
      resolution:
        "A rota tem boa leitura live, mas a confiança global fica limitada por falta de dados reais do voo.",
    });
  }

  return contradictions;
}

function classifySignals(signals) {
  const riskSignals = signals.filter((signal) => signal.riskSignal);
  const positiveSignals = signals.filter((signal) => signal.positive);

  const sortedRisk = [...riskSignals].sort(
    (a, b) => b.priorityScore - a.priorityScore
  );

  const sortedPositive = [...positiveSignals].sort(
    (a, b) => b.priorityScore - a.priorityScore
  );

  const dominantRiskSignals = sortedRisk.filter(
    (signal) => signal.priority === "critical" || signal.priority === "high"
  );

  const supportingRiskSignals = sortedRisk.filter(
    (signal) => signal.priority === "medium"
  );

  const lowImpactRiskSignals = sortedRisk.filter(
    (signal) => signal.priority === "low"
  );

  const confidenceSupportSignals = sortedPositive.filter(
    (signal) =>
      signal.priority === "confidence_high" ||
      signal.priority === "confidence_medium"
  );

  const ignoredSignals = lowImpactRiskSignals.filter(
    (signal) => signal.extraBufferMinutes === 0 && signal.confidenceScore < 60
  );

  return {
    dominantRiskSignals,
    supportingRiskSignals,
    lowImpactRiskSignals,
    confidenceSupportSignals,
    ignoredSignals,
    positiveSignals: sortedPositive,
  };
}

function buildSummary({
  dominantRiskSignals,
  supportingRiskSignals,
  confidenceSupportSignals,
}) {
  if (dominantRiskSignals.length > 0) {
    return {
      headline: "Existem fatores dominantes na decisão operacional.",
      explanation:
        "A Home2Flight identificou fatores de risco com impacto superior e usou-os como principais justificações da timeline.",
    };
  }

  if (supportingRiskSignals.length > 0) {
    return {
      headline: "A decisão é suportada por vários fatores moderados.",
      explanation:
        "Não existe um único risco dominante, mas vários sinais justificam uma postura prudente.",
    };
  }

  if (confidenceSupportSignals.length > 0) {
    return {
      headline: "Sem riscos fortes; existem sinais positivos de confiança.",
      explanation:
        "As fontes disponíveis aumentam confiança, mantendo apenas buffers operacionais base.",
    };
  }

  return {
    headline: "Sem sinais operacionais fortes.",
    explanation:
      "A Home2Flight mantém apenas buffers base e monitorização operacional.",
  };
}

function buildRecommendations(dominantRiskSignals, supportingRiskSignals) {
  const recommendations = [];
  const allRelevant = [...dominantRiskSignals, ...supportingRiskSignals];

  if (allRelevant.some((signal) => signal.affects.includes("flight"))) {
    recommendations.push({
      priority: "high",
      type: "flight_validation",
      title: "Validar dados do voo",
      reasoning:
        "A informação do voo influencia diretamente a âncora temporal da jornada.",
    });
  }

  if (
    allRelevant.some(
      (signal) =>
        signal.affects.includes("route") ||
        signal.affects.includes("airport_access")
    )
  ) {
    recommendations.push({
      priority: "high",
      type: "route_monitoring",
      title: "Monitorizar trajeto até ao aeroporto",
      reasoning:
        "Os sinais de rota ou acesso podem alterar a hora recomendada de saída.",
    });
  }

  if (
    allRelevant.some(
      (signal) =>
        signal.affects.includes("security") ||
        signal.affects.includes("airport")
    )
  ) {
    recommendations.push({
      priority: "medium",
      type: "airport_monitoring",
      title: "Manter atenção ao fluxo aeroportuário",
      reasoning:
        "Os sinais aeroportuários podem afetar check-in, segurança ou deslocação interna.",
    });
  }

  if (allRelevant.some((signal) => signal.affects.includes("bag_drop"))) {
    recommendations.push({
      priority: "medium",
      type: "bag_drop_margin",
      title: "Preservar margem para bag drop",
      reasoning:
        "Bagagem de porão adiciona variabilidade antes da segurança.",
    });
  }

  return recommendations;
}

export function runSignalPriorityEngine({ signals = [] } = {}) {
  const inputSignals = Array.isArray(signals) ? signals : [];
  const normalizedSignals = inputSignals.map(normalizeSignal);
  const contradictions = detectContradictions(normalizedSignals);

  const {
    dominantRiskSignals,
    supportingRiskSignals,
    lowImpactRiskSignals,
    confidenceSupportSignals,
    ignoredSignals,
    positiveSignals,
  } = classifySignals(normalizedSignals);

  const summary = buildSummary({
    dominantRiskSignals,
    supportingRiskSignals,
    confidenceSupportSignals,
  });

  return {
    success: true,
    engine: "Home2Flight Signal Priority Engine",
    version: "1.1.1-clean-risk-vs-confidence",
    generatedAt: new Date().toISOString(),

    summary,

    dominantRiskSignals,
    supportingRiskSignals,
    lowImpactRiskSignals,
    confidenceSupportSignals,
    positiveSignals,
    ignoredSignals,
    contradictions,

    dominantSignals: dominantRiskSignals,
    supportingSignals: supportingRiskSignals,

    recommendations: buildRecommendations(
      dominantRiskSignals,
      supportingRiskSignals
    ),

    metadata: {
      inputSignalCount: inputSignals.length,
      dominantSignalCount: dominantRiskSignals.length,
      supportingSignalCount: supportingRiskSignals.length,
      lowImpactSignalCount: lowImpactRiskSignals.length,
      confidenceSupportSignalCount: confidenceSupportSignals.length,
      positiveSignalCount: positiveSignals.length,
      ignoredSignalCount: ignoredSignals.length,
      contradictionCount: contradictions.length,
    },

    limitations: [
      "Versão limpa com separação entre risco e suporte de confiança.",
      "Ainda sem aprendizagem histórica baseada em previsão vs realidade.",
      "Ainda sem personalização por aeroporto, companhia e utilizador.",
    ],
  };
}

export default async function handler(req, res) {
  try {
    const result = runSignalPriorityEngine({
      signals: req.body?.signals || [],
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      engine: "Home2Flight Signal Priority Engine",
      error: error.message,
    });
  }
}