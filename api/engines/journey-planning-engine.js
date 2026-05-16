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

export default async function handler(req, res) {
  const flight =
    String(req.query.flight || "KL1578")
      .toUpperCase();

  const origin =
    String(req.query.origin || "Lisboa");

  const airport =
    String(req.query.airport || "LIS")
      .toUpperCase();

  const transport =
    String(req.query.transport || "public")
      .toLowerCase();

  const bags =
    String(req.query.bags || "true") === "true";

  const kids =
    String(req.query.kids || "false") === "true";

  const checkedIn =
    String(req.query.checkedIn || "false") === "true";

  const fastTrack =
    String(req.query.fastTrack || "false") === "true";

  const priorityBoarding =
    String(req.query.priorityBoarding || "false") === "true";

  const flightType =
    String(req.query.flightType || "passport");

  const BASE_URL = buildBaseUrl(req);

  const flightUrl =
    `${BASE_URL}/api/engines/flight-status-engine?flight=${flight}`;

  const airportUrl =
    `${BASE_URL}/api/engines/airport-intelligence-engine` +
    `?airport=${airport}` +
    `&airline=${flight.slice(0, 2)}` +
    `&bags=${bags}` +
    `&kids=${kids}`;

  const routeUrl =
    `${BASE_URL}/api/engines/route-intelligence-engine` +
    `?origin=${encodeURIComponent(origin)}` +
    `&airport=${airport}` +
    `&mode=${transport}`;

  const eventUrl =
    `${BASE_URL}/api/engines/event-disruption-intelligence-engine` +
    `?origin=${encodeURIComponent(origin)}` +
    `&airport=${airport}` +
    `&mode=${transport}`;

  const [
    flightEngine,
    airportEngine,
    routeEngine,
    eventEngine,
  ] = await Promise.all([
    fetchJson(flightUrl),
    fetchJson(airportUrl),
    fetchJson(routeUrl),
    fetchJson(eventUrl),
  ]);

  const flightData =
    flightEngine?.flight || null;

  if (!flightData) {
    return res.status(200).json({
      success: false,
      error:
        "Unable to generate operational journey.",
    });
  }

  const flightStatus =
    flightData.status || "unknown";

  const departureTime =
    flightData?.departure?.estimated ||
    flightData?.departure?.scheduled;

  if (!departureTime) {
    return res.status(200).json({
      success: false,
      error:
        "Flight departure time unavailable.",
    });
  }

  const departureDate =
    new Date(departureTime);

  const now = new Date();

  const flightAlreadyFinished =
    [
      "landed",
      "cancelled",
      "finished",
    ].includes(flightStatus);

  const flightAlreadyDeparted =
    [
      "departed",
      "active",
    ].includes(flightStatus) &&
    departureDate < now;

  if (
    flightAlreadyFinished ||
    flightAlreadyDeparted
  ) {
    return buildFinishedFlightResponse({
      res,
      flightData,
      flightEngine,
      departureTime,
    });
  }

  const airportBuffer =
    airportEngine
      ?.operationalIntelligence
      ?.recommendedAirportBuffer || 60;

  const routeMinutes =
    routeEngine
      ?.route
      ?.liveTrafficDurationMinutes ||
    routeEngine
      ?.route
      ?.baseDurationMinutes ||
    30;

  const routeBuffer =
    routeEngine
      ?.route
      ?.dynamicBufferMinutes || 20;

  const eventBuffer =
    eventEngine
      ?.eventIntelligence
      ?.totalExtraBufferMinutes || 0;

  const checkInMinutes =
    checkedIn
      ? 0
      : bags
      ? 20
      : 10;

  const securityMinutes =
    airportEngine
      ?.operationalIntelligence
      ?.estimatedSecurityMinutes || 20;

  const passportMinutes =
    flightType === "passport"
      ? 12
      : 0;

  const boardingBuffer =
    priorityBoarding
      ? 12
      : 20;

  const gateWalkingMinutes =
    airportEngine
      ?.operationalIntelligence
      ?.estimatedWalkingMinutes || 10;

  const totalAirportFlow =
    checkInMinutes +
    securityMinutes +
    passportMinutes +
    gateWalkingMinutes +
    boardingBuffer;

  const airportTotal =
    Math.max(
      airportBuffer,
      totalAirportFlow
    );

  const totalBeforeDeparture =
    airportTotal +
    routeMinutes +
    routeBuffer +
    eventBuffer;

  const leaveHomeDate =
    new Date(
      departureDate.getTime() -
        totalBeforeDeparture * 60000
    );

  const airportArrivalDate =
    new Date(
      departureDate.getTime() -
        airportTotal * 60000
    );

  const checkInDate =
    new Date(
      airportArrivalDate.getTime() +
        checkInMinutes * 60000
    );

  const securityDate =
    new Date(
      checkInDate.getTime() +
        securityMinutes * 60000
    );

  const passportDate =
    new Date(
      securityDate.getTime() +
        passportMinutes * 60000
    );

  const gateDate =
    new Date(
      departureDate.getTime() -
        boardingBuffer * 60000
    );

  const reliability =
    calculateJourneyReliability({
      airportEngine,
      routeEngine,
      eventEngine,
      checkedIn,
      kids,
      transport,
    });

  return res.status(200).json({
    success: true,

    engine:
      "Home2Flight Journey Planning Engine",

    version: "1.0.0-foundation",

    generatedAt:
      new Date().toISOString(),

    journey: {
      origin,
      airport,
      flight,
      transport,
    },

    decision: {
      leaveHomeTime:
        leaveHomeDate.toISOString(),

      airportArrivalTime:
        airportArrivalDate.toISOString(),

      departureTime:
        departureDate.toISOString(),

      operationalStatus:
        reliability.score >= 70
          ? "stable"
          : reliability.score >= 45
          ? "sensitive"
          : "fragile",
    },

    operationalFlow: {
      checkIn: {
        required: !checkedIn,
        recommendedTime:
          checkInDate.toISOString(),
        estimatedMinutes:
          checkInMinutes,
      },

      security: {
        fastTrack,
        recommendedTime:
          securityDate.toISOString(),
        estimatedMinutes:
          securityMinutes,
      },

      passportControl: {
        required:
          flightType === "passport",

        recommendedTime:
          passportDate.toISOString(),

        estimatedMinutes:
          passportMinutes,
      },

      gateArrival: {
        recommendedTime:
          gateDate.toISOString(),

        walkingMinutes:
          gateWalkingMinutes,

        boardingBuffer,
      },
    },

    buffers: {
      airportBuffer,
      routeBuffer,
      eventBuffer,
    },

    timingBreakdown: {
      routeMinutes,
      totalAirportFlow,
      totalBeforeDeparture,
    },

    reliability,

    sources: {
      flight:
        flightEngine?.reliability || null,

      airport:
        airportEngine?.operationalIntelligence ||
        null,

      route:
        routeEngine?.reliability || null,

      events:
        eventEngine?.eventIntelligence ||
        null,
    },
  });
}

function calculateJourneyReliability({
  airportEngine,
  routeEngine,
  eventEngine,
  checkedIn,
  kids,
  transport,
}) {
  let score = 82;

  if (
    airportEngine
      ?.operationalIntelligence
      ?.airportRisk === "medium"
  ) {
    score -= 12;
  }

  if (
    airportEngine
      ?.operationalIntelligence
      ?.airportRisk === "high"
  ) {
    score -= 20;
  }

  if (
    routeEngine
      ?.operationalProfile
      ?.routeRiskLevel === "medium"
  ) {
    score -= 8;
  }

  if (
    routeEngine
      ?.operationalProfile
      ?.routeRiskLevel === "high"
  ) {
    score -= 15;
  }

  if (
    eventEngine
      ?.eventIntelligence
      ?.eventRisk === "medium"
  ) {
    score -= 8;
  }

  if (
    eventEngine
      ?.eventIntelligence
      ?.eventRisk === "high"
  ) {
    score -= 15;
  }

  if (!checkedIn) {
    score -= 5;
  }

  if (kids) {
    score -= 5;
  }

  if (
    transport === "public"
  ) {
    score -= 5;
  }

  score =
    Math.max(
      0,
      Math.min(95, score)
    );

  return {
    score,

    trustLevel:
      score >= 75
        ? "high"
        : score >= 50
        ? "medium"
        : "low",

    readiness:
      score >= 75
        ? "ready"
        : score >= 50
        ? "sensitive"
        : "fragile",
  };
}

function buildFinishedFlightResponse({
  res,
  flightData,
  flightEngine,
  departureTime,
}) {
  return res.status(200).json({
    success: true,

    engine:
      "Home2Flight Journey Planning Engine",

    version:
      "1.0.0-foundation",

    generatedAt:
      new Date().toISOString(),

    finishedFlight: true,

    uiSummary: {
      status: "good",

      headline:
        "Voo já concluído",

      shortMessage:
        "A janela operacional pré-voo já terminou.",
    },

    decision: {
      leaveHomeTime: null,
      airportArrivalTime: null,
      departureTime,
    },

    flight: flightData,

    flightIntelligence:
      flightEngine,

    reliability: {
      score: 95,
      trustLevel: "high",
      readiness: "completed",
    },
  });
}