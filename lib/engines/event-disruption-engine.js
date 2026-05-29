// /lib/engines/event-disruption-engine.js

const CITY_PROFILES = {
  LISBOA: {
    city: "Lisboa",
    country: "Portugal",
    airports: ["LIS"],
    transportSystems: ["metro", "train", "bus", "taxi", "tvde"],
    commonRisks: [
      "metro_strike",
      "train_disruption",
      "airport_access_congestion",
      "major_event",
      "heavy_rain",
    ],
  },
  LISBON: {
    city: "Lisboa",
    country: "Portugal",
    airports: ["LIS"],
    transportSystems: ["metro", "train", "bus", "taxi", "tvde"],
    commonRisks: [
      "metro_strike",
      "train_disruption",
      "airport_access_congestion",
      "major_event",
      "heavy_rain",
    ],
  },
  PORTO: {
    city: "Porto",
    country: "Portugal",
    airports: ["OPO"],
    transportSystems: ["metro", "train", "bus", "taxi", "tvde"],
    commonRisks: [
      "metro_disruption",
      "airport_access_congestion",
      "major_event",
      "heavy_rain",
    ],
  },
  PARIS: {
    city: "Paris",
    country: "France",
    airports: ["CDG", "ORY"],
    transportSystems: ["rer", "metro", "train", "bus", "taxi", "rideshare"],
    commonRisks: [
      "train_strike",
      "airport_staff_strike",
      "security_alert",
      "major_event",
      "protest",
    ],
  },
};

const AIRPORT_EVENT_PROFILES = {
  LIS: {
    airport: "LIS",
    city: "Lisboa",
    country: "Portugal",
    relevantEventTypes: [
      "airport_staff_strike",
      "security_queue_disruption",
      "baggage_handling_disruption",
      "metro_strike",
      "road_access_congestion",
      "weather_disruption",
      "major_city_event",
    ],
  },
  OPO: {
    airport: "OPO",
    city: "Porto",
    country: "Portugal",
    relevantEventTypes: [
      "airport_staff_strike",
      "security_queue_disruption",
      "metro_disruption",
      "road_access_congestion",
      "weather_disruption",
      "major_city_event",
    ],
  },
  CDG: {
    airport: "CDG",
    city: "Paris",
    country: "France",
    relevantEventTypes: [
      "airport_staff_strike",
      "security_alert",
      "baggage_handling_disruption",
      "train_strike",
      "rer_disruption",
      "road_access_congestion",
      "weather_disruption",
      "protest",
    ],
  },
};

function normalize(value, fallback = "") {
  return String(value || fallback).trim();
}

function normalizeAirport(airport) {
  return normalize(airport, "LIS").toUpperCase();
}

function normalizeCity(origin) {
  return normalize(origin, "Lisboa").toUpperCase();
}

function normalizeMode(mode) {
  const value = normalize(mode, "car").toLowerCase();

  if (["public", "transit", "public_transport"].includes(value)) {
    return "public";
  }

  if (["car", "driving", "taxi", "tvde", "uber"].includes(value)) {
    return "car";
  }

  return value;
}

function clamp(number, min, max) {
  return Math.max(min, Math.min(max, number));
}

function getSeverityScore(severity) {
  if (severity === "critical") return 95;
  if (severity === "high") return 80;
  if (severity === "medium") return 55;
  if (severity === "low") return 25;
  return 40;
}

function getSeverityFromScore(score) {
  if (score >= 90) return "critical";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function getTrustLevel(score) {
  if (score >= 80) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function buildFallbackSignals({ airport, origin, mode }) {
  const cityCode = normalizeCity(origin);
  const airportCode = normalizeAirport(airport);
  const transportMode = normalizeMode(mode);

  const cityProfile = CITY_PROFILES[cityCode] || CITY_PROFILES.LISBOA;
  const airportProfile = AIRPORT_EVENT_PROFILES[airportCode];

  const signals = [];

  signals.push({
    id: "event_monitoring_placeholder",
    type: "event_monitoring",
    label: "Monitorização de eventos preparada",
    severity: "low",
    confidenceScore: 45,
    trustLevel: "low",
    freshness: "fallback",
    sourceType: "internal_event_profile",
    affects: ["overall_reliability"],
    operationalImpact: {
      extraBufferMinutes: 0,
      routeRisk: "unknown",
      airportRisk: "unknown",
      recommendationImpact: "monitoring_only",
    },
    reasoning:
      "Ainda sem integração live de eventos/notícias. O motor está preparado para cruzar greves, incidentes, eventos urbanos e disrupções aeroportuárias.",
    limitations: [
      "Ainda sem fonte live de notícias/eventos ligada.",
      "Ainda sem validação por fonte oficial.",
      "Ainda sem reports comunitários.",
    ],
  });

  if (transportMode === "public") {
    signals.push({
      id: "public_transport_disruption_watch",
      type: "public_transport_watch",
      label: "Transporte público requer monitorização",
      severity: "medium",
      confidenceScore: 55,
      trustLevel: "medium",
      freshness: "profile",
      sourceType: "internal_city_risk_profile",
      affects: ["public_transport", "airport_access", "leave_home_time"],
      operationalImpact: {
        extraBufferMinutes: 10,
        routeRisk: "medium",
        airportRisk: "low",
        recommendationImpact: "increase_transport_buffer_if_live_event_detected",
      },
      reasoning: `${cityProfile.city} tem risco operacional relevante em transporte público quando há greves, falhas ou eventos urbanos.`,
      limitations: ["Sinal baseado em perfil interno, ainda sem confirmação live."],
    });
  }

  if (airportProfile) {
    signals.push({
      id: "airport_event_watch",
      type: "airport_event_watch",
      label: "Aeroporto sensível a disrupções operacionais",
      severity: "low",
      confidenceScore: 58,
      trustLevel: "medium",
      freshness: "profile",
      sourceType: "internal_airport_event_profile",
      affects: ["airport_security", "bag_drop", "gate_timing"],
      operationalImpact: {
        extraBufferMinutes: 0,
        routeRisk: "low",
        airportRisk: "medium",
        recommendationImpact: "watch_for_live_airport_events",
      },
      reasoning: `${airportCode} será monitorizado para greves, filas, disrupções de bagagem, incidentes e acessos.`,
      limitations: ["Sinal preventivo; ainda não representa evento confirmado."],
    });
  }

  return signals;
}

function classifySignals(signals) {
  const confirmedSignals = signals.filter(
    (signal) => signal.freshness === "live" || signal.freshness === "confirmed"
  );

  const monitoringSignals = signals.filter(
    (signal) => signal.freshness !== "live" && signal.freshness !== "confirmed"
  );

  const highestSeverityScore = signals.reduce((max, signal) => {
    return Math.max(max, getSeverityScore(signal.severity));
  }, 0);

  const totalExtraBufferMinutes = signals.reduce((sum, signal) => {
    return sum + (signal.operationalImpact?.extraBufferMinutes || 0);
  }, 0);

  const confidenceScore = clamp(
    Math.round(
      signals.reduce((sum, signal) => sum + (signal.confidenceScore || 0), 0) /
        Math.max(1, signals.length)
    ),
    0,
    100
  );

  return {
    confirmedSignals,
    monitoringSignals,
    highestSeverityScore,
    totalExtraBufferMinutes,
    globalSeverity: getSeverityFromScore(highestSeverityScore),
    confidenceScore,
    trustLevel: getTrustLevel(confidenceScore),
  };
}

function buildEventIntelligenceSummary({
  classification,
  airport,
  mode,
}) {
  const hasConfirmed = classification.confirmedSignals.length > 0;
  const airportCode = normalizeAirport(airport);
  const transportMode = normalizeMode(mode);

  if (hasConfirmed) {
    return {
      operationalStatus: "active_disruption_detected",
      eventRisk: classification.globalSeverity,
      recommendationImpact: "dynamic_buffer_required",
      summary: `Eventos relevantes detetados para ${airportCode}. A timeline deve aumentar buffers e monitorizar impacto operacional.`,
    };
  }

  if (transportMode === "public") {
    return {
      operationalStatus: "monitoring",
      eventRisk: "medium",
      recommendationImpact: "monitor_public_transport",
      summary:
        "Sem evento confirmado, mas transporte público exige monitorização adicional por risco de falhas, greves ou atrasos.",
    };
  }

  return {
    operationalStatus: "monitoring",
    eventRisk: "low",
    recommendationImpact: "standard_monitoring",
    summary:
      "Sem evento externo confirmado neste momento. A camada está preparada para integrar notícias, alertas oficiais e reports comunitários.",
  };
}

export async function getEventDisruptionIntelligence({
  origin = "Lisboa",
  airport = "LIS",
  mode = "car",
  flightDate = null,
} = {}) {
  const airportCode = normalizeAirport(airport);
  const cityCode = normalizeCity(origin);
  const transportMode = normalizeMode(mode);

  const signals = buildFallbackSignals({
    airport: airportCode,
    origin,
    mode: transportMode,
  });

  const classification = classifySignals(signals);

  const intelligenceSummary = buildEventIntelligenceSummary({
    classification,
    airport: airportCode,
    mode: transportMode,
  });

  return {
    success: true,
    engine: "Home2Flight Event & Disruption Intelligence Engine",
    version: "0.1.1-lib-exportable",
    generatedAt: new Date().toISOString(),

    request: {
      origin,
      cityCode,
      airport: airportCode,
      mode: transportMode,
      flightDate,
    },

    eventIntelligence: {
      liveDataActive: false,
      eventRisk: intelligenceSummary.eventRisk,
      globalSeverity: classification.globalSeverity,
      confirmedEventCount: classification.confirmedSignals.length,
      monitoringSignalCount: classification.monitoringSignals.length,
      totalExtraBufferMinutes: classification.totalExtraBufferMinutes,
      confidenceScore: classification.confidenceScore,
      trustLevel: classification.trustLevel,
      sourceType: "internal_event_disruption_profile",
      dataFreshness: "fallback-profile",
    },

    operationalSignals: signals,
    intelligenceSummary,

    sourcePlan: {
      freeTierSources: [
        "Internal airport/city event profiles",
        "Cached public disruption signals",
        "Community reports when available",
      ],
      premiumTierSources: [
        "Live news/event APIs",
        "Official transport disruption feeds",
        "Airport operational alerts",
        "Aviation disruption intelligence providers",
        "Higher-frequency monitoring",
      ],
      futureProviders: [
        "GDELT",
        "NewsAPI or equivalent",
        "Riskline",
        "Official airport feeds",
        "Official transport operator feeds",
        "Community/Waze-like reports",
      ],
    },

    limitations: [
      "Primeira versão ainda não consulta notícias externas.",
      "Ainda não valida eventos com fontes oficiais.",
      "Ainda não cruza reports comunitários.",
      "Esta camada já está preparada para afetar buffers e fiabilidade quando ligada ao motor principal.",
    ],
  };
}

export default getEventDisruptionIntelligence;