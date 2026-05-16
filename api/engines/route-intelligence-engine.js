// /api/engines/route-intelligence-engine.js

const AIRPORT_DESTINATIONS = {
  LIS: "Lisbon Airport",
  OPO: "Porto Airport",
  FAO: "Faro Airport",
  MAD: "Madrid Barajas Airport",
  CDG: "Charles de Gaulle Airport",
};

function normalizeMode(mode) {
  const value = String(mode || "car").toLowerCase();

  if (["public", "transit", "public_transport"].includes(value)) {
    return "transit";
  }

  if (["walk", "walking"].includes(value)) {
    return "walking";
  }

  if (["bike", "bicycle", "cycling"].includes(value)) {
    return "bicycling";
  }

  return "driving";
}

function getTransportLabel(mode) {
  if (mode === "transit") return "public";
  if (mode === "walking") return "walking";
  if (mode === "bicycling") return "bicycle";
  return "car";
}

function getAirportDestination(airport) {
  const code = String(airport || "LIS").toUpperCase();
  return AIRPORT_DESTINATIONS[code] || `${code} Airport`;
}

function getRiskFromTrafficDelta(trafficDelta) {
  if (trafficDelta >= 15) return "high";
  if (trafficDelta >= 5) return "medium";
  return "low";
}

function getDynamicBuffer({ trafficDelta, mode }) {
  if (mode === "transit") {
    if (trafficDelta >= 15) return 40;
    if (trafficDelta >= 5) return 30;
    return 25;
  }

  if (trafficDelta >= 15) return 35;
  if (trafficDelta >= 5) return 25;
  return 15;
}

function getReliabilityForMode({ mode, hasLiveTraffic }) {
  if (!hasLiveTraffic) {
    return {
      score: 55,
      confidenceScore: 58,
      trustLevel: "low",
    };
  }

  if (mode === "transit") {
    return {
      score: 72,
      confidenceScore: 74,
      trustLevel: "medium",
    };
  }

  return {
    score: 86,
    confidenceScore: 89,
    trustLevel: "high",
  };
}

function buildFallbackRoute({
  origin,
  airport,
  mode,
  reason,
  errorMessage = null,
}) {
  const normalizedMode = normalizeMode(mode);
  const transportMode = getTransportLabel(normalizedMode);

  const fallbackBaseMinutes =
    normalizedMode === "transit" ? 45 : normalizedMode === "walking" ? 90 : 28;

  const fallbackBuffer =
    normalizedMode === "transit" ? 30 : normalizedMode === "walking" ? 20 : 25;

  return {
    success: true,
    fallback: true,
    engine: "Home2Flight Route Intelligence Engine",
    version: "1.1.0-exportable",
    generatedAt: new Date().toISOString(),

    route: {
      origin,
      destinationAirport: airport,
      transportMode,
      baseDurationMinutes: fallbackBaseMinutes,
      liveTrafficDurationMinutes: fallbackBaseMinutes,
      trafficDeltaMinutes: 0,
      dynamicBufferMinutes: fallbackBuffer,
      totalRecommendedRouteMinutes: fallbackBaseMinutes + fallbackBuffer,
    },

    operationalProfile: {
      trafficRisk: "medium",
      disruptionRisk: "unknown",
      airportAccessRisk: "medium",
      routeRiskLevel: "medium",
    },

    reliability: {
      score: 55,
      confidenceScore: 58,
      trustLevel: "low",
      sourceType: "fallback_route_profile",
      source: "Home2Flight conservative route fallback",
      liveDataActive: false,
      dataFreshness: "fallback",
      limitations: [
        "Dados live de rota indisponíveis.",
        "A Home2Flight aplicou um perfil conservador.",
        reason,
        ...(errorMessage ? [errorMessage] : []),
      ],
    },

    intelligenceSummary: {
      operationalStatus: "fallback",
      recommendationImpact: "conservative_route_buffer",
      summary:
        "Dados live de rota indisponíveis. A timeline usa margem conservadora para o trajeto.",
    },

    intelligenceFlags: [
      {
        type: "route_data_fallback",
        label: "Rota em modo conservador",
        severity: "medium",
      },
    ],

    diagnostics: {
      reason,
      errorMessage,
    },
  };
}

