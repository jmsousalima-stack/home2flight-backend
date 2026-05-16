// /api/engines/operational-signal-aggregator.js

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

function buildPlaceholderSignals({
  airport,
  city,
  transport,
}) {
  const signals = [];

  if (transport === "public") {
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
      trustLevel: "medium",

      operationalImpact: {
        affects: [
          "leave_home_time",
          "airport_access",
        ],

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
    trustLevel: "medium",

    operationalImpact: {
      affects: [
        "security",
        "bag_drop",
        "terminal_access",
      ],

      extraBufferMinutes: 0,

      riskImpact: "medium",

      recommendation:
        "Manter monitorização operacional do aeroporto.",
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
    trustLevel: "low",

    operationalImpact: {
      affects: [
        "route",
        "airport_access",
        "overall_reliability",
      ],

      extraBufferMinutes: 0,

      riskImpact: "low",

      recommendation:
        "Continuar monitorização de eventos externos.",
    },

    reasoning:
      "Camada preparada para futuros sinais live de notícias, greves, eventos e incidentes.",

    limitations: [
      "Ainda sem fontes externas ligadas.",
    ],
  });

  return signals;
}

function aggregateOperationalImpact(signals) {
  let extraBufferMinutes = 0;

  let weightedScore = 0;

  let totalWeight = 0;

  for (const signal of signals) {
    const severityScore =
      calculateSeverityScore(signal.severity);

    const confidence =
      signal.confidenceScore || 50;

    const weight =
      confidence / 100;

    weightedScore += severityScore * weight;

    totalWeight += weight;

    extraBufferMinutes +=
      signal.operationalImpact
        ?.extraBufferMinutes || 0;
  }

  const finalScore =
    totalWeight > 0
      ? Math.round(weightedScore / totalWeight)
      : 25;

  return {
    operationalRiskScore:
      clamp(finalScore, 0, 100),

    operationalRisk:
      getRiskLevel(finalScore),

    extraBufferMinutes,

    trustLevel:
      getTrustLevel(finalScore),
  };
}

function buildRecommendations({
  signals,
  aggregation,
}) {
  const recommendations = [];

  if (
    aggregation.extraBufferMinutes >= 10
  ) {
    recommendations.push({
      priority: "high",

      type: "increase_buffer",

      title:
        "Aumentar margem operacional antes da saída",

      reasoning:
        "Foram detetados sinais operacionais que justificam buffer adicional.",
    });
  }

  const hasPublicTransportSignal =
    signals.some(
      (signal) =>
        signal.type ===
        "public_transport_monitoring"
    );

  if (hasPublicTransportSignal) {
    recommendations.push({
      priority: "medium",

      type: "monitor_transport",

      title:
        "Monitorizar transportes públicos antes da saída",

      reasoning:
        "A dependência de transporte público aumenta a variabilidade operacional.",
    });
  }

  return recommendations;
}

export default async function handler(
  req,
  res
) {
  try {
    const {
      airport = "LIS",
      city = "Lisboa",
      transport = "public",
    } = req.query;

    const signals =
      buildPlaceholderSignals({
        airport,
        city,
        transport,
      });

    const aggregation =
      aggregateOperationalImpact(
        signals
      );

    const recommendations =
      buildRecommendations({
        signals,
        aggregation,
      });

    return res.status(200).json({
      success: true,

      engine:
        "Home2Flight Operational Signal Aggregator",

      version:
        "0.1.0-operational-foundation",

      generatedAt:
        new Date().toISOString(),

      request: {
        airport,
        city,
        transport,
      },

      aggregation,

      signals,

      recommendations,

      metadata: {
        liveDataActive: false,

        activeSources: 0,

        placeholderSources: 3,

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
        "Primeira fundação sem fontes live.",
        "Engine preparada para arbitragem multi-fonte.",
        "Ainda sem feeds externos ativos.",
      ],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,

      error: error.message,
    });
  }
}