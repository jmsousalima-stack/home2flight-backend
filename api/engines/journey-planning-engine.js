// /api/engines/journey-planning-engine.js

async function fetchJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

function buildBaseUrl(req) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;

  return `${protocol}://${host}`;
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return String(value).toLowerCase() === "true";
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function subtractMinutes(date, minutes) {
  return new Date(date.getTime() - minutes * 60000);
}

function getValidDate(value) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function buildFallbackFlight({
  flight,
  airport,
  airline,
  fallbackDepartureTime,
}) {
  return {
    number: flight,
    airline: {
      name: airline,
      code: airline,
    },
    status: "scheduled_fallback",
    providerStatusRaw: "fallback",
    route: {
      from: {
        code: airport,
        name: "Origem",
        timezone: null,
      },
      to: {
        code: null,
        name: "Destino",
        timezone: null,
      },
    },
    departure: {
      scheduled: fallbackDepartureTime,
      estimated: fallbackDepartureTime,
      actual: null,
      delayMinutes: null,
      terminal: null,
      gate: null,
    },
    arrival: {
      scheduled: null,
      estimated: null,
      actual: null,
      delayMinutes: null,
      terminal: null,
      gate: null,
    },
  };
}

function getFlightDepartureTime(flightData, fallbackDepartureTime) {
  return (
    flightData?.departure?.estimated ||
    flightData?.departure?.scheduled ||
    fallbackDepartureTime ||
    null
  );
}

function isFlightFinished(status, departureDate) {
  const normalized = String(status || "").toLowerCase();
  const now = new Date();

  if (["landed", "cancelled", "finished"].includes(normalized)) {
    return true;
  }

  if (
    ["departed", "active"].includes(normalized) &&
    departureDate &&
    departureDate < now
  ) {
    return true;
  }

  return false;
}

function getStatusFromReliability(score) {
  if (score >= 70) return "stable";
  if (score >= 45) return "sensitive";
  return "fragile";
}

