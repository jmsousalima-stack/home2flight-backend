async function fetchJson(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

function buildBaseUrl(req) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;

  return `${protocol}://${host}`;
}

export default async function handler(req, res) {
  const flight = String(req.query.flight || "AF1195").toUpperCase();
  const airport = String(req.query.airport || "LIS").toUpperCase();
  const mode = String(req.query.mode || "car").toLowerCase();

  const BASE_URL = buildBaseUrl(req);

  const flightStatusUrl =
    `${BASE_URL}/api/engines/flight-status-engine` +
    `?flight=${encodeURIComponent(flight)}`;

  const liveEngineUrl =
    `${BASE_URL}/api/home2flight-live-engine` +
    `?flight=${encodeURIComponent(flight)}` +
    `&origin=${encodeURIComponent("Lisboa")}` +
    `&airport=${encodeURIComponent(airport)}` +
    `&mode=${encodeURIComponent(mode)}`;

  const [flightEngine, liveEngine] = await Promise.all([
    fetchJson(flightStatusUrl),
    fetchJson(liveEngineUrl),
  ]);

  const sources = buildSources({
    flightEngine,
    liveEngine,
    airport,
    mode,
  });

  const sourceWeights = calculateSourceWeights(sources);
  const overallSourceConfidence = calculateOverallConfidence({
    sources,
    sourceWeights,
  });

  const conflicts = detectConflicts({
    flightEngine,
    liveEngine,
    sources,
  });

  const recommendations = buildRecommendations({
    sources,
    conflicts,
    overallSourceConfidence,
  });

  const arbitration = buildArbitration({
    sources,
    conflicts,
    overallSourceConfidence,
  });

  return res.status(200).json({
    success: true,
    generatedAt: new Date().toISOString(),
    engine: "Home2Flight Source Arbitration Engine",
    version: "0.2.0",
    request: {
      flight,
      airport,
      mode,
    },
    arbitration,
    sourceWeights,
    sources,
    conflicts,
    recommendations,
    diagnostics: {
      baseUrl: BASE_URL,
      liveSources: sources.filter((source) => source.freshness === "live").length,
      estimatedSources: sources.filter(
        (source) => source.freshness === "static-profile"
      ).length,
      inactiveSources: sources.filter((source) => source.status === "inactive")
        .length,
      degradedSources: sources.filter((source) => source.status === "degraded")
        .length,
      criticalMissingSources: buildCriticalMissingSources(sources),
      flightEngineConnected: Boolean(flightEngine?.success),
      liveEngineConnected: Boolean(liveEngine?.success),
      conflictCount: conflicts.length,
    },
  });
}

