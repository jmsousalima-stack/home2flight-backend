// /lib/engines/reliability-arbitration-engine.js

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function parseNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function severityToScore(severity) {
  switch (String(severity || "").toLowerCase()) {
    case "critical":
      return 95;
    case "high":
      return 78;
    case "medium":
      return 52;
    case "low":
      return 24;
    case "none":
      return 0;
    default:
      return 35;
  }
}

function sourceWeight(sourceType) {
  switch (sourceType) {
    case "official_airline":
    case "official_airport":
    case "official_transport":
      return 1.0;
    case "aviationstack_live":
    case "google_maps_route_estimate":
    case "google_maps_live_traffic":
    case "weather_live":
      return 0.82;
    case "validated_community":
      return 0.68;
    case "internal_airport_profile":
    case "structured_internal_operational_model":
    case "airport_profile":
    case "city_transport_profile":
    case "internal_event_disruption_profile":
    case "internal_city_risk_profile":
    case "internal_airport_event_profile":
      return 0.46;
    case "manual_fallback_time":
    case "safe_fallback":
    case "fallback_route_profile":
      return 0.34;
    case "community_unverified":
      return 0.24;
    default:
      return 0.4;
  }
}

function freshnessWeight(freshness) {
  switch (freshness) {
    case "live":
      return 1.0;
    case "recent":
      return 0.82;
    case "cached":
      return 0.58;
    case "profile":
      return 0.42;
    case "fallback":
    case "fallback-profile":
      return 0.28;
    default:
      return 0.45;
  }
}

function normalizeSignal(signal) {
  const severityScore =
    signal.severityScore ?? severityToScore(signal.severity);

  const confidenceScore =
    signal.confidenceScore ?? signal.confidence ?? 50;

  const sourceType =
    signal.sourceType || signal?.source?.type || "unknown";

  const freshness =
    signal.freshness ||
    signal.dataFreshness ||
    (signal?.source?.live ? "live" : "profile");

  const weight =
    sourceWeight(sourceType) *
    freshnessWeight(freshness) *
    (parseNumber(confidenceScore, 50) / 100);

  return {
    id:
      signal.id ||
      signal.type ||
      `signal_${Math.random().toString(36).slice(2)}`,

    type: signal.type || "operational_signal",
    title: signal.title || signal.label || "Operational signal",
    severity: signal.severity || "medium",
    severityScore: clamp(parseNumber(severityScore, 35)),
    confidenceScore: clamp(parseNumber(confidenceScore, 50)),
    sourceType,
    freshness,
    sourceName: signal.sourceName || signal?.source?.name || sourceType,
    affects: signal.affects || signal?.operationalImpact?.affects || [],

    extraBufferMinutes: parseNumber(
      signal.extraBufferMinutes ??
        signal?.operationalImpact?.extraBufferMinutes,
      0
    ),

    reasoning:
      signal.reasoning ||
      signal.explanation ||
      "Sinal operacional considerado no cálculo.",

    limitations: signal.limitations || [],
    weight: clamp(weight * 100),
    raw: signal,
  };
}

function detectConflicts(signals) {
  const conflicts = [];

  const routeLow = signals.some(
    (signal) =>
      signal.affects.includes("route") && signal.severityScore <= 30
  );

  const transportMediumOrHigh = signals.some(
    (signal) =>
      signal.affects.includes("public_transport") &&
      signal.severityScore >= 50
  );

  if (routeLow && transportMediumOrHigh) {
    conflicts.push({
      type: "route_vs_transport",
      severity: "medium",
      title: "Rota estável, mas transporte exige atenção",
      explanation:
        "A rota direta parece estável, mas há sinais de variabilidade no transporte público.",
      resolution:
        "Manter buffer de transporte até existir confirmação live mais forte.",
    });
  }

  const liveLowRisk = signals.some(
    (signal) => signal.freshness === "live" && signal.severityScore <= 30
  );

  const profileMediumRisk = signals.some(
    (signal) =>
      signal.freshness === "profile" && signal.severityScore >= 50
  );

  if (liveLowRisk && profileMediumRisk) {
    conflicts.push({
      type: "live_vs_profile",
      severity: "low",
      title: "Fonte live estável vs. perfil conservador",
      explanation:
        "Uma fonte live sugere estabilidade, mas o perfil operacional mantém cautela.",
      resolution:
        "Reduzir risco agregado, mas preservar pequena margem operacional.",
    });
  }

  return conflicts;
}

