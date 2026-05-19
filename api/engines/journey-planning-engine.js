// /api/engines/journey-planning-engine.js
async function fetchJson(url, timeoutMs = 7000) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

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

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return String(value) === "true";
}

function toIso(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function subtractMinutes(date, minutes) {
  return new Date(date.getTime() - minutes * 60000);
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function getFlightDepartureTime({ flightEngine, manualDepartureTime }) {
  const flightData = flightEngine?.flight;

  const liveDeparture =
    flightData?.departure?.estimated ||
    flightData?.departure?.scheduled;

  if (liveDeparture) {
    return {
      departureTime: liveDeparture,
      source: "live_flight_data",
      liveFlightUsed: true,
    };
  }

  if (manualDepartureTime) {
    return {
      departureTime: manualDepartureTime,
      source: "manual_fallback_time",
      liveFlightUsed: false,
    };
  }

  return {
    departureTime: null,
    source: "unavailable",
    liveFlightUsed: false,
  };
}

function buildFallbackFlight({
  flight,
  airport,
  airline,
  terminal,
  departureTime,
}) {
  return {
    number: flight,
    icao: null,
    airline: {
      name: airline,
      code: airline,
    },
    status: "scheduled_fallback",
    providerStatusRaw: "fallback",
    route: {
      from: {
        code: airport,
        icao: null,
        name: "Origem",
        timezone: null,
      },
      to: {
        code: null,
        icao: null,
        name: "Destino",
        timezone: null,
      },
    },
    departure: {
      scheduled: departureTime,
      estimated: departureTime,
      actual: null,
      delayMinutes: null,
      terminal,
      gate: null,
    },
    arrival: {
      scheduled: null,
      estimated: null,
      actual: null,
      delayMinutes: null,
      gate: null,
      terminal: null,
    },
  };
}

function calculateReliability({
  usedLiveFlightData,
  airportEngine,
  routeEngine,
  eventEngine,
  checkedIn,
  kids,
  transport,
  bags,
  fastTrack,
  priorityBoarding,
}) {
  let score = 82;
  const adjustments = [];

  if (!usedLiveFlightData) {
    score -= 18;
    adjustments.push({
      factor: "flight_status",
      impact: -18,
      reason: "Dados reais de voo indisponíveis. Aplicado fallback conservador.",
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
    routeEngine?.operationalProfile?.routeRiskLevel || "low";

  if (routeRisk === "medium") {
    score -= 8;
    adjustments.push({
      factor: "route_intelligence",
      impact: -8,
      reason: "Rota com risco operacional médio.",
    });
  }

  if (routeRisk === "high") {
    score -= 15;
    adjustments.push({
      factor: "route_intelligence",
      impact: -15,
      reason: "Rota com risco operacional elevado.",
    });
  }

  const eventRisk =
    eventEngine?.eventIntelligence?.eventRisk || "medium";

  if (eventRisk === "medium") {
    score -= 8;
    adjustments.push({
      factor: "event_disruption",
      impact: -8,
      reason: "Eventos/disrupções exigem monitorização adicional.",
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

  if (bags) {
    score -= 4;
    adjustments.push({
      factor: "bags",
      impact: -4,
      reason: "Bagagem de porão aumenta dependência de bag drop.",
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

  if (fastTrack) {
    score += 4;
    adjustments.push({
      factor: "fast_track",
      impact: 4,
      reason: "Fast track reduz variabilidade na segurança.",
    });
  }

  if (priorityBoarding) {
    score += 2;
    adjustments.push({
      factor: "priority_boarding",
      impact: 2,
      reason: "Embarque prioritário reduz margem necessária antes do embarque.",
    });
  }

  score = Math.max(0, Math.min(95, score));

  return {
    score,
    trustLevel: score >= 75 ? "high" : score >= 50 ? "medium" : "low",
    readiness: score >= 75 ? "ready" : score >= 50 ? "sensitive" : "fragile",
    adjustments,
  };
}

export default async function handler(req, res) {
  const flight = String(req.query.flight || "KL1578").toUpperCase();
  const origin = String(req.query.origin || "Lisboa");
  const airport = String(req.query.airport || "LIS").toUpperCase();
  const airline = String(req.query.airline || flight.slice(0, 2)).toUpperCase();
  const terminal = String(req.query.terminal || "1");
  const transport = String(req.query.transport || "public").toLowerCase();

  const bags = parseBoolean(req.query.bags, true);
  const kids = parseBoolean(req.query.kids, false);
  const checkedIn = parseBoolean(req.query.checkedIn, false);
  const fastTrack = parseBoolean(req.query.fastTrack, false);
  const priorityBoarding = parseBoolean(req.query.priorityBoarding, false);

  const flightType = String(req.query.flightType || "passport");
  const forceManualTime = parseBoolean(req.query.forceManualTime, false);
  const manualDepartureTime = forceManualTime
    ? String(req.query.departureTime || "")
    : null;

  const BASE_URL = buildBaseUrl(req);

  const flightUrl =
    `${BASE_URL}/api/engines/flight-status-engine?flight=${encodeURIComponent(
      flight
    )}`;

  const airportUrl =
    `${BASE_URL}/api/engines/airport-intelligence-engine` +
    `?airport=${encodeURIComponent(airport)}` +
    `&airline=${encodeURIComponent(airline)}` +
    `&terminal=${encodeURIComponent(terminal)}` +
    `&bags=${bags}` +
    `&kids=${kids}` +
    `&checkedIn=${checkedIn}`;

  const routeUrl =
    `${BASE_URL}/api/engines/route-intelligence-engine` +
    `?origin=${encodeURIComponent(origin)}` +
    `&airport=${encodeURIComponent(airport)}` +
    `&mode=${encodeURIComponent(transport)}`;

  const eventUrl =
    `${BASE_URL}/api/engines/event-disruption-engine` +
    `?origin=${encodeURIComponent(origin)}` +
    `&airport=${encodeURIComponent(airport)}` +
    `&mode=${encodeURIComponent(transport)}`;

  const [flightEngine, airportEngine, routeEngine, eventEngine] =
    await Promise.all([
      fetchJson(flightUrl),
      fetchJson(airportUrl),
      fetchJson(routeUrl),
      fetchJson(eventUrl),
    ]);

  const departureResolution = getFlightDepartureTime({
    flightEngine,
    manualDepartureTime,
  });

  if (!departureResolution.departureTime) {
    return res.status(200).json({
      success: false,
      engine: "Home2Flight Journey Planning Engine",
      version: "1.3.0-user-flow-fixed",
      error:
        "Flight departure time unavailable. Enable manual time or use a flight with available live data.",
      diagnostics: {
        flightEngineAvailable: Boolean(flightEngine?.success),
        flightUrl,
      },
    });
  }

  const departureDate = new Date(departureResolution.departureTime);

  if (Number.isNaN(departureDate.getTime())) {
    return res.status(200).json({
      success: false,
      engine: "Home2Flight Journey Planning Engine",
      version: "1.3.0-user-flow-fixed",
      error: "Invalid departure time.",
    });
  }

  const flightData =
    flightEngine?.flight ||
    buildFallbackFlight({
      flight,
      airport,
      airline,
      terminal,
      departureTime: departureResolution.departureTime,
    });

  const airportInfo =
    airportEngine?.operationalIntelligence || {};

  const routeInfo = routeEngine?.route || {};

  const eventInfo = eventEngine?.eventIntelligence || {};

  const baseRouteMinutes =
    routeInfo.liveTrafficDurationMinutes ||
    routeInfo.baseDurationMinutes ||
    30;

  const routeBuffer =
    routeInfo.dynamicBufferMinutes ??
    (transport === "public" ? 25 : transport === "uber" ? 18 : 15);

  const eventBuffer =
    eventInfo.totalExtraBufferMinutes || 0;

  const securityMinutes = fastTrack
    ? 10
    : airportInfo.estimatedSecurityMinutes || 20;

  const walkingMinutes =
    airportInfo.estimatedWalkingMinutes || 12;

  const passportMinutes =
    flightType === "passport" ? 12 : 0;

  const checkInMinutes = checkedIn
    ? bags
      ? 12
      : 0
    : bags
    ? 25
    : 15;

  const kidsExtraMinutes = kids ? 12 : 0;

  const airportEntryBuffer = 10 + kidsExtraMinutes;

  const boardingBeforeDepartureMinutes = priorityBoarding ? 22 : 28;

  const gateReadyBuffer = priorityBoarding ? 6 : 12;

  const boardingDate = subtractMinutes(
    departureDate,
    boardingBeforeDepartureMinutes
  );

  const gateArrivalDate = subtractMinutes(
    boardingDate,
    gateReadyBuffer
  );

  const passportDate = subtractMinutes(
    gateArrivalDate,
    walkingMinutes + passportMinutes
  );

  const securityDate = subtractMinutes(
    passportDate,
    securityMinutes
  );

  const checkInDate = subtractMinutes(
    securityDate,
    checkInMinutes
  );

  const airportArrivalDate = subtractMinutes(
    checkInDate,
    airportEntryBuffer
  );

  const leaveHomeDate = subtractMinutes(
    airportArrivalDate,
    baseRouteMinutes + routeBuffer + eventBuffer
  );

  const totalAirportFlow =
    airportEntryBuffer +
    checkInMinutes +
    securityMinutes +
    passportMinutes +
    walkingMinutes +
    gateReadyBuffer +
    boardingBeforeDepartureMinutes;

  const totalBeforeDeparture =
    totalAirportFlow +
    baseRouteMinutes +
    routeBuffer +
    eventBuffer;

  const reliability = calculateReliability({
    usedLiveFlightData: departureResolution.liveFlightUsed,
    airportEngine,
    routeEngine,
    eventEngine,
    checkedIn,
    kids,
    transport,
    bags,
    fastTrack,
    priorityBoarding,
  });

  const operationalStatus =
    reliability.score >= 70
      ? "stable"
      : reliability.score >= 45
      ? "sensitive"
      : "fragile";

  return res.status(200).json({
    success: true,
    engine: "Home2Flight Journey Planning Engine",
    version: "1.3.0-user-flow-fixed",
    generatedAt: new Date().toISOString(),

    journey: {
      origin,
      airport,
      flight,
      airline,
      terminal,
      transport,
      profile: {
        bags,
        kids,
        checkedIn,
        fastTrack,
        priorityBoarding,
        flightType,
        forceManualTime,
      },
    },

    decision: {
      leaveHomeTime: leaveHomeDate.toISOString(),
      airportArrivalTime: airportArrivalDate.toISOString(),
      checkInTime: checkInDate.toISOString(),
      securityTime: securityDate.toISOString(),
      passportControlTime: passportDate.toISOString(),
      gateArrivalTime: gateArrivalDate.toISOString(),
      boardingTime: boardingDate.toISOString(),
      departureTime: departureDate.toISOString(),
      operationalStatus,
    },

    operationalFlow: {
      transport: {
        routeMinutes: baseRouteMinutes,
        routeBuffer,
        eventBuffer,
      },
      airportArrival: {
        recommendedTime: airportArrivalDate.toISOString(),
        airportEntryBuffer,
      },
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
        recommendedTime: passportDate.toISOString(),
        estimatedMinutes: passportMinutes,
      },
      gateArrival: {
        recommendedTime: gateArrivalDate.toISOString(),
        walkingMinutes,
        gateReadyBuffer,
      },
      boarding: {
        priorityBoarding,
        recommendedTime: boardingDate.toISOString(),
        boardingBeforeDepartureMinutes,
      },
    },

    buffers: {
      airportEntryBuffer,
      routeBuffer,
      eventBuffer,
      kidsExtraMinutes,
      totalAirportFlow,
      totalBeforeDeparture,
      gateReadyBuffer,
      boardingBeforeDepartureMinutes,
    },

    reliability,

    flight: flightData,
    flightIntelligence:
      flightEngine || {
        success: false,
        provider: {
          name: departureResolution.source,
          reachable: false,
          liveDataActive: false,
        },
      },

    airportIntelligence: airportEngine,
    routeIntelligence: routeEngine,
    eventDisruptionIntelligence: eventEngine,

    sources: {
      flight: {
        sourceType: departureResolution.source,
        liveDataActive: departureResolution.liveFlightUsed,
      },
      airport: airportInfo,
      route: routeEngine?.reliability || null,
      events: eventInfo,
    },

    timeline: [
      {
        step: "leave_home",
        title: "Sair de casa",
        recommendedTime: leaveHomeDate.toISOString(),
        category: "transport",
        confidenceScore: reliability.score,
        trustLevel: reliability.trustLevel,
        status: "buffer",
        source: "Journey Planning Engine",
        buffer: `+${routeBuffer + eventBuffer} min`,
        liveInsight:
          "Hora recomendada para iniciar a jornada até ao aeroporto.",
        reasoning:
          "Calculado a partir da hora de partida, rota, perfil do passageiro e margem operacional.",
        operationalSignals: [],
      },
      {
        step: "arrive_airport",
        title: "Chegar ao aeroporto",
        recommendedTime: airportArrivalDate.toISOString(),
        category: "airport",
        confidenceScore:
          airportInfo.confidenceScore || 55,
        trustLevel: "medium",
        status: "buffer",
        source: "Airport Intelligence Engine",
        liveInsight:
          airportEngine?.layers?.airportProfile?.reasoning?.[0] ||
          "Chegada ao aeroporto calculada com margem conservadora.",
        reasoning:
          "Inclui margem antes dos passos críticos: check-in, segurança, controlo documental e porta.",
        operationalSignals: [],
      },
      {
        step: checkedIn ? "bagdrop" : "checkin_bagdrop",
        title: checkedIn ? "Bag drop" : bags ? "Check-in / Bag drop" : "Check-in",
        recommendedTime: checkInDate.toISOString(),
        category: "check-in",
        confidenceScore: 62,
        trustLevel: "medium",
        status: "buffer",
        source: "Passenger profile model",
        buffer: `${checkInMinutes} min`,
        liveInsight: checkedIn
          ? bags
            ? "Check-in online confirmado. Mantida margem para bag drop."
            : "Check-in online confirmado. Passo reduzido."
          : "Check-in/bag drop ainda exige margem operacional.",
        reasoning:
          "Tempo ajustado em função de check-in online e bagagem de porão.",
        operationalSignals: [],
      },
      {
        step: "security",
        title: "Segurança",
        recommendedTime: securityDate.toISOString(),
        category: "security",
        confidenceScore: 60,
        trustLevel: "medium",
        status: "buffer",
        source: "Airport Intelligence Engine",
        buffer: `${securityMinutes} min`,
        liveInsight: fastTrack
          ? "Fast track ativo. Tempo de segurança reduzido."
          : "Segurança é uma das maiores fontes de variabilidade aeroportuária.",
        reasoning:
          "Tempo estimado com base no perfil do aeroporto, terminal e opção fast track.",
        operationalSignals: [],
      },
      {
        step: "passport_control",
        title: "Controlo de passaporte",
        recommendedTime: passportDate.toISOString(),
        category: "passport",
        confidenceScore: 58,
        trustLevel: "medium",
        status: flightType === "passport" ? "buffer" : "skipped",
        source: "Flight type model",
        buffer: `${passportMinutes} min`,
        liveInsight:
          flightType === "passport"
            ? "Voo com controlo de fronteira/passaporte considerado."
            : "Sem controlo de passaporte adicional nesta jornada.",
        reasoning:
          "Tempo ajustado ao tipo de voo selecionado.",
        operationalSignals: [],
      },
      {
        step: "gate_arrival",
        title: "Chegar à porta de embarque",
        recommendedTime: gateArrivalDate.toISOString(),
        category: "gate",
        confidenceScore: 65,
        trustLevel: "medium",
        status: "ready",
        source: "Gate timing model",
        buffer: `${gateReadyBuffer} min antes do embarque`,
        liveInsight:
          "Chegada à porta recomendada antes da abertura provável do embarque.",
        reasoning:
          "Inclui deslocação interna e margem para estar pronto antes do embarque.",
        operationalSignals: [],
      },
      {
        step: "boarding",
        title: "Hora prevista de embarque",
        recommendedTime: boardingDate.toISOString(),
        category: "boarding",
        confidenceScore: 60,
        trustLevel: "medium",
        status: "ready",
        source: "Boarding buffer model",
        buffer: `${boardingBeforeDepartureMinutes} min antes da partida`,
        liveInsight: priorityBoarding
          ? "Embarque prioritário ativo. Margem de embarque reduzida."
          : "Hora operacional alvo para início provável de embarque.",
        reasoning:
          "Estimativa baseada em prioridade de embarque, companhia e margem antes da partida.",
        operationalSignals: [],
      },
      {
        step: "departure",
        title: "Partida do voo",
        recommendedTime: departureDate.toISOString(),
        category: "flight",
        confidenceScore: departureResolution.liveFlightUsed ? 82 : 55,
        trustLevel: departureResolution.liveFlightUsed ? "high" : "medium",
        status: "ready",
        source: departureResolution.liveFlightUsed
          ? "Flight Status Engine"
          : "Manual fallback",
        liveInsight:
          "Hora usada como âncora da timeline operacional.",
        reasoning:
          "Todos os passos são calculados de trás para a frente a partir da hora prevista/estimada de partida.",
        operationalSignals: [],
      },
    ],

    diagnostics: {
      usedLiveFlightData: departureResolution.liveFlightUsed,
      departureSource: departureResolution.source,
      airportEngineSuccess: Boolean(airportEngine?.success),
      routeEngineSuccess: Boolean(routeEngine?.success),
      eventEngineSuccess: Boolean(eventEngine?.success),
      urls: {
        flightUrl,
        airportUrl,
        routeUrl,
        eventUrl,
      },
    },
  });
}