function buildSources({ flightEngine, liveEngine, airport, mode }) {
  const liveFlightConnected = Boolean(flightEngine?.success);
  const flightScore = flightEngine?.reliability?.confidenceScore || 25;
  const flightTrust = flightEngine?.reliability?.trustLevel || "low";

  const decision = liveEngine?.decision || {};
  const timeline = liveEngine?.timeline || [];

  const airportStep = timeline.find((item) => item.category === "Airport");
  const routeStep = timeline.find((item) => item.category === "Transport");
  const weatherFlag = timeline
    .flatMap((item) => item.intelligenceFlags || [])
    .find((flag) => flag.type === "weather");

  return [
    {
      id: "flight_status_engine",
      label: "Live flight status engine",
      category: "flight",
      status: liveFlightConnected ? "active" : "degraded",
      trustLevel: flightTrust,
      confidenceScore: flightScore,
      freshness: liveFlightConnected ? "live" : "unavailable",
      role: "primary operational source",
      sourceType: liveFlightConnected
        ? "aviationstack_live"
        : "safe_fallback",
      extractedSignals: {
        flightStatus: flightEngine?.flight?.status || "unknown",
        departureDelay:
          typeof flightEngine?.flight?.departure?.delayMinutes === "number"
            ? flightEngine.flight.departure.delayMinutes
            : null,
        arrivalDelay:
          typeof flightEngine?.flight?.arrival?.delayMinutes === "number"
            ? flightEngine.flight.arrival.delayMinutes
            : null,
        terminal: flightEngine?.flight?.departure?.terminal || null,
        gate: flightEngine?.flight?.departure?.gate || null,
      },
      limitations:
        flightEngine?.reliability?.limitations || [
          "Dados live de voo indisponíveis.",
        ],
    },
    {
      id: "airport_operational_profile",
      label: `Home2Flight airport operational profile — ${airport}`,
      category: "airport",
      status: airportStep ? "estimated" : "degraded",
      trustLevel: airportStep?.trustLevel || "medium",
      confidenceScore: airportStep?.confidenceScore || 60,
      freshness: "static-profile",
      role: "conservative airport risk layer",
      sourceType: "internal_airport_profile",
      extractedSignals: {
        status: airportStep?.status || "unknown",
        recalculationStatus: airportStep?.recalculationStatus || "unknown",
        buffer: airportStep?.buffer || null,
        signals: airportStep?.intelligenceFlags || [],
      },
      limitations: [
        "Ainda sem tempos oficiais de segurança em tempo real.",
        "Ainda sem dados específicos por terminal e companhia aérea.",
        "Ainda sem leitura automática de congestionamento aeroportuário.",
      ],
    },
    {
      id: "route_operational_profile",
      label: `Home2Flight route operational profile — ${mode}`,
      category: "route",
      status: routeStep ? "estimated" : "degraded",
      trustLevel: routeStep?.trustLevel || "medium",
      confidenceScore: routeStep?.confidenceScore || 60,
      freshness: "static-profile",
      role: "conservative route buffer layer",
      sourceType: "internal_route_profile",
      extractedSignals: {
        status: routeStep?.status || "unknown",
        recalculationStatus: routeStep?.recalculationStatus || "unknown",
        buffer: routeStep?.buffer || null,
        signals: routeStep?.intelligenceFlags || [],
      },
      limitations: [
        "Ainda sem Google Maps, Apple Maps ou Waze em tempo real.",
        "Ainda sem incidentes urbanos automáticos.",
        "Ainda sem estimativa live de TVDE/transporte público.",
      ],
    },
    {
      id: "weather_operational_profile",
      label: "Home2Flight weather operational profile",
      category: "weather",
      status: weatherFlag ? "estimated" : "degraded",
      trustLevel: "medium",
      confidenceScore: weatherFlag?.severity === "medium" ? 70 : 84,
      freshness: "static-profile",
      role: "risk modifier",
      sourceType: "internal_weather_profile",
      extractedSignals: {
        weatherSignal: weatherFlag?.label || "Meteorologia estável",
        severity: weatherFlag?.severity || "low",
      },
      limitations: [
        "Ainda sem meteorologia live.",
        "Ainda sem radar operacional aeroportuário.",
        "Ainda sem impacto meteorológico real por rota/aeroporto.",
      ],
    },
    {
      id: "decision_engine",
      label: "Home2Flight weighted decision engine",
      category: "decision",
      status: liveEngine?.success ? "active" : "degraded",
      trustLevel: decision?.trustLevel || "medium",
      confidenceScore: decision?.globalConfidenceScore || 50,
      freshness: "computed",
      role: "decision synthesis",
      sourceType: "weighted_operational_model",
      extractedSignals: {
        recommendedDeparture: decision?.recommendedDepartureLocal || null,
        operationalRisk: decision?.operationalRisk || "unknown",
        dynamicBufferMinutes: decision?.dynamicBufferMinutes || null,
        reliabilityScore: decision?.globalReliabilityScore || null,
      },
      limitations: [
        "Modelo ainda heurístico.",
        "Pesos ainda definidos manualmente.",
        "Ainda sem aprendizagem histórica por aeroporto/utilizador.",
      ],
    },
    {
      id: "community_layer",
      label: "Community operational reports",
      category: "community",
      status: "inactive",
      trustLevel: "low",
      confidenceScore: 0,
      freshness: "unavailable",
      role: "future validation layer",
      sourceType: "community_future_layer",
      extractedSignals: {},
      limitations: [
        "Ainda sem reports de utilizadores.",
        "Ainda sem validação cruzada comunitária.",
      ],
    },
  ];
}