function calculateAggregate(signals) {
  if (!signals.length) {
    return {
      operationalRiskScore: 42,
      operationalRisk: "medium",
      confidenceScore: 25,
      trustLevel: "low",
      extraBufferMinutes: 10,
      liveSignalCount: 0,
      highImpactSignalCount: 0,
    };
  }

  let weightedRisk = 0;
  let totalWeight = 0;
  let weightedConfidence = 0;
  let totalBuffer = 0;

  for (const signal of signals) {
    const weight = Math.max(signal.weight, 8);

    weightedRisk += signal.severityScore * weight;
    weightedConfidence += signal.confidenceScore * weight;
    totalWeight += weight;
    totalBuffer += signal.extraBufferMinutes;
  }

  const operationalRiskScore = clamp(weightedRisk / totalWeight);
  const confidenceScore = clamp(weightedConfidence / totalWeight);

  const liveSignalCount = signals.filter(
    (signal) => signal.freshness === "live"
  ).length;

  const highImpactSignalCount = signals.filter(
    (signal) => signal.severityScore >= 70
  ).length;

  let operationalRisk = "low";

  if (operationalRiskScore >= 68) operationalRisk = "high";
  else if (operationalRiskScore >= 40) operationalRisk = "medium";

  let trustLevel = "low";

  if (confidenceScore >= 75 && liveSignalCount > 0) trustLevel = "high";
  else if (confidenceScore >= 50) trustLevel = "medium";

  const bufferFromRisk =
    operationalRisk === "high" ? 20 : operationalRisk === "medium" ? 10 : 0;

  return {
    operationalRiskScore: Math.round(operationalRiskScore),
    operationalRisk,
    confidenceScore: Math.round(confidenceScore),
    trustLevel,
    extraBufferMinutes: Math.max(totalBuffer, bufferFromRisk),
    liveSignalCount,
    highImpactSignalCount,
  };
}

function buildRecommendations(aggregate, conflicts) {
  const recommendations = [];

  if (aggregate.operationalRisk === "high") {
    recommendations.push({
      priority: "critical",
      type: "increase_buffer",
      title: "Aumentar margem operacional",
      reasoning:
        "O risco agregado indica necessidade de margem adicional antes da saída.",
    });
  }

  if (aggregate.operationalRisk === "medium") {
    recommendations.push({
      priority: "high",
      type: "keep_conservative_plan",
      title: "Manter plano com margem reforçada",
      reasoning:
        "Foram detetados sinais que justificam uma estratégia conservadora.",
    });
  }

  if (aggregate.liveSignalCount === 0) {
    recommendations.push({
      priority: "medium",
      type: "low_live_confidence",
      title: "Validar informação antes da saída",
      reasoning:
        "Ainda não existem fontes live suficientes para elevar a confiança operacional.",
    });
  }

  if (conflicts.length > 0) {
    recommendations.push({
      priority: "medium",
      type: "watch_conflicts",
      title: "Monitorizar sinais contraditórios",
      reasoning:
        "Existem leituras parcialmente diferentes entre fontes. O motor mantém decisão prudente.",
    });
  }

  return recommendations;
}

function buildExplanation(aggregate, signals, conflicts) {
  const strongestSignals = [...signals]
    .sort((a, b) => b.severityScore * b.weight - a.severityScore * a.weight)
    .slice(0, 3);

  return {
    summary:
      aggregate.operationalRisk === "high"
        ? "A Home2Flight identificou risco operacional elevado e recomenda margem adicional."
        : aggregate.operationalRisk === "medium"
        ? "A Home2Flight recomenda uma estratégia prudente com margem reforçada."
        : "A Home2Flight identifica condições operacionais estáveis neste momento.",

    strongestFactors: strongestSignals.map((signal) => ({
      title: signal.title,
      severity: signal.severity,
      source: signal.sourceName,
      reasoning: signal.reasoning,
    })),

    conflictCount: conflicts.length,
  };
}

export function runReliabilityArbitration({ signals = [] } = {}) {
  const rawSignals = Array.isArray(signals) ? signals : [];

  const normalizedSignals = rawSignals.map(normalizeSignal);
  const conflicts = detectConflicts(normalizedSignals);
  const aggregation = calculateAggregate(normalizedSignals);
  const recommendations = buildRecommendations(aggregation, conflicts);
  const explanation = buildExplanation(
    aggregation,
    normalizedSignals,
    conflicts
  );

  return {
    success: true,
    engine: "Home2Flight Reliability Arbitration Engine",
    version: "1.0.1-lib-exportable",
    generatedAt: new Date().toISOString(),

    aggregation,
    signals: normalizedSignals,
    conflicts,
    recommendations,
    explanation,

    metadata: {
      inputSignalCount: rawSignals.length,
      normalizedSignalCount: normalizedSignals.length,
      liveSignalCount: aggregation.liveSignalCount,
      highImpactSignalCount: aggregation.highImpactSignalCount,
    },

    limitations: [
      "Motor migrado para /lib/engines.",
      "Ainda sem calibração histórica real.",
      "Ainda sem aprendizagem baseada em previsão vs realidade.",
    ],
  };
}

export default runReliabilityArbitration;