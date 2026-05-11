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
  const protocol =
    req.headers["x-forwarded-proto"] || "https";

  const host = req.headers.host;

  return `${protocol}://${host}`;
}

function buildFlightStep(flightEngine) {
  const flight = flightEngine?.flight;

  if (!flight) {
    return null;
  }

  const delay =
    flight?.departure?.delayMinutes ||
    flight?.arrival?.delayMinutes ||
    0;

  let status = "ready";
  let recalculationStatus = "stable";
  let trustLevel = "high";
  let confidenceScore = 88;
  let buffer = "Ready";

  if (delay >= 15) {
    status = "buffer";
    recalculationStatus = "recalculated";
    trustLevel = "medium";
    confidenceScore = 72;
    buffer = `+${delay}m`;
  }

  if (delay >= 45) {
    status = "risk";
    recalculationStatus = "critical";
    trustLevel = "low";
    confidenceScore = 45;
  }

  return {
    id: 2,
    time:
      flight?.departure?.estimated ||
      flight?.departure?.scheduled,
    title: "Confirmar estado do voo",
    category: "Flight",
    status,
    confidence: "Flight",
    confidenceScore,
    trustLevel,
    source: "Live flight engine",
    sourceType: "aviationstack_live",
    buffer,
    recalculationStatus,
    liveInsight:
      flightEngine?.intelligenceSummary?.summary ||
      "Voo em monitorização.",
    reasoning: `Terminal ${flight?.departure?.terminal || "?"} · Gate ${
      flight?.departure?.gate || "?"
    }`,
    intelligenceFlags:
      flightEngine?.operationalSignals || [],
    operationalSignals:
      flightEngine?.operationalSignals || [],
    liveData: {
      airline: flight?.airline?.name,
      flightNumber: flight?.number,
      departureAirport: flight?.route?.from?.code,
      arrivalAirport: flight?.route?.to?.code,
      terminal: flight?.departure?.terminal,
      gate: flight?.departure?.gate,
      departureDelay: flight?.departure?.delayMinutes,
      arrivalDelay: flight?.arrival?.delayMinutes,
      flightStatus: flight?.status,
    },
  };
}

export default async function handler(req, res) {
  const flight = req.query.flight || "AF1195";
  const origin = req.query.origin || "Lisboa";
  const airport = req.query.airport || "LIS";
  const mode = req.query.mode || "car";

  const BASE_URL = buildBaseUrl(req);

  const baseEngineUrl =
    `${BASE_URL}/api/home2flight-engine` +
    `?flight=${flight}&origin=${origin}&airport=${airport}&mode=${mode}`;

  const flightEngineUrl =
    `${BASE_URL}/api/engines/flight-status-engine` +
    `?flight=${flight}`;

  const [baseEngine, flightEngine] = await Promise.all([
    fetchJson(baseEngineUrl),
    fetchJson(flightEngineUrl),
  ]);

  if (!baseEngine?.success) {
    return res.status(500).json({
      success: false,
      error: "Base Home2Flight engine unavailable.",
      diagnostics: {
        baseEngineUrl,
      },
    });
  }

  const timeline = [...(baseEngine.timeline || [])];

  const liveFlightStep = buildFlightStep(flightEngine);

  if (liveFlightStep) {
    const index = timeline.findIndex(
      (item) => item.category === "Flight"
    );

    if (index >= 0) {
      timeline[index] = {
        ...timeline[index],
        ...liveFlightStep,
      };
    }
  }

  const liveOperationalSignals = [
    ...(baseEngine.liveOperationalMonitor?.operationalEvents || []),
    ...(flightEngine?.operationalSignals || []),
  ];

  return res.status(200).json({
    success: true,
    generatedAt: new Date().toISOString(),
    engine: "Home2Flight Unified Live Engine",
    version: "0.2.0",
    request: {
      flight,
      origin,
      airport,
      mode,
    },
    liveFlightEngine: flightEngine,
    liveOperationalSignals,
    decision: baseEngine.decision,
    liveOperationalMonitor:
      baseEngine.liveOperationalMonitor,
    timeline,
    diagnostics: {
      baseUrl: BASE_URL,
      flightEngineConnected:
        Boolean(flightEngine?.success),
      liveSignals:
        liveOperationalSignals.length,
      timelineItems:
        timeline.length,
    },
  });
}