function calculateSourceWeights(sources) {
  const baseWeights = {
    flight_status_engine: 0.36,
    airport_operational_profile: 0.22,
    route_operational_profile: 0.2,
    weather_operational_profile: 0.08,
    decision_engine: 0.12,
    community_layer: 0.02,
  };

  const adjusted = {};

  sources.forEach((source) => {
    let weight = baseWeights[source.id] || 0.05;

    if (source.status === "inactive") weight *= 0.1;
    if (source.status === "degraded") weight *= 0.45;
    if (source.freshness === "live") weight *= 1.25;
    if (source.trustLevel === "high") weight *= 1.1;
    if (source.trustLevel === "low") weight *= 0.65;

    adjusted[source.id] = weight;
  });

  const total = Object.values(adjusted).reduce((sum, value) => sum + value, 0);

  const normalized = {};

  Object.entries(adjusted).forEach(([key, value]) => {
    normalized[key] = Number((value / total).toFixed(3));
  });

  return normalized;
}

function calculateOverallConfidence({ sources, sourceWeights }) {
  const score = sources.reduce((sum, source) => {
    const weight = sourceWeights[source.id] || 0;
    return sum + source.confidenceScore * weight;
  }, 0);

  return Math.round(Math.max(0, Math.min(95, score)));
}

function detectConflicts({ flightEngine, liveEngine, sources }) {
  const conflicts = [];

  const flightSource = sources.find((source) => source.id === "flight_status_engine");
  const decisionSource = sources.find((source) => source.id === "decision_engine");

  const flightRisk =
    flightEngine?.intelligenceSummary?.flightRisk ||
    flightEngine?.intelligenceSummary?.delayRisk ||
    "unknown";

  const decisionRisk =
    liveEngine?.decision?.operationalRisk ||
    decisionSource?.extractedSignals?.operationalRisk ||
    "unknown";

  if (flightRisk === "low" && decisionRisk === "medium") {
    conflicts.push({
      type: "risk_mismatch",
      severity: "medium",
      label: "Flight stable but global risk elevated",
      explanation:
        "O voo está estável, mas a recomendação global continua com risco moderado devido a rota/aeroporto.",
      resolution: "keep_conservative_ground_buffer",
    });
  }

  if (flightRisk === "high" && decisionRisk !== "high") {
    conflicts.push({
      type: "flight_risk_underweighted",
      severity: "high",
      label: "Flight risk higher than global decision",
      explanation:
        "O risco do voo está acima do risco global calculado. O motor deve aumentar o peso do voo.",
      resolution: "increase_flight_weight",
    });
  }

  if (!flightSource || flightSource.status !== "active") {
    conflicts.push({
      type: "primary_source_unavailable",
      severity: "high",
      label: "Primary flight source degraded",
      explanation:
        "A fonte primária de voo não está ativa. A recomendação deve ser conservadora.",
      resolution: "fallback_to_safe_buffer",
    });
  }

  return conflicts;
}

function buildArbitration({ sources, conflicts, overallSourceConfidence }) {
  const hasHighConflict = conflicts.some((conflict) => conflict.severity === "high");

  const liveFlight = sources.find((source) => source.id === "flight_status_engine");
  const route = sources.find((source) => source.id === "route_operational_profile");
  const airport = sources.find((source) => source.id === "airport_operational_profile");

  let operationalDecision = "use_weighted_operational_decision";
  let trustLevel = getTrustLevel(overallSourceConfidence);

  if (hasHighConflict) {
    operationalDecision = "use_safe_conservative_fallback";
    trustLevel = "low";
  } else if (
    liveFlight?.freshness === "live" &&
    route?.freshness === "static-profile" &&
    airport?.freshness === "static-profile"
  ) {
    operationalDecision =
      "use_live_flight_plus_conservative_ground_buffers";
  }

  return {
    overallSourceConfidence,
    trustLevel,
    operationalDecision,
    summary: buildArbitrationSummary({
      operationalDecision,
      overallSourceConfidence,
      conflicts,
      sources,
    }),
  };
}

function buildRecommendations({ sources, conflicts, overallSourceConfidence }) {
  const recommendations = [];

  const flightSource = sources.find((source) => source.id === "flight_status_engine");
  const routeSource = sources.find((source) => source.id === "route_operational_profile");
  const airportSource = sources.find((source) => source.id === "airport_operational_profile");

  if (flightSource?.freshness === "live") {
    recommendations.push({
      priority: "high",
      action: "prioritize_live_flight_status",
      reason:
        "O estado do voo é atualmente a fonte mais fidedigna do sistema.",
    });
  }

  if (routeSource?.freshness === "static-profile") {
    recommendations.push({
      priority: "high",
      action: "add_live_route_provider",
      reason:
        "A próxima grande melhoria de fiabilidade virá da integração real de tráfego/rota.",
    });
  }

  if (airportSource?.freshness === "static-profile") {
    recommendations.push({
      priority: "high",
      action: "add_live_airport_intelligence",
      reason:
        "A fiabilidade aeroportuária ainda depende de perfil interno conservador.",
    });
  }

  if (conflicts.length > 0) {
    recommendations.push({
      priority: "medium",
      action: "resolve_source_conflicts",
      reason:
        "Existem conflitos entre fontes ou entre risco de voo e decisão global.",
    });
  }

  if (overallSourceConfidence < 70) {
    recommendations.push({
      priority: "medium",
      action: "increase_conservative_buffer",
      reason:
        "Confiança global abaixo do ideal. O motor deve manter margem operacional conservadora.",
    });
  }

  return recommendations;
}

function buildArbitrationSummary({
  operationalDecision,
  overallSourceConfidence,
  conflicts,
  sources,
}) {
  const liveCount = sources.filter((source) => source.freshness === "live").length;
  const estimatedCount = sources.filter(
    (source) => source.freshness === "static-profile"
  ).length;

  if (conflicts.some((conflict) => conflict.severity === "high")) {
    return `Confiança global ${overallSourceConfidence}%. Existe conflito crítico entre fontes. A Home2Flight deve usar fallback conservador até nova validação.`;
  }

  if (operationalDecision === "use_live_flight_plus_conservative_ground_buffers") {
    return `Confiança global ${overallSourceConfidence}%. Dados live de voo disponíveis, mas rota/aeroporto ainda dependem de perfis conservadores. Manter buffers dinâmicos.`;
  }

  return `Confiança global ${overallSourceConfidence}%. ${liveCount} fonte(s) live e ${estimatedCount} fonte(s) estimada(s) ativas. Decisão operacional ponderada disponível.`;
}

function buildCriticalMissingSources(sources) {
  const missing = [];

  const route = sources.find((source) => source.id === "route_operational_profile");
  const airport = sources.find((source) => source.id === "airport_operational_profile");
  const weather = sources.find((source) => source.id === "weather_operational_profile");
  const community = sources.find((source) => source.id === "community_layer");

  if (route?.freshness !== "live") missing.push("live_route_data");
  if (airport?.freshness !== "live") missing.push("live_airport_security_waits");
  if (airport?.freshness !== "live") missing.push("live_airport_disruptions");
  if (weather?.freshness !== "live") missing.push("live_weather_data");
  if (community?.status !== "active") missing.push("community_reports");

  return missing;
}

function getTrustLevel(score) {
  if (score >= 80) return "high";
  if (score >= 55) return "medium";
  return "low";
}