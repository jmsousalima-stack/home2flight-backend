// /api/engines/operational-behavior-engine.js

function normalizeText(value, fallback = "") {
  return String(value || fallback).trim();
}

function normalizeLevel(value, fallback = "low") {
  const level = normalizeText(value, fallback).toLowerCase();

  if (["critical", "high", "medium", "low"].includes(level)) {
    return level;
  }

  return fallback;
}

function getSeverityScore(severity) {
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

function getBehaviorTone(severity) {
  switch (severity) {
    case "critical":
      return "critical";
    case "high":
      return "warning";
    case "medium":
      return "attention";
    case "low":
    default:
      return "stable";
  }
}

function getBehaviorConfidence(score) {
  if (score >= 80) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function getMainSignal(signals, matcher) {
  const matched = signals.filter(matcher);

  if (matched.length === 0) return null;

  return matched.sort((a, b) => {
    const severityDiff =
      getSeverityScore(b.severity) - getSeverityScore(a.severity);

    if (severityDiff !== 0) return severityDiff;

    return (b.confidenceScore || 0) - (a.confidenceScore || 0);
  })[0];
}

function getSignalsForAffect(signals, affects) {
  return signals.filter((signal) => {
    const signalAffects =
      signal?.operationalImpact?.affects || signal?.affects || [];

    return signalAffects.some((affect) => affects.includes(affect));
  });
}

function averageConfidence(signals, fallback = 50) {
  if (!signals || signals.length === 0) return fallback;

  const total = signals.reduce(
    (sum, signal) => sum + (signal.confidenceScore || fallback),
    0
  );

  return Math.round(total / signals.length);
}

function buildAirportBehavior({ signals = [], airport = "LIS" }) {
  const airportSignals = getSignalsForAffect(signals, [
    "security",
    "airport_security",
    "bag_drop",
    "terminal_access",
    "gate_timing",
    "airport_access",
  ]);

  const mainSignal =
    getMainSignal(airportSignals, () => true) ||
    getMainSignal(signals, (signal) =>
      ["airport_operational_watch", "airport_event_watch"].includes(signal.type)
    );

  if (!mainSignal) {
    return {
      domain: "airport",
      state: "stable",
      label: "Aeroporto operacionalmente estável",
      shortLabel: "Estável",
      severity: "low",
      tone: "stable",
      confidenceScore: 50,
      confidenceLevel: "low",
      sourceType: "behavior_fallback",
      explanation:
        "Sem sinais aeroportuários relevantes. Mantida leitura operacional base.",
      affects: ["airport"],
    };
  }

  const severity = normalizeLevel(mainSignal.severity);

  if (severity === "critical") {
    return {
      domain: "airport",
      state: "critical_disruption",
      label: "Disrupção crítica no aeroporto",
      shortLabel: "Crítico",
      severity,
      tone: getBehaviorTone(severity),
      confidenceScore: mainSignal.confidenceScore || 60,
      confidenceLevel: getBehaviorConfidence(mainSignal.confidenceScore || 60),
      sourceType: mainSignal.source?.type || mainSignal.sourceType || "unknown",
      explanation:
        mainSignal.reasoning ||
        `${airport} apresenta sinais críticos de disrupção operacional.`,
      affects: ["airport", "security", "terminal"],
    };
  }

  if (severity === "high") {
    return {
      domain: "airport",
      state: "high_operational_pressure",
      label: "Pressão operacional elevada no aeroporto",
      shortLabel: "Pressão elevada",
      severity,
      tone: getBehaviorTone(severity),
      confidenceScore: mainSignal.confidenceScore || 65,
      confidenceLevel: getBehaviorConfidence(mainSignal.confidenceScore || 65),
      sourceType: mainSignal.source?.type || mainSignal.sourceType || "unknown",
      explanation:
        mainSignal.reasoning ||
        `${airport} apresenta sinais de pressão operacional elevada.`,
      affects: ["airport", "security", "terminal"],
    };
  }

  if (severity === "medium") {
    return {
      domain: "airport",
      state: "above_normal_pressure",
      label: "Mais movimentado do que o habitual",
      shortLabel: "Acima do normal",
      severity,
      tone: getBehaviorTone(severity),
      confidenceScore: mainSignal.confidenceScore || 58,
      confidenceLevel: getBehaviorConfidence(mainSignal.confidenceScore || 58),
      sourceType: mainSignal.source?.type || mainSignal.sourceType || "unknown",
      explanation:
        mainSignal.reasoning ||
        `${airport} pode estar com pressão operacional acima do padrão esperado.`,
      affects: ["airport", "security", "terminal"],
    };
  }

  return {
    domain: "airport",
    state: "stable",
    label: "Aeroporto dentro do comportamento normal",
    shortLabel: "Normal",
    severity: "low",
    tone: "stable",
    confidenceScore: mainSignal.confidenceScore || 55,
    confidenceLevel: getBehaviorConfidence(mainSignal.confidenceScore || 55),
    sourceType: mainSignal.source?.type || mainSignal.sourceType || "unknown",
    explanation:
      mainSignal.reasoning ||
      `${airport} sem pressão operacional relevante detetada.`,
    affects: ["airport"],
  };
}

function buildSecurityBehavior({ signals = [] }) {
  const securitySignals = getSignalsForAffect(signals, [
    "security",
    "airport_security",
  ]);

  const mainSignal =
    getMainSignal(securitySignals, () => true) ||
    getMainSignal(signals, (signal) =>
      ["security_variability"].includes(signal.type)
    );

  if (!mainSignal) {
    return {
      domain: "security",
      state: "stable",
      label: "Segurança dentro do normal",
      shortLabel: "Normal",
      severity: "low",
      tone: "stable",
      confidenceScore: 50,
      confidenceLevel: "low",
      sourceType: "behavior_fallback",
      explanation:
        "Sem sinais específicos de segurança. Mantida leitura operacional base.",
      affects: ["security"],
    };
  }

  const severity = normalizeLevel(mainSignal.severity);

  if (severity === "critical" || severity === "high") {
    return {
      domain: "security",
      state: "heavy_security_pressure",
      label: "Segurança com pressão elevada",
      shortLabel: "Pressão elevada",
      severity,
      tone: getBehaviorTone(severity),
      confidenceScore: mainSignal.confidenceScore || 60,
      confidenceLevel: getBehaviorConfidence(mainSignal.confidenceScore || 60),
      sourceType: mainSignal.source?.type || mainSignal.sourceType || "unknown",
      explanation:
        mainSignal.reasoning ||
        "A segurança pode apresentar filas ou variabilidade elevada.",
      affects: ["security"],
    };
  }

  if (severity === "medium") {
    return {
      domain: "security",
      state: "slower_than_normal",
      label: "Segurança possivelmente mais lenta do que o habitual",
      shortLabel: "Mais lenta",
      severity,
      tone: "attention",
      confidenceScore: mainSignal.confidenceScore || 58,
      confidenceLevel: getBehaviorConfidence(mainSignal.confidenceScore || 58),
      sourceType: mainSignal.source?.type || mainSignal.sourceType || "unknown",
      explanation:
        mainSignal.reasoning ||
        "A segurança pode variar. A timeline mantém margem adicional.",
      affects: ["security"],
    };
  }

  return {
    domain: "security",
    state: "stable",
    label: "Segurança dentro do normal",
    shortLabel: "Normal",
    severity: "low",
    tone: "stable",
    confidenceScore: mainSignal.confidenceScore || 55,
    confidenceLevel: getBehaviorConfidence(mainSignal.confidenceScore || 55),
    sourceType: mainSignal.source?.type || mainSignal.sourceType || "unknown",
    explanation:
      mainSignal.reasoning || "Sem sinais relevantes de pressão na segurança.",
    affects: ["security"],
  };
}

function buildRouteBehavior({ signals = [], transport = "public" }) {
  const routeSignals = getSignalsForAffect(signals, [
    "route",
    "airport_access",
    "leave_home_time",
    "public_transport",
  ]);

  const mainSignal =
    getMainSignal(routeSignals, () => true) ||
    getMainSignal(signals, (signal) =>
      [
        "live_traffic",
        "route_estimate",
        "public_transport_monitoring",
        "public_transport_watch",
      ].includes(signal.type)
    );

  if (!mainSignal) {
    return {
      domain: "route",
      state: "stable",
      label: "Trajeto operacionalmente estável",
      shortLabel: "Estável",
      severity: "low",
      tone: "stable",
      confidenceScore: 50,
      confidenceLevel: "low",
      sourceType: "behavior_fallback",
      explanation:
        "Sem sinais relevantes na rota. Mantida leitura operacional base.",
      affects: ["route"],
    };
  }

  const severity = normalizeLevel(mainSignal.severity);

  if (severity === "critical") {
    return {
      domain: "route",
      state: "severe_disruption",
      label: "Disrupção severa no trajeto",
      shortLabel: "Severo",
      severity,
      tone: "critical",
      confidenceScore: mainSignal.confidenceScore || 65,
      confidenceLevel: getBehaviorConfidence(mainSignal.confidenceScore || 65),
      sourceType: mainSignal.source?.type || mainSignal.sourceType || "unknown",
      explanation:
        mainSignal.reasoning ||
        "O trajeto apresenta disrupção severa. A recomendação deve ser revista.",
      affects: ["route", "leave_home_time"],
    };
  }

  if (severity === "high") {
    return {
      domain: "route",
      state: "unstable",
      label: "Trajeto instável",
      shortLabel: "Instável",
      severity,
      tone: "warning",
      confidenceScore: mainSignal.confidenceScore || 65,
      confidenceLevel: getBehaviorConfidence(mainSignal.confidenceScore || 65),
      sourceType: mainSignal.source?.type || mainSignal.sourceType || "unknown",
      explanation:
        mainSignal.reasoning ||
        "O trajeto apresenta sinais de instabilidade operacional.",
      affects: ["route", "leave_home_time"],
    };
  }

  if (severity === "medium") {
    return {
      domain: "route",
      state: "minor_delays",
      label:
        transport === "public"
          ? "Transporte público requer monitorização"
          : "Trajeto pode ter pequena variabilidade",
      shortLabel: "Atenção",
      severity,
      tone: "attention",
      confidenceScore: mainSignal.confidenceScore || 58,
      confidenceLevel: getBehaviorConfidence(mainSignal.confidenceScore || 58),
      sourceType: mainSignal.source?.type || mainSignal.sourceType || "unknown",
      explanation:
        mainSignal.reasoning ||
        "A rota pode apresentar variabilidade. A timeline mantém margem adicional.",
      affects: ["route", "leave_home_time"],
    };
  }

  return {
    domain: "route",
    state: "stable",
    label: "Trajeto dentro do comportamento normal",
    shortLabel: "Estável",
    severity: "low",
    tone: "stable",
    confidenceScore: mainSignal.confidenceScore || 55,
    confidenceLevel: getBehaviorConfidence(mainSignal.confidenceScore || 55),
    sourceType: mainSignal.source?.type || mainSignal.sourceType || "unknown",
    explanation:
      mainSignal.reasoning || "Sem perturbações relevantes no trajeto.",
    affects: ["route"],
  };
}

function buildFlightBehavior({ signals = [], flightStatus = "scheduled" }) {
  const flightSignals = signals.filter((signal) =>
    [
      "flight_monitoring",
      "gate_pending",
      "flight_delayed",
      "departure_delay",
      "flight_cancelled",
      "flight_departed",
      "flight_finished",
    ].includes(signal.type)
  );

  const mainSignal = getMainSignal(flightSignals, () => true);

  const status = normalizeText(flightStatus, "scheduled").toLowerCase();

  if (status === "cancelled") {
    return {
      domain: "flight",
      state: "disrupted_operation",
      label: "Voo cancelado ou operacionalmente bloqueado",
      shortLabel: "Cancelado",
      severity: "critical",
      tone: "critical",
      confidenceScore: 90,
      confidenceLevel: "high",
      sourceType: "flight_status_engine",
      explanation:
        "O voo não deve gerar timeline operacional normal sem validação.",
      affects: ["flight"],
    };
  }

  if (["delayed"].includes(status)) {
    return {
      domain: "flight",
      state: "delayed_operation",
      label: "Voo com atraso operacional",
      shortLabel: "Atraso",
      severity: "medium",
      tone: "attention",
      confidenceScore: mainSignal?.confidenceScore || 75,
      confidenceLevel: getBehaviorConfidence(mainSignal?.confidenceScore || 75),
      sourceType: mainSignal?.source?.type || "flight_status_engine",
      explanation:
        mainSignal?.reasoning ||
        "O estado do voo exige monitorização adicional.",
      affects: ["flight"],
    };
  }

  if (mainSignal?.type === "gate_pending") {
    return {
      domain: "flight",
      state: "minor_operational_variability",
      label: "Gate ainda por confirmar",
      shortLabel: "Gate pendente",
      severity: "low",
      tone: "stable",
      confidenceScore: mainSignal.confidenceScore || 70,
      confidenceLevel: getBehaviorConfidence(mainSignal.confidenceScore || 70),
      sourceType: mainSignal.source?.type || "flight_status_engine",
      explanation:
        mainSignal.reasoning ||
        "Gate ainda não atribuído, comportamento comum antes da partida.",
      affects: ["flight", "gate"],
    };
  }

  return {
    domain: "flight",
    state: "normal_operation",
    label: "Voo em operação normal",
    shortLabel: "Normal",
    severity: "low",
    tone: "stable",
    confidenceScore: mainSignal?.confidenceScore || 75,
    confidenceLevel: getBehaviorConfidence(mainSignal?.confidenceScore || 75),
    sourceType: mainSignal?.source?.type || "flight_status_engine",
    explanation:
      mainSignal?.reasoning ||
      "Sem sinais relevantes de disrupção no voo.",
    affects: ["flight"],
  };
}

export async function getOperationalBehaviorIntelligence({
  airport = "LIS",
  city = "Lisboa",
  transport = "public",
  flightStatus = "scheduled",
  signals = [],
  aggregation = {},
} = {}) {
  const safeSignals = Array.isArray(signals) ? signals : [];

  const airportBehavior = buildAirportBehavior({
    signals: safeSignals,
    airport,
  });

  const securityBehavior = buildSecurityBehavior({
    signals: safeSignals,
  });

  const routeBehavior = buildRouteBehavior({
    signals: safeSignals,
    transport,
  });

  const flightBehavior = buildFlightBehavior({
    signals: safeSignals,
    flightStatus,
  });

  const behaviors = {
    airport: airportBehavior,
    security: securityBehavior,
    route: routeBehavior,
    flight: flightBehavior,
  };

  const behaviorList = Object.values(behaviors);

  const highestSeverity = behaviorList
    .map((item) => item.severity)
    .sort((a, b) => getSeverityScore(b) - getSeverityScore(a))[0];

  const confidenceScore = Math.round(
    (averageConfidence(behaviorList, 55) + (aggregation.confidenceScore || 50)) /
      2
  );

  const summary =
    highestSeverity === "critical"
      ? "Existem sinais críticos que exigem validação operacional imediata."
      : highestSeverity === "high"
      ? "Existem sinais fortes de pressão operacional. A timeline deve ser conservadora."
      : highestSeverity === "medium"
      ? "Existem sinais moderados de variabilidade operacional. A timeline mantém margem adicional."
      : "Operação dentro do comportamento esperado. Manter monitorização normal.";

  return {
    success: true,

    engine: "Home2Flight Operational Behavior Engine",

    version: "0.1.0-human-operational-interpretation",

    generatedAt: new Date().toISOString(),

    request: {
      airport,
      city,
      transport,
      flightStatus,
      signalCount: safeSignals.length,
    },

    behaviorSummary: {
      globalBehavior:
        highestSeverity === "critical"
          ? "critical_disruption"
          : highestSeverity === "high"
          ? "high_pressure"
          : highestSeverity === "medium"
          ? "above_normal_variability"
          : "stable_operation",

      label:
        highestSeverity === "critical"
          ? "Disrupção operacional crítica"
          : highestSeverity === "high"
          ? "Pressão operacional elevada"
          : highestSeverity === "medium"
          ? "Mais movimentado do que o habitual"
          : "Operação dentro do normal",

      severity: highestSeverity,

      confidenceScore,

      confidenceLevel: getBehaviorConfidence(confidenceScore),

      summary,
    },

    behaviors,

    displayHints: {
      compactLabel:
        highestSeverity === "critical"
          ? "Crítico"
          : highestSeverity === "high"
          ? "Pressão elevada"
          : highestSeverity === "medium"
          ? "Acima do normal"
          : "Normal",

      userFacingMessage: summary,

      suggestedTimelineBadge:
        highestSeverity === "critical"
          ? "Validação necessária"
          : highestSeverity === "high"
          ? "Pressão elevada"
          : highestSeverity === "medium"
          ? "Mais movimento"
          : "Dentro do normal",
    },

    limitations: [
      "Primeira versão interpreta sinais já existentes, ainda sem baseline histórico real.",
      "Ainda não compara live data contra histórico por aeroporto/hora/dia.",
      "Ainda não usa crowd reports reais.",
    ],
  };
}

export default async function handler(req, res) {
  try {
    const {
      airport = "LIS",
      city = "Lisboa",
      transport = "public",
      flightStatus = "scheduled",
      mock = "true",
    } = req.query;

    const mockSignals =
      String(mock).toLowerCase() === "true"
        ? [
            {
              id: "mock_airport_pressure",
              type: "terminal_pressure",
              title: "Pressão operacional do terminal",
              severity: "medium",
              confidenceScore: 62,
              source: {
                type: "internal_airport_profile",
                name: "Home2Flight Airport Layer",
                live: false,
              },
              freshness: "profile",
              operationalImpact: {
                affects: ["security", "terminal_access"],
                extraBufferMinutes: 0,
                riskImpact: "medium",
              },
              reasoning:
                "Terminal avaliado com pressão operacional moderada.",
            },
            {
              id: "mock_public_transport",
              type: "public_transport_monitoring",
              title: "Monitorização de transporte público",
              severity: "medium",
              confidenceScore: 58,
              source: {
                type: "internal_operational_profile",
                name: "Home2Flight Mobility Layer",
                live: false,
              },
              freshness: "profile",
              operationalImpact: {
                affects: ["leave_home_time", "airport_access"],
                extraBufferMinutes: 10,
                riskImpact: "medium",
              },
              reasoning:
                "Transporte público pode exigir margem adicional.",
            },
          ]
        : [];

    const result = await getOperationalBehaviorIntelligence({
      airport,
      city,
      transport,
      flightStatus,
      signals: mockSignals,
      aggregation: {
        confidenceScore: 55,
      },
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
}