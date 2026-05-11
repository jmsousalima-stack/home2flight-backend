export default async function handler(req, res) {
  const flight = String(req.query.flight || "AF1195").toUpperCase();
  const origin = String(req.query.origin || "Lisboa").trim();
  const airport = String(req.query.airport || "LIS").toUpperCase();
  const mode = String(req.query.mode || "car").toLowerCase();

  try {
    const baseUrl = getBaseUrl(req);

    const [flightIntel, airportIntel, routeIntel] = await Promise.all([
      fetchJsonSafe(
        `${baseUrl}/api/flight-intelligence?flight=${encodeURIComponent(flight)}`
      ),
      fetchJsonSafe(
        `${baseUrl}/api/airport-intel?airport=${encodeURIComponent(airport)}`
      ),
      fetchJsonSafe(
        `${baseUrl}/api/route-intelligence?origin=${encodeURIComponent(
          origin
        )}&airport=${encodeURIComponent(airport)}&mode=${encodeURIComponent(mode)}`
      ),
    ]);

    const decision = buildReliabilityDecision({
      flight,
      origin,
      airport,
      mode,
      flightIntel,
      airportIntel,
      routeIntel,
    });

    return res.status(200).json(decision);
  } catch (error) {
    return res.status(200).json(
      buildFallbackDecision({
        flight,
        origin,
        airport,
        mode,
        error,
      })
    );
  }
}

function getBaseUrl(req) {
  const host = req.headers.host;
  const protocol = host?.includes("localhost") ? "http" : "https";

  return `${protocol}://${host}`;
}

async function fetchJsonSafe(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();

    return {
      reachable: true,
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (error) {
    return {
      reachable: false,
      status: null,
      ok: false,
      data: null,
      error: error.message,
    };
  }
}

function buildReliabilityDecision({
  flight,
  origin,
  airport,
  mode,
  flightIntel,
  airportIntel,
  routeIntel,
}) {
  const flightData = flightIntel?.data || {};
  const airportData = airportIntel?.data || {};
  const routeData = routeIntel?.data || {};

  const flightScore = getScore(flightData?.reliability?.score, 45);
  const airportScore = getScore(airportData?.reliability?.score, 50);
  const routeScore = getScore(routeData?.reliability?.score, 50);

  const globalReliabilityScore = calculateWeightedScore({
    flightScore,
    airportScore,
    routeScore,
  });

  const operationalRisk = calculateOperationalRisk({
    flightData,
    airportData,
    routeData,
    globalReliabilityScore,
  });

  const globalConfidenceScore = calculateGlobalConfidence({
    flightData,
    airportData,
    routeData,
    globalReliabilityScore,
  });

  const dynamicBufferMinutes = calculateDynamicBuffer({
    flightData,
    airportData,
    routeData,
    operationalRisk,
  });

  const recommendedDeparture = calculateRecommendedDeparture({
    flightData,
    routeData,
    airportData,
    dynamicBufferMinutes,
  });

  const intelligenceFlags = buildGlobalFlags({
    flightData,
    airportData,
    routeData,
    operationalRisk,
    dynamicBufferMinutes,
  });

  return {
    success: true,
    generatedAt: new Date().toISOString(),
    engine: "Home2Flight Reliability Decision Engine",
    version: "0.1.0",

    request: {
      flight,
      origin,
      airport,
      mode,
    },

    decision: {
      recommendedDeparture,
      recommendedDepartureLocal: formatTime(recommendedDeparture),
      operationalRisk,
      globalReliabilityScore,
      globalConfidenceScore,
      trustLevel: getTrustLevel(globalReliabilityScore),
      dynamicBufferMinutes,
      recommendationType: getRecommendationType(operationalRisk),
      summary: buildDecisionSummary({
        flight,
        origin,
        airport,
        mode,
        recommendedDeparture,
        operationalRisk,
        dynamicBufferMinutes,
      }),
    },

    inputs: {
      flight: {
        reachable: flightIntel.reachable,
        status: flightIntel.status,
        provider: flightData?.provider || null,
        reliability: flightData?.reliability || null,
        intelligenceSummary: flightData?.intelligenceSummary || null,
        flight: flightData?.flight || null,
      },

      airport: {
        reachable: airportIntel.reachable,
        status: airportIntel.status,
        reliability: airportData?.reliability || null,
        operationalProfile: airportData?.operationalProfile || null,
        intelligenceSummary: airportData?.intelligenceSummary || null,
      },

      route: {
        reachable: routeIntel.reachable,
        status: routeIntel.status,
        reliability: routeData?.reliability || null,
        operationalProfile: routeData?.operationalProfile || null,
        intelligenceSummary: routeData?.intelligenceSummary || null,
        route: routeData?.route || null,
      },
    },

    intelligenceFlags,

    sourceBreakdown: {
      flightEngine: flightIntel.reachable
        ? "flight-intelligence"
        : "flight-intelligence-unreachable",
      airportEngine: airportIntel.reachable
        ? "airport-intel"
        : "airport-intel-unreachable",
      routeEngine: routeIntel.reachable
        ? "route-intelligence"
        : "route-intelligence-unreachable",
      decisionEngine: "weighted-operational-reliability-model",
    },

    limitations: buildLimitations({
      flightData,
      airportData,
      routeData,
      flightIntel,
      airportIntel,
      routeIntel,
    }),

    diagnostics: {
      flightScore,
      airportScore,
      routeScore,
      weightedFormula:
        "flight 45% + airport 30% + route 25%, adjusted by operational risk and data confidence",
      flightEngineReachable: flightIntel.reachable,
      airportEngineReachable: airportIntel.reachable,
      routeEngineReachable: routeIntel.reachable,
    },
  };
}

function getScore(value, fallback) {
  if (typeof value === "number" && !Number.isNaN(value)) {
    return Math.max(0, Math.min(100, value));
  }

  return fallback;
}

function calculateWeightedScore({ flightScore, airportScore, routeScore }) {
  const weighted = flightScore * 0.45 + airportScore * 0.3 + routeScore * 0.25;

  return Math.round(Math.max(0, Math.min(95, weighted)));
}

function calculateGlobalConfidence({
  flightData,
  airportData,
  routeData,
  globalReliabilityScore,
}) {
  let score = globalReliabilityScore;

  if (flightData?.reliability?.liveDataActive) score += 7;
  if (airportData?.reliability?.liveDataActive) score += 5;
  if (routeData?.reliability?.liveDataActive) score += 5;

  if (!flightData?.success) score -= 12;
  if (!airportData?.success) score -= 8;
  if (!routeData?.success) score -= 8;

  return Math.max(0, Math.min(95, Math.round(score)));
}

function calculateOperationalRisk({
  flightData,
  airportData,
  routeData,
  globalReliabilityScore,
}) {
  const flightRisk = flightData?.intelligenceSummary?.delayRisk;
  const airportRisk = airportData?.intelligenceSummary?.airportRisk;
  const routeRisk = routeData?.operationalProfile?.routeRiskLevel;

  if (
    flightRisk === "critical" ||
    airportRisk === "high" ||
    routeRisk === "high" ||
    globalReliabilityScore < 40
  ) {
    return "high";
  }

  if (
    flightRisk === "medium" ||
    airportRisk === "medium" ||
    routeRisk === "medium" ||
    globalReliabilityScore < 68
  ) {
    return "medium";
  }

  return "low";
}

function calculateDynamicBuffer({
  flightData,
  airportData,
  routeData,
  operationalRisk,
}) {
  let buffer = 0;

  const routeBuffer = routeData?.route?.dynamicBufferMinutes;
  const airportBuffer =
    airportData?.operationalProfile?.recommendedBuffers?.airportBufferMinutes;

  const departureDelay = flightData?.flight?.departure?.delayMinutes;

  if (typeof routeBuffer === "number") buffer += routeBuffer;
  if (typeof airportBuffer === "number") buffer += airportBuffer;

  if (typeof departureDelay === "number" && departureDelay > 0) {
    buffer += Math.min(30, Math.ceil(departureDelay / 2));
  }

  if (operationalRisk === "medium") buffer += 10;
  if (operationalRisk === "high") buffer += 20;

  return Math.max(15, Math.min(90, buffer));
}

function calculateRecommendedDeparture({
  flightData,
  routeData,
  airportData,
  dynamicBufferMinutes,
}) {
  const scheduledDeparture =
    flightData?.flight?.departure?.scheduled ||
    flightData?.flight?.departure?.estimated;

  const fallbackDeparture = new Date();
  fallbackDeparture.setHours(fallbackDeparture.getHours() + 5);

  const flightTime = scheduledDeparture
    ? new Date(scheduledDeparture)
    : fallbackDeparture;

  const routeMinutes = routeData?.route?.estimatedRouteMinutes || 35;

  const airportProcessMinutes =
    airportData?.operationalProfile?.recommendedBuffers
      ?.totalAirportProcessMinutes || 65;

  const totalMinutesBeforeFlight =
    routeMinutes + airportProcessMinutes + dynamicBufferMinutes;

  return new Date(flightTime.getTime() - totalMinutesBeforeFlight * 60000)
    .toISOString();
}

function buildGlobalFlags({
  flightData,
  airportData,
  routeData,
  operationalRisk,
  dynamicBufferMinutes,
}) {
  const flags = [];

  if (flightData?.intelligenceSummary?.delayRisk) {
    flags.push({
      type: "flight",
      label: `Flight risk: ${flightData.intelligenceSummary.delayRisk}`,
      severity: mapRiskToSeverity(flightData.intelligenceSummary.delayRisk),
    });
  }

  if (airportData?.intelligenceSummary?.airportRisk) {
    flags.push({
      type: "airport",
      label: `Airport risk: ${airportData.intelligenceSummary.airportRisk}`,
      severity: mapRiskToSeverity(airportData.intelligenceSummary.airportRisk),
    });
  }

  if (routeData?.operationalProfile?.routeRiskLevel) {
    flags.push({
      type: "route",
      label: `Route risk: ${routeData.operationalProfile.routeRiskLevel}`,
      severity: mapRiskToSeverity(routeData.operationalProfile.routeRiskLevel),
    });
  }

  flags.push({
    type: "buffer",
    label: `Dynamic buffer +${dynamicBufferMinutes} min`,
    severity: dynamicBufferMinutes >= 60 ? "high" : "medium",
  });

  if (operationalRisk === "high") {
    flags.push({
      type: "decision",
      label: "Conservative departure recommended",
      severity: "high",
    });
  }

  return flags;
}

function mapRiskToSeverity(risk) {
  if (risk === "critical" || risk === "high") return "high";
  if (risk === "medium") return "medium";
  return "low";
}

function getTrustLevel(score) {
  if (score >= 78) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function getRecommendationType(risk) {
  if (risk === "high") return "leave_significantly_earlier";
  if (risk === "medium") return "leave_with_dynamic_buffer";
  return "standard_departure_plan";
}

function buildDecisionSummary({
  flight,
  origin,
  airport,
  mode,
  recommendedDeparture,
  operationalRisk,
  dynamicBufferMinutes,
}) {
  const time = formatTime(recommendedDeparture);

  if (operationalRisk === "high") {
    return `A Home2Flight recomenda sair às ${time}. O voo ${flight}, o aeroporto ${airport} e a rota desde ${origin} exigem margem reforçada de ${dynamicBufferMinutes} minutos.`;
  }

  if (operationalRisk === "medium") {
    return `A Home2Flight recomenda sair às ${time}. A decisão considera risco moderado entre voo, aeroporto e rota, com buffer dinâmico de ${dynamicBufferMinutes} minutos.`;
  }

  return `A Home2Flight recomenda sair às ${time}. Plano operacional estável para ${flight}, desde ${origin} até ${airport}, por ${mode}.`;
}

function formatTime(isoDate) {
  if (!isoDate) return "--:--";

  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Lisbon",
  });
}

function buildLimitations({
  flightData,
  airportData,
  routeData,
  flightIntel,
  airportIntel,
  routeIntel,
}) {
  const limitations = [];

  if (!flightIntel.reachable) {
    limitations.push("Flight Intelligence Engine indisponível.");
  }

  if (!airportIntel.reachable) {
    limitations.push("Airport Intelligence Engine indisponível.");
  }

  if (!routeIntel.reachable) {
    limitations.push("Route Intelligence Engine indisponível.");
  }

  if (Array.isArray(flightData?.reliability?.limitations)) {
    limitations.push(...flightData.reliability.limitations);
  }

  if (Array.isArray(airportData?.reliability?.limitations)) {
    limitations.push(...airportData.reliability.limitations);
  }

  if (Array.isArray(routeData?.reliability?.limitations)) {
    limitations.push(...routeData.reliability.limitations);
  }

  return [...new Set(limitations)];
}

function buildFallbackDecision({ flight, origin, airport, mode, error }) {
  return {
    success: false,
    generatedAt: new Date().toISOString(),
    engine: "Home2Flight Reliability Decision Engine",
    version: "0.1.0",
    request: {
      flight,
      origin,
      airport,
      mode,
    },
    decision: {
      recommendedDeparture: null,
      recommendedDepartureLocal: "--:--",
      operationalRisk: "unknown",
      globalReliabilityScore: 25,
      globalConfidenceScore: 25,
      trustLevel: "low",
      dynamicBufferMinutes: 60,
      recommendationType: "manual_validation_required",
      summary:
        "Não foi possível gerar uma decisão operacional fiável. A Home2Flight deve pedir validação manual.",
    },
    error: error.message,
  };
}
