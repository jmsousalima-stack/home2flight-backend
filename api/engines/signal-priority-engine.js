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
      return 24;
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

function operationalDomainWeight(signal) {
  const affects = signal.affects || [];

  if (
    affects.includes("flight") ||
    affects.includes("departure_time")
  ) {
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

  const score =
    severityScore(signal.severity) * 0.32 +
    sourceStrength(signal.sourceType) * 0.24 +
    freshnessScore(signal.freshness) * 0.18 +
    confidence * 0.18 +
    clamp(buffer * 3, 0, 100) * 0.08;

  const priorityScore = Math.round(
    clamp(score * operationalDomainWeight(signal), 0, 100)
  );

  let priority = "low";

  if (priorityScore >= 78) {
    priority = "critical";
  } else if (priorityScore >= 62) {
    priority = "high";
  } else if (priorityScore >= 42) {
    priority = "medium";
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
    raw: signal,
  };
}

function detectContradictions(signals) {
  const contradictions = [];

  const liveRouteStable = signals.find(
    (signal) =>
      signal.freshness === "live" &&
      signal.affects.includes("route") &&
      signal.severity === "low"
  );

  const profileRouteMedium = signals.find(
    (signal) =>
      signal.freshness === "profile" &&
      signal.affects.includes("route") &&
      ["medium", "high"].includes(signal.severity)
  );

  if (liveRouteStable && profileRouteMedium) {
    contradictions.push({
      type: "live_route_vs_profile_route",
      severity: "low",
      title: "Rota live estável vs. perfil conservador",
      dominantSignalId: liveRouteStable.id,
      weakerSignalId: profileRouteMedium.id,
      resolution:
        "A fonte live domina a leitura da rota, mas o perfil conservador mantém pequena margem.",
    });
  }

  const flightFallback = signals.find(
    (signal) => signal.id === "flight_manual_fallback"
  );

  const routeLive = signals.find(
    (signal) =>
      signal.freshness === "live" &&
      signal.affects.includes("route")
  );

  if (flightFallback && routeLive) {
    contradictions.push({
      type: "manual_flight_vs_live_route",
      severity: "medium",
      title: "Voo em fallback manual, mas rota live disponível",
      dominantSignalId: flightFallback.id,
      weakerSignalId: routeLive.id,
      resolution:
        "A timeline usa rota live, mas mantém confiança limitada por falta de dados reais do voo.",
    });
  }

  return contradictions;
}

function classifySignals(signals) {
  const sorted = [...signals].sort(
    (a, b) => b.priorityScore - a.priorityScore
  );

  const dominantSignals = sorted.filter(
    (signal) => signal.priority === "critical" || signal.priority === "high"
  );

  const supportingSignals = sorted.filter(
    (signal) => signal.priority === "medium"
  );

  const lowImpactSignals = sorted.filter(
    (signal) => signal.priority === "low"
  );

  const ignoredSignals = lowImpactSignals.filter(
    (signal) =>
      signal.extraBufferMinutes === 0 &&
      signal.confidenceScore < 60
  );

  return {
    dominantSignals,
    supportingSignals,
    lowImpactSignals,
    ignoredSignals,
  };
}

function buildSummary({ dominantSignals, supportingSignals }) {
  if (dominantSignals.length > 0) {
    return {
      headline: "Existem sinais dominantes na decisão operacional.",
      explanation:
        "A Home2Flight identificou fatores com impacto superior e usou-os como principais justificações da timeline.",
    };
  }

  if (supportingSignals.length > 0) {
    return {
      headline: "A decisão é suportada por vários sinais moderados.",
      explanation:
        "Não existe um único fator dominante, mas vários sinais justificam uma postura prudente.",
    };
  }

  return {
    headline: "Sem sinais operacionais fortes.",
    explanation:
      "A Home2Flight mantém apenas buffers base e monitorização operacional.",
  };
}

function buildRecommendations(dominantSignals, supportingSignals) {
  const recommendations = [];

  const allRelevant = [...dominantSignals, ...supportingSignals];

  if (
    allRelevant.some((signal) =>
      signal.affects.includes("flight")
    )
  ) {
    recommendations.push({
      priority: "high",
      type: "flight_validation",
      title: "Validar dados do voo",
      reasoning:
        "A informação do voo influencia diretamente a âncora temporal da jornada.",
    });
  }

  if (
    allRelevant.some((signal) =>
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
    allRelevant.some((signal) =>
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

  if (
    allRelevant.some((signal) =>
      signal.affects.includes("bag_drop")
    )
  ) {
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

export default async function handler(req, res) {
  try {
    const inputSignals = Array.isArray(req.body?.signals)
      ? req.body.signals
      : [];

    const normalizedSignals = inputSignals.map(normalizeSignal);
    const contradictions = detectContradictions(normalizedSignals);

    const {
      dominantSignals,
      supportingSignals,
      lowImpactSignals,
      ignoredSignals,
    } = classifySignals(normalizedSignals);

    const summary = buildSummary({
      dominantSignals,
      supportingSignals,
    });

    return res.status(200).json({
      success: true,
      engine: "Home2Flight Signal Priority Engine",
      version: "1.0.0-foundation",
      generatedAt: new Date().toISOString(),

      summary,

      dominantSignals,
      supportingSignals,
      lowImpactSignals,
      ignoredSignals,
      contradictions,

      recommendations: buildRecommendations(
        dominantSignals,
        supportingSignals
      ),

      metadata: {
        inputSignalCount: inputSignals.length,
        dominantSignalCount: dominantSignals.length,
        supportingSignalCount: supportingSignals.length,
        lowImpactSignalCount: lowImpactSignals.length,
        ignoredSignalCount: ignoredSignals.length,
        contradictionCount: contradictions.length,
      },

      limitations: [
        "Primeira versão heurística de priorização de sinais.",
        "Ainda sem aprendizagem histórica baseada em previsão vs realidade.",
        "Ainda sem personalização por aeroporto, companhia e utilizador.",
      ],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      engine: "Home2Flight Signal Priority Engine",
      error: error.message,
    });
  }
}