export async function getRouteOperationalIntelligence({
  origin = "Lisboa",
  airport = "LIS",
  mode = "car",
} = {}) {
  const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;
  const airportCode = String(airport || "LIS").toUpperCase();
  const normalizedMode = normalizeMode(mode);
  const transportMode = getTransportLabel(normalizedMode);

  if (!GOOGLE_KEY) {
    return buildFallbackRoute({
      origin,
      airport: airportCode,
      mode,
      reason: "GOOGLE_MAPS_API_KEY missing.",
    });
  }

  try {
    const destination = getAirportDestination(airportCode);

    const params = new URLSearchParams({
      origins: origin,
      destinations: destination,
      mode: normalizedMode,
      key: GOOGLE_KEY,
    });

    if (normalizedMode === "driving" || normalizedMode === "transit") {
      params.set("departure_time", "now");
    }

    if (normalizedMode === "driving") {
      params.set("traffic_model", "best_guess");
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;

    const response = await fetch(url);
    const data = await response.json();

    const element = data?.rows?.[0]?.elements?.[0];

    if (!element || element.status !== "OK") {
      return buildFallbackRoute({
        origin,
        airport: airportCode,
        mode,
        reason: `Google Maps returned invalid element status: ${
          element?.status || data?.status || "unknown"
        }`,
      });
    }

    const baseDurationMinutes = Math.round(element.duration.value / 60);

    const liveTrafficDurationMinutes = element.duration_in_traffic?.value
      ? Math.round(element.duration_in_traffic.value / 60)
      : baseDurationMinutes;

    const trafficDeltaMinutes =
      liveTrafficDurationMinutes - baseDurationMinutes;

    const dynamicBufferMinutes = getDynamicBuffer({
      trafficDelta: trafficDeltaMinutes,
      mode: normalizedMode,
    });

    const totalRecommendedRouteMinutes =
      liveTrafficDurationMinutes + dynamicBufferMinutes;

    const routeRiskLevel = getRiskFromTrafficDelta(trafficDeltaMinutes);

    const reliability = getReliabilityForMode({
      mode: normalizedMode,
      hasLiveTraffic: true,
    });

    return {
      success: true,
      fallback: false,
      engine: "Home2Flight Route Intelligence Engine",
      version: "1.1.0-exportable",
      generatedAt: new Date().toISOString(),

      route: {
        origin,
        destinationAirport: airportCode,
        transportMode,
        baseDurationMinutes,
        liveTrafficDurationMinutes,
        trafficDeltaMinutes,
        dynamicBufferMinutes,
        totalRecommendedRouteMinutes,
      },

      operationalProfile: {
        trafficRisk: routeRiskLevel,
        disruptionRisk: trafficDeltaMinutes >= 15 ? "high" : "low",
        airportAccessRisk: trafficDeltaMinutes >= 8 ? "medium" : "low",
        routeRiskLevel,
      },

      reliability: {
        ...reliability,
        sourceType:
          normalizedMode === "driving"
            ? "google_maps_live_traffic"
            : "google_maps_route_estimate",
        source: "Google Maps Distance Matrix API",
        liveDataActive: true,
        dataFreshness: "live",
        limitations: [
          normalizedMode === "driving"
            ? "Rota calculada com tráfego live do Google Maps."
            : "Rota calculada com estimativa Google Maps, podendo não refletir todos os incidentes em tempo real.",
        ],
      },

      intelligenceSummary: {
        operationalStatus: "live",
        recommendationImpact:
          trafficDeltaMinutes >= 5
            ? "dynamic_buffer_increased"
            : "standard_route",
        summary:
          trafficDeltaMinutes >= 5
            ? `Trânsito acima do normal detetado. Buffer aumentado para ${dynamicBufferMinutes} minutos.`
            : "Trajeto operacional dentro do esperado.",
      },

      intelligenceFlags: [
        {
          type:
            normalizedMode === "driving"
              ? "live_traffic"
              : "route_estimate",
          label:
            normalizedMode === "driving"
              ? "Trânsito live ativo"
              : "Estimativa de rota ativa",
          severity: routeRiskLevel,
        },
      ],

      raw: {
        googleStatus: data.status,
        elementStatus: element.status,
      },
    };
  } catch (error) {
    return buildFallbackRoute({
      origin,
      airport: airportCode,
      mode,
      reason: "Google Maps request failed.",
      errorMessage: error.message,
    });
  }
}

export default async function handler(req, res) {
  const {
    origin = "Lisboa",
    airport = "LIS",
    mode = "car",
  } = req.query;

  const result = await getRouteOperationalIntelligence({
    origin,
    airport,
    mode,
  });

  return res.status(200).json(result);
}