function getTrustLevel(score) {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function calculateJourneyReliability({
  flightEngine,
  airportEngine,
  routeEngine,
  eventEngine,
  checkedIn,
  kids,
  transport,
}) {
  let score = 82;
  const adjustments = [];

  if (!flightEngine?.success) {
    score -= 18;
    adjustments.push({
      factor: "flight_status",
      impact: -18,
      reason: "Dados reais de voo indisponíveis. Aplicado fallback conservador.",
    });
  } else if (flightEngine?.reliability?.score < 55) {
    score -= 12;
    adjustments.push({
      factor: "flight_status",
      impact: -12,
      reason: "Fonte de voo com confiança reduzida.",
    });
  } else {
    adjustments.push({
      factor: "flight_status",
      impact: 0,
      reason: "Dados reais de voo disponíveis.",
    });
  }

  const airportRisk =
    airportEngine?.operationalIntelligence?.airportRisk || "medium";

  if (airportRisk === "medium") {
    score -= 12;
    adjustments.push({
      factor: "airport_intelligence",
      impact: -12,
      reason: "Aeroporto avaliado com risco operacional médio.",
    });
  }

  if (airportRisk === "high") {
    score -= 20;
    adjustments.push({
      factor: "airport_intelligence",
      impact: -20,
      reason: "Aeroporto avaliado com risco operacional elevado.",
    });
  }

  const routeRisk =
    routeEngine?.operationalProfile?.routeRiskLevel || "unknown";

  if (routeRisk === "medium") {
    score -= 8;
    adjustments.push({
      factor: "route_intelligence",
      impact: -8,
      reason: "Rota com variabilidade moderada.",
    });
  }

  if (routeRisk === "high") {
    score -= 15;
    adjustments.push({
      factor: "route_intelligence",
      impact: -15,
      reason: "Rota com risco elevado.",
    });
  }

  const eventRisk =
    eventEngine?.eventIntelligence?.eventRisk || "unknown";

  if (eventRisk === "medium") {
    score -= 8;
    adjustments.push({
      factor: "event_disruption",
      impact: -8,
      reason: "Eventos/disrupções exigem monitorização adicional.",
    });
  }

  if (eventRisk === "high") {
    score -= 15;
    adjustments.push({
      factor: "event_disruption",
      impact: -15,
      reason: "Eventos/disrupções com impacto elevado.",
    });
  }

  if (!checkedIn) {
    score -= 5;
    adjustments.push({
      factor: "check_in",
      impact: -5,
      reason: "Check-in online ainda não confirmado.",
    });
  }

  if (kids) {
    score -= 5;
    adjustments.push({
      factor: "kids",
      impact: -5,
      reason: "Viagem com crianças aumenta variabilidade.",
    });
  }

  if (transport === "public") {
    score -= 5;
    adjustments.push({
      factor: "transport",
      impact: -5,
      reason: "Dependência de transporte público.",
    });
  }

  score = Math.max(0, Math.min(95, score));

  return {
    score,
    trustLevel: getTrustLevel(score),
    readiness:
      score >= 75 ? "ready" : score >= 50 ? "sensitive" : "fragile",
    adjustments,
  };
}

function buildTimeline({
  departureDate,
  leaveHomeDate,
  airportArrivalDate,
  checkInDate,
  securityDate,
  passportDate,
  gateDate,
  boardingDate,
  checkedIn,
  bags,
  fastTrack,
  priorityBoarding,
  flightType,
  checkInMinutes,
  securityMinutes,
  passportMinutes,
  gateWalkingMinutes,
  boardingBuffer,
  reliability,
}) {
  const timeline = [
    {
      step: "leave_home",
      title: "Sair de casa",
      recommendedTime: leaveHomeDate.toISOString(),
      category: "transport",
      confidenceScore: reliability.score,
      trustLevel: reliability.trustLevel,
      status: reliability.score < 45 ? "risk" : "buffer",
      source: "Journey Planning Engine",
      buffer: "Inclui rota, eventos e margem operacional",
      liveInsight: "Hora recomendada para iniciar a jornada até ao aeroporto.",
      reasoning:
        "Calculado de trás para a frente a partir da hora de partida, cruzando voo, aeroporto, transporte e perfil do passageiro.",
    },
    {
      step: "arrive_airport",
      title: "Chegar ao aeroporto",
      recommendedTime: airportArrivalDate.toISOString(),
      category: "airport",
      confidenceScore: reliability.score,
      trustLevel: reliability.trustLevel,
      status: "buffer",
      source: "Airport Intelligence + Journey Planning Engine",
      liveInsight: "Chegada ao aeroporto com margem antes dos passos críticos.",
      reasoning:
        "Inclui tempo para check-in/bag drop, segurança, eventual controlo de passaporte, deslocação interna e margem de embarque.",
    },
  ];

  if (!checkedIn || bags) {
    timeline.push({
      step: "checkin_bagdrop",
      title: bags ? "Check-in / Bag drop" : "Check-in",
      recommendedTime: checkInDate.toISOString(),
      category: "check-in",
      confidenceScore: checkedIn ? 75 : 62,
      trustLevel: checkedIn ? "high" : "medium",
      status: checkedIn ? "ready" : "buffer",
      source: "Passenger profile + Airline rules model",
      buffer: `${checkInMinutes} min`,
      liveInsight: checkedIn
        ? "Check-in online indicado como concluído."
        : "Check-in/bag drop ainda exige margem operacional.",
      reasoning: bags
        ? "Como existe bagagem de porão, a jornada inclui tempo para balcão ou bag drop."
        : "Como o check-in online não está confirmado, a jornada reserva margem para regularização.",
    });
  }

  timeline.push({
    step: "security",
    title: fastTrack ? "Segurança Fast Track" : "Segurança",
    recommendedTime: securityDate.toISOString(),
    category: "security",
    confidenceScore: fastTrack ? 72 : 60,
    trustLevel: fastTrack ? "medium" : "low",
    status: "buffer",
    source: "Airport Intelligence Engine",
    buffer: `${securityMinutes} min`,
    liveInsight: fastTrack
      ? "Fast Track reduz variabilidade, mas não elimina risco operacional."
      : "Segurança é uma das maiores fontes de variabilidade aeroportuária.",
    reasoning:
      "Tempo estimado com base no perfil interno do aeroporto e terminal, ainda sem fila live oficial.",
  });

  if (flightType === "passport") {
    timeline.push({
      step: "passport_control",
      title: "Controlo de passaporte",
      recommendedTime: passportDate.toISOString(),
      category: "passport",
      confidenceScore: 58,
      trustLevel: "low",
      status: "buffer",
      source: "Flight type model",
      buffer: `${passportMinutes} min`,
      liveInsight: "Voo com controlo de fronteira/passaporte considerado.",
      reasoning:
        "A timeline reserva tempo adicional para controlo documental antes da porta.",
    });
  }

  timeline.push({
    step: "gate_arrival",
    title: "Chegar à porta de embarque",
    recommendedTime: gateDate.toISOString(),
    category: "gate",
    confidenceScore: 65,
    trustLevel: "medium",
    status: "ready",
    source: "Gate timing model",
    buffer: `${boardingBuffer} min antes da partida`,
    liveInsight: priorityBoarding
      ? "Embarque prioritário permite margem ligeiramente menor."
      : "Chegada à porta recomendada com margem antes do embarque.",
    reasoning: `Inclui deslocação interna estimada de ${gateWalkingMinutes} min e margem de embarque.`,
  });

  timeline.push({
    step: "boarding",
    title: "Hora prevista de embarque",
    recommendedTime: boardingDate.toISOString(),
    category: "boarding",
    confidenceScore: 60,
    trustLevel: "medium",
    status: "ready",
    source: "Boarding buffer model",
    liveInsight: "Hora operacional alvo para estar pronto para embarcar.",
    reasoning:
      "Estimativa baseada na margem definida antes da partida; será melhorada com regras por companhia e gate real.",
  });

  timeline.push({
    step: "departure",
    title: "Partida do voo",
    recommendedTime: departureDate.toISOString(),
    category: "flight",
    confidenceScore: 70,
    trustLevel: "medium",
    status: "ready",
    source: "Flight Status Engine / fallback",
    liveInsight: "Hora usada como âncora da timeline operacional.",
    reasoning:
      "Todos os passos são calculados de trás para a frente a partir da hora prevista/estimada de partida.",
  });

  return timeline;
}

export default async function handler(req, res) {
  const flight = String(req.query.flight || "KL1578").toUpperCase();
  const origin = String(req.query.origin || "Lisboa");
  const airport = String(req.query.airport || "LIS").toUpperCase();
  const airline = String(req.query.airline || flight.slice(0, 2)).toUpperCase();
  const transport = String(req.query.transport || "public").toLowerCase();

  const bags = toBoolean(req.query.bags, true);
  const kids = toBoolean(req.query.kids, false);
  const checkedIn = toBoolean(req.query.checkedIn, false);
  const fastTrack = toBoolean(req.query.fastTrack, false);
  const priorityBoarding = toBoolean(req.query.priorityBoarding, false);
  const flightType = String(req.query.flightType || "passport");

  const fallbackDepartureTime =
    req.query.departureTime ||
    req.query.manualDepartureTime ||
    "2026-05-20T16:40:00+01:00";

  const BASE_URL = buildBaseUrl(req);

  const flightUrl =
    `${BASE_URL}/api/engines/flight-status-engine?flight=${encodeURIComponent(
      flight
    )}`;

  const airportUrl =
    `${BASE_URL}/api/engines/airport-intelligence-engine` +
    `?airport=${encodeURIComponent(airport)}` +
    `&airline=${encodeURIComponent(airline)}` +
    `&terminal=${encodeURIComponent(req.query.terminal || "1")}` +
    `&bags=${bags}` +
    `&kids=${kids}`;

  const routeUrl =
    `${BASE_URL}/api/engines/route-intelligence-engine` +
    `?origin=${encodeURIComponent(origin)}` +
    `&airport=${encodeURIComponent(airport)}` +
    `&mode=${encodeURIComponent(transport)}`;

  const eventUrl =
    `${BASE_URL}/api/engines/event-disruption-engine` +
    `?origin=${encodeURIComponent(origin)}` +
    `&airport=${encodeURIComponent(airport)}` +
    `&mode=${encodeURIComponent(transport)}` +
    `&flightDate=${encodeURIComponent(fallbackDepartureTime)}`;

  const [flightEngine, airportEngine, routeEngine, eventEngine] =
    await Promise.all([
      fetchJson(flightUrl),
      fetchJson(airportUrl),
      fetchJson(routeUrl),
      fetchJson(eventUrl),
    ]);

  const hasLiveFlightData = Boolean(flightEngine?.success);

  const flightData = hasLiveFlightData
    ? flightEngine.flight
    : buildFallbackFlight({
        flight,
        airport,
        airline,
        fallbackDepartureTime,
      });

  const departureTime = getFlightDepartureTime(
    flightData,
    fallbackDepartureTime
  );

  const departureDate = getValidDate(departureTime);

  if (!departureDate) {
    return res.status(200).json({
      success: false,
      engine: "Home2Flight Journey Planning Engine",
      version: "1.1.0-safe-fallback",
      error: "Flight departure time unavailable.",
      diagnostics: {
        flightEngineAvailable: hasLiveFlightData,
        fallbackDepartureTime,
      },
    });
  }

  const flightStatus = flightData?.status || "unknown";

  if (hasLiveFlightData && isFlightFinished(flightStatus, departureDate)) {
    return res.status(200).json({
      success: true,
      engine: "Home2Flight Journey Planning Engine",
      version: "1.1.0-safe-fallback",
      generatedAt: new Date().toISOString(),
      finishedFlight: true,
      uiSummary: {
        status: "good",
        headline: "Voo já concluído",
        shortMessage: "A janela operacional pré-voo já terminou.",
      },
      decision: {
        leaveHomeTime: null,
        airportArrivalTime: null,
        departureTime: departureDate.toISOString(),
        operationalStatus: "completed",
      },
      flight: flightData,
      flightIntelligence: flightEngine,
      reliability: {
        score: 95,
        trustLevel: "high",
        readiness: "completed",
      },
      timeline: [
        {
          step: "flight_finished",
          title: "Voo concluído",
          recommendedTime: departureDate.toISOString(),
          category: "flight",
          confidenceScore: flightEngine?.reliability?.confidenceScore || 82,
          trustLevel: "high",
          status: "ready",
          source: "Flight Status Engine",
          liveInsight:
            "Este voo já saiu ou terminou. A Home2Flight não gera recomendação pré-voo normal.",
          reasoning:
            "A recomendação pré-voo só é válida antes da janela operacional do voo.",
        },
      ],
    });
  }

  const airportOperational =
    airportEngine?.operationalIntelligence || {};

  const airportBuffer =
    airportOperational.recommendedAirportBuffer || 60;

  const routeMinutes =
    routeEngine?.route?.liveTrafficDurationMinutes ||
    routeEngine?.route?.baseDurationMinutes ||
    30;

  const routeBuffer =
    routeEngine?.route?.dynamicBufferMinutes ||
    (transport === "public" ? 25 : 15);

  const eventBuffer =
    eventEngine?.eventIntelligence?.totalExtraBufferMinutes || 0;

  const checkInMinutes = checkedIn ? 0 : bags ? 20 : 10;

  const baseSecurityMinutes =
    airportOperational.estimatedSecurityMinutes || 20;

  const securityMinutes = fastTrack
    ? Math.max(8, Math.round(baseSecurityMinutes * 0.55))
    : baseSecurityMinutes;

  const passportMinutes = flightType === "passport" ? 12 : 0;

  const boardingBuffer = priorityBoarding ? 12 : 20;

  const gateWalkingMinutes =
    airportOperational.estimatedWalkingMinutes || 10;

  const totalAirportFlow =
    checkInMinutes +
    securityMinutes +
    passportMinutes +
    gateWalkingMinutes +
    boardingBuffer;

  const airportTotal = Math.max(airportBuffer, totalAirportFlow);

  const totalBeforeDeparture =
    airportTotal + routeMinutes + routeBuffer + eventBuffer;

  const leaveHomeDate = subtractMinutes(
    departureDate,
    totalBeforeDeparture
  );

  const airportArrivalDate = subtractMinutes(
    departureDate,
    airportTotal
  );

  const checkInDate = addMinutes(
    airportArrivalDate,
    checkInMinutes
  );

  const securityDate = addMinutes(
    checkInDate,
    securityMinutes
  );

  const passportDate = addMinutes(
    securityDate,
    passportMinutes
  );

  const gateDate = subtractMinutes(
    departureDate,
    boardingBuffer
  );

  const boardingDate = subtractMinutes(
    departureDate,
    priorityBoarding ? 18 : 28
  );

  const reliability = calculateJourneyReliability({
    flightEngine,
    airportEngine,
    routeEngine,
    eventEngine,
    checkedIn,
    kids,
    transport,
  });

  const timeline = buildTimeline({
    departureDate,
    leaveHomeDate,
    airportArrivalDate,
    checkInDate,
    securityDate,
    passportDate,
    gateDate,
    boardingDate,
    checkedIn,
    bags,
    fastTrack,
    priorityBoarding,
    flightType,
    checkInMinutes,
    securityMinutes,
    passportMinutes,
    gateWalkingMinutes,
    boardingBuffer,
    reliability,
  });

  return res.status(200).json({
    success: true,
    engine: "Home2Flight Journey Planning Engine",
    version: "1.1.0-safe-fallback",
    generatedAt: new Date().toISOString(),

    journey: {
      origin,
      airport,
      flight,
      airline,
      transport,
      profile: {
        bags,
        kids,
        checkedIn,
        fastTrack,
        priorityBoarding,
        flightType,
      },
    },

    uiSummary: {
      status: getStatusFromReliability(reliability.score),
      headline:
        reliability.score >= 70
          ? "Plano operacional estável"
          : reliability.score >= 45
          ? "Plano com margem operacional sensível"
          : "Plano operacionalmente frágil",
      shortMessage:
        reliability.score >= 70
          ? "A jornada apresenta boa margem operacional."
          : reliability.score >= 45
          ? "A jornada exige atenção e buffers conservadores."
          : "Existem fatores de risco relevantes. Recomendada validação adicional.",
    },

    decision: {
      leaveHomeTime: leaveHomeDate.toISOString(),
      airportArrivalTime: airportArrivalDate.toISOString(),
      checkInTime: checkInDate.toISOString(),
      securityTime: securityDate.toISOString(),
      passportControlTime:
        flightType === "passport" ? passportDate.toISOString() : null,
      gateArrivalTime: gateDate.toISOString(),
      boardingTime: boardingDate.toISOString(),
      departureTime: departureDate.toISOString(),
      operationalStatus: getStatusFromReliability(reliability.score),
    },

    operationalFlow: {
      checkIn: {
        required: !checkedIn || bags,
        checkedInOnline: checkedIn,
        bags,
        recommendedTime: checkInDate.toISOString(),
        estimatedMinutes: checkInMinutes,
      },
      security: {
        fastTrack,
        recommendedTime: securityDate.toISOString(),
        estimatedMinutes: securityMinutes,
      },
      passportControl: {
        required: flightType === "passport",
        recommendedTime:
          flightType === "passport" ? passportDate.toISOString() : null,
        estimatedMinutes: passportMinutes,
      },
      gateArrival: {
        recommendedTime: gateDate.toISOString(),
        walkingMinutes: gateWalkingMinutes,
        priorityBoarding,
        boardingBuffer,
      },
      boarding: {
        recommendedTime: boardingDate.toISOString(),
      },
    },

    buffers: {
      airportBuffer,
      routeBuffer,
      eventBuffer,
      totalAirportFlow,
      totalBeforeDeparture,
    },

    reliability,

    flight: flightData,
    flightIntelligence: flightEngine,
    airportIntelligence: airportEngine,
    routeIntelligence: routeEngine,
    eventDisruptionIntelligence: eventEngine,

    sources: {
      flight: hasLiveFlightData
        ? flightEngine?.reliability
        : {
            sourceType: "manual_or_safe_fallback",
            liveDataActive: false,
            limitations: [
              "AviationStack indisponível ou limite mensal atingido.",
              "Hora de partida obtida por fallback manual.",
            ],
          },
      airport: airportOperational || null,
      route: routeEngine?.reliability || null,
      events: eventEngine?.eventIntelligence || null,
    },

    timeline,
  });
}