// /api/engines/operational-signal-aggregator.js

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalize(value, fallback = "") {
  return String(value || fallback).trim();
}

function normalizeTransport(value) {
  const transport = normalize(value, "public").toLowerCase();

  if (["public", "transit", "public_transport"].includes(transport)) {
    return "public";
  }

  if (["car", "driving", "taxi", "tvde", "uber"].includes(transport)) {
    return "car";
  }

  return transport;
}

function calculateSeverityScore(severity) {
  switch (severity) {
    case "critical":
      return 95;
    case "high":
      return 80;
    case "medium":
      return 55;
    case "low":
    default:
      return 25;
  }
}

function getRiskLevel(score) {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function getTrustLevel(score) {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function getSourceWeight(sourceType) {
  switch (sourceType) {
    case "official_airport_feed":
      return 1.0;
    case "official_transport_feed":
      return 0.95;
    case "aviationstack_live":
      return 0.86;
    case "google_maps_live_traffic":
      return 0.84;
    case "google_maps_route_estimate":
      return 0.7;
    case "community_verified":
      return 0.68;
    case "news_event_api":
      return 0.62;
    case "internal_airport_profile":
      return 0.48;
    case "internal_operational_profile":
      return 0.46;
    case "event_engine_placeholder":
      return 0.3;
    default:
      return 0.4;
  }
}

function getFreshnessWeight(freshness) {
  switch (freshness) {
    case "live":
      return 1.0;
    case "confirmed":
      return 0.92;
    case "recent":
      return 0.78;
    case "profile":
      return 0.48;
    case "fallback":
      return 0.32;
    default:
      return 0.42;
  }
}

function normalizeSignal(signal, fallbackSourceType = "unknown") {
  const severity = signal?.severity || "low";
  const confidenceScore = clamp(signal?.confidenceScore || 50, 0, 100);

  const sourceType =
    signal?.source?.type ||
    signal?.sourceType ||
    fallbackSourceType ||
    "unknown";

  const freshness =
    signal?.freshness ||
    signal?.dataFreshness ||
    (signal?.source?.live ? "live" : "profile");

  const sourceWeight = getSourceWeight(sourceType);
  const freshnessWeight = getFreshnessWeight(freshness);

  const evidenceScore = clamp(
    Math.round(confidenceScore * sourceWeight * freshnessWeight),
    0,
    100
  );

  return {
    id: signal?.id || signal?.type || `signal_${Date.now()}`,
    type: signal?.type || "operational_signal",
    title: signal?.title || signal?.label || "Sinal operacional",
    severity,
    severityScore: calculateSeverityScore(severity),
    confidenceScore,
    evidenceScore,
    trustLevel: getTrustLevel(evidenceScore),
    freshness,
    source: {
      type: sourceType,
      name: signal?.source?.name || signal?.source || sourceType,
      live: signal?.source?.live || freshness === "live",
    },
    operationalImpact: {
      affects:
        signal?.operationalImpact?.affects ||
        signal?.affects ||
        ["overall_reliability"],
      extraBufferMinutes:
        signal?.operationalImpact?.extraBufferMinutes || 0,
      riskImpact:
        signal?.operationalImpact?.riskImpact ||
        severity,
      recommendation:
        signal?.operationalImpact?.recommendation ||
        signal?.reasoning ||
        "Sinal considerado no cálculo operacional.",
    },
    reasoning:
      signal?.reasoning ||
      signal?.explanation ||
      "Sinal operacional normalizado pelo agregador.",
    limitations: signal?.limitations || [],
    raw: signal,
  };
}

function buildPlaceholderSignals({ airport, city, transport }) {
  const normalizedTransport = normalizeTransport(transport);

  const signals = [];

  if (normalizedTransport === "public") {
    signals.push({
      id: "public_transport_monitoring",
      type: "public_transport_monitoring",
      title: "Monitorização de transporte público",
      severity: "medium",
      source: {
        type: "internal_operational_profile",
        name: "Home2Flight Internal Mobility Profile",
        live: false,
      },
      confidenceScore: 58,
      freshness: "profile",
      operationalImpact: {
        affects: ["leave_home_time", "airport_access"],
        extraBufferMinutes: 10,
        riskImpact: "medium",
        recommendation:
          "Aumentar margem de saída devido a dependência de transporte público.",
      },
      reasoning:
        `${city} apresenta variabilidade operacional relevante em transporte público.`,
      limitations: [
        "Ainda sem integração live com operadores públicos.",
        "Ainda sem alertas oficiais em tempo real.",
      ],
    });
  }

  signals.push({
    id: "airport_operational_watch",
    type: "airport_operational_watch",
    title: "Monitorização operacional aeroportuária",
    severity: "medium",
    source: {
      type: "internal_airport_profile",
      name: "Home2Flight Airport Operational Layer",
      live: false,
    },
    confidenceScore: 62,
    freshness: "profile",
    operationalImpact: {
      affects: ["security", "bag_drop", "terminal_access"],
      extraBufferMinutes: 0,
      riskImpact: "medium",
      recommendation: "Manter monitorização operacional do aeroporto.",
    },
    reasoning:
      `${airport} pode sofrer variabilidade operacional mesmo sem incidente confirmado.`,
    limitations: [
      "Ainda sem integração com filas live.",
      "Ainda sem feeds operacionais aeroportuários.",
    ],
  });

  signals.push({
    id: "event_disruption_monitoring",
    type: "event_disruption_monitoring",
    title: "Monitorização de eventos e disrupções",
    severity: "low",
    source: {
      type: "event_engine_placeholder",
      name: "Home2Flight Event Layer",
      live: false,
    },
    confidenceScore: 45,
    freshness: "fallback",
    operationalImpact: {
      affects: ["route", "airport_access", "overall_reliability"],
      extraBufferMinutes: 0,
      riskImpact: "low",
      recommendation: "Continuar monitorização de eventos externos.",
    },
    reasoning:
      "Camada preparada para futuros sinais live de notícias, greves, eventos e incidentes.",
    limitations: ["Ainda sem fontes externas ligadas."],
  });

  return signals;
}

function detectConflicts(signals) {
  const conflicts = [];

  const hasLiveLowRiskRoute = signals.some(
    (signal) =>
      ["live_traffic", "route_estimate"].includes(signal.type) &&
      signal.severity === "low" &&
      signal.source.live
  );

  const hasTransportMonitoringRisk = signals.some(
    (signal) =>
      ["public_transport_monitoring", "public_transport_watch"].includes(
        signal.type
      ) && ["medium", "high", "critical"].includes(signal.severity)
  );

  if (hasLiveLowRiskRoute && hasTransportMonitoringRisk) {
    conflicts.push({
      type: "route_vs_transport_profile",
      severity: "low",
      title: "Rota atual estável, mas transporte público requer atenção",
      explanation:
        "A rota atual não mostra perturbação relevante, mas o perfil de transporte público recomenda monitorização adicional.",
      resolution: "keep_small_transport_buffer",
    });
  }

  const hasHighAirportSignal = signals.some(
    (signal) =>
      signal.operationalImpact.affects.some((affect) =>
        ["security", "airport_security", "terminal_access", "bag_drop"].includes(
          affect
        )
      ) && ["high", "critical"].includes(signal.severity)
  );

  const hasLowAirportProfile = signals.some(
    (signal) =>
      signal.type === "airport_operational_watch" && signal.severity === "low"
  );

  if (hasHighAirportSignal && hasLowAirportProfile) {
    conflicts.push({
      type: "airport_signal_conflict",
      severity: "medium",
      title: "Sinal aeroportuário forte contra perfil base baixo",
      explanation:
        "Foi detetado um sinal aeroportuário mais forte do que o perfil interno base.",
      resolution: "prioritize_live_or_high_confidence_signal",
    });
  }

  return conflicts;
}

function aggregateOperationalImpact(signals) {
  let extraBufferMinutes = 0;
  let weightedRiskScore = 0;
  let totalWeight = 0;
  let confidenceAccumulator = 0;

  for (const signal of signals) {
    const evidenceWeight = Math.max(0.15, signal.evidenceScore / 100);

    weightedRiskScore += signal.severityScore * evidenceWeight;
    totalWeight += evidenceWeight;

    confidenceAccumulator += signal.evidenceScore;

    extraBufferMinutes += signal.operationalImpact.extraBufferMinutes || 0;
  }

  const operationalRiskScore =
    totalWeight > 0
      ? clamp(Math.round(weightedRiskScore / totalWeight), 0, 100)
      : 25;

  const confidenceScore = clamp(
    Math.round(confidenceAccumulator / Math.max(1, signals.length)),
    0,
    100
  );

  return {
    operationalRiskScore,
    operationalRisk: getRiskLevel(operationalRiskScore),
    confidenceScore,
    trustLevel: getTrustLevel(confidenceScore),
    extraBufferMinutes,
    liveSignalCount: signals.filter((signal) => signal.source.live).length,
    highImpactSignalCount: signals.filter((signal) =>
      ["high", "critical"].includes(signal.severity)
    ).length,
  };
}

function buildRecommendations({ signals, aggregation, conflicts }) {
  const recommendations = [];

  if (aggregation.extraBufferMinutes >= 10) {
    recommendations.push({
      priority: "high",
      type: "increase_buffer",
      title: "Aumentar margem operacional antes da saída",
      reasoning:
        "Foram detetados sinais operacionais que justificam buffer adicional.",
    });
  }

  if (aggregation.operationalRisk === "high") {
    recommendations.push({
      priority: "critical",
      type: "high_operational_risk",
      title: "Rever plano antes de sair",
      reasoning:
        "O conjunto de sinais aponta para risco operacional elevado.",
    });
  }

  const hasAirportSignals = signals.some((signal) =>
    signal.operationalImpact.affects.some((affect) =>
      ["security", "airport_security", "bag_drop", "terminal_access"].includes(
        affect
      )
    )
  );

  if (hasAirportSignals) {
    recommendations.push({
      priority: "medium",
      type: "monitor_airport",
      title: "Monitorizar operação aeroportuária",
      reasoning:
        "Existem sinais relacionados com segurança, bag drop ou terminal.",
    });
  }

  if (conflicts.length > 0) {
    recommendations.push({
      priority: "medium",
      type: "watch_conflicts",
      title: "Manter decisão conservadora",
      reasoning:
        "Há sinais com leituras parcialmente diferentes. O motor mantém margem conservadora.",
    });
  }

  return recommendations;
}

export async function aggregateOperationalSignals({
  airport = "LIS",
  city = "Lisboa",
  transport = "public",
  externalSignals = [],
} = {}) {
  const placeholderSignals = buildPlaceholderSignals({
    airport,
    city,
    transport,
  });

  const normalizedSignals = [
    ...placeholderSignals.map((signal) =>
      normalizeSignal(signal, signal.source?.type)
    ),
    ...externalSignals.map((signal) => normalizeSignal(signal)),
  ];

  const conflicts = detectConflicts(normalizedSignals);
  const aggregation = aggregateOperationalImpact(normalizedSignals);
  const recommendations = buildRecommendations({
    signals: normalizedSignals,
    aggregation,
    conflicts,
  });

  return {
    success: true,
    engine: "Home2Flight Operational Signal Aggregator",
    version: "0.2.0-source-arbitration",
    generatedAt: new Date().toISOString(),

    request: {
      airport,
      city,
      transport: normalizeTransport(transport),
      externalSignalCount: externalSignals.length,
    },

    aggregation,

    signals: normalizedSignals,

    conflicts,

    recommendations,

    metadata: {
      liveDataActive: aggregation.liveSignalCount > 0,
      activeSources: aggregation.liveSignalCount,
      placeholderSources: placeholderSignals.length,
      normalizedSignals: normalizedSignals.length,
      futureSources: [
        "Google Traffic",
        "Airport operational feeds",
        "Transport operators",
        "Weather APIs",
        "News/Event APIs",
        "Community reports",
        "NOTAM feeds",
      ],
    },

    limitations: [
      "Agregador preparado para fontes live, mas ainda depende parcialmente de perfis internos.",
      "Os pesos de fonte ainda são heurísticos e serão calibrados com dados reais.",
      "Ainda sem persistência histórica e sem validação comunitária.",
    ],
  };
}

export default async function handler(req, res) {
  try {
    const {
      airport = "LIS",
      city = "Lisboa",
      transport = "public",
      mock = "false",
    } = req.query;

    const mockExternalSignals =
      String(mock).toLowerCase() === "true"
        ? [
            {
              id: "mock_live_traffic_signal",
              type: "live_traffic",
              title: "Trânsito live estável",
              severity: "low",
              source: {
                type: "google_maps_live_traffic",
                name: "Google Maps",
                live: true,
              },
              freshness: "live",
              confidenceScore: 89,
              operationalImpact: {
                affects: ["route", "airport_access"],
                extraBufferMinutes: 0,
                riskImpact: "low",
                recommendation: "Manter plano de rota atual.",
              },
              reasoning:
                "Sinal mockado para testar arbitragem com fonte live.",
            },
          ]
        : [];

    const result = await aggregateOperationalSignals({
      airport,
      city,
      transport,
      externalSignals: mockExternalSignals,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}