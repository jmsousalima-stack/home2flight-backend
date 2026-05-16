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
      return {
        success: false,
        _fetchError: `HTTP ${response.status}`,
        _url: url,
      };
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeout);

    return {
      success: false,
      _fetchError: error?.name === "AbortError" ? "timeout" : error.message,
      _url: url,
    };
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

function getTrustLevel(score) {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function getStatusFromReliability(score) {
  if (score >= 70) return "stable";
  if (score >= 45) return "sensitive";
  return "fragile";
}

function getHeadlineFromReliability(score) {
  if (score >= 70) {
    return {
      headline: "Plano operacional estável",
      shortMessage: "A jornada apresenta boa margem operacional.",
    };
  }

  if (score >= 45) {
    return {
      headline: "Plano com margem operacional sensível",
      shortMessage: "A jornada exige atenção e buffers conservadores.",
    };
  }

  return {
    headline: "Plano operacionalmente frágil",
    shortMessage:
      "Existem fatores de risco relevantes. Recomendada validação adicional.",
  };
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

function buildFallbackFlight({
  flight,
  airport,
  airline,
  fallbackDepartureTime,
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
      reason:
        "Dados reais de voo indisponíveis. Aplicado fallback conservador.",
    });
  } else if ((flightEngine?.reliability?.score || 0) < 55) {
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

  if (!airportEngine?.success) {
    score -= 14;
    adjustments.push({
      factor: "airport_intelligence",
      impact: -14,
      reason:
        "Motor aeroportuário indisponível. Aplicado perfil conservador.",
    });
  } else if (airportRisk === "medium") {
    score -= 12;
    adjustments.push({
      factor: "airport_intelligence",
      impact: -12,
      reason: "Aeroporto avaliado com risco operacional médio.",
    });
  } else if (airportRisk === "high" || airportRisk === "critical") {
    score -= 22;
    adjustments.push({
      factor: "airport_intelligence",
      impact: -22,
      reason: "Aeroporto avaliado com risco operacional elevado.",
    });
  }

  const routeRisk =
    routeEngine?.operationalProfile?.routeRiskLevel || "unknown";

  if (!routeEngine?.success) {
    score -= 8;
    adjustments.push({
      factor: "route_intelligence",
      impact: -8,
      reason: "Motor de rota indisponível. Aplicado buffer conservador.",
    });
  } else if (routeRisk === "medium") {
    score -= 8;
    adjustments.push({
      factor: "route_intelligence",
      impact: -8,
      reason: "Rota com variabilidade moderada.",
    });
  } else if (routeRisk === "high") {
    score -= 15;
    adjustments.push({
      factor: "route_intelligence",
      impact: -15,
      reason: "Rota com risco elevado.",
    });
  }

  const eventRisk =
    eventEngine?.eventIntelligence?.eventRisk || "unknown";

  if (!eventEngine?.success) {
    score -= 4;
    adjustments.push({
      factor: "event_disruption",
      impact: -4,
      reason:
        "Motor de eventos indisponível. Mantida monitorização conservadora.",
    });
  } else if (eventRisk === "medium") {
    score -= 8;
    adjustments.push({
      factor: "event_disruption",
      impact: -8,
      reason: "Eventos/disrupções exigem monitorização adicional.",
    });
  } else if (eventRisk === "high") {
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
  checkInStartDate,
  securityStartDate,
  passportStartDate,
  gateArrivalDate,
  boardingStartDate,
  checkedIn,
  bags,
  fastTrack,
  priorityBoarding,
  flightType,
  routeMinutes,
  routeBuffer,
  eventBuffer,
  checkInMinutes,
  securityMinutes,
  passportMinutes,
  gateWalkingMinutes,
  gateReadyBuffer,
  reliability,
  airportEngine,
  routeEngine,
  eventEngine,
}) {
  const timeline = [];

  timeline.push({
    step: "leave_home",
    title: "Sair de casa",
    recommendedTime: leaveHomeDate.toISOString(),
    category: "transport",
    confidenceScore: Math.max(40, reliability.score),
    trustLevel: reliability.trustLevel,
    status: reliability.score < 45 ? "risk" : "buffer",
    source: routeEngine?.success
      ? routeEngine?.reliability?.sourceType || "Route Intelligence Engine"
      : "Journey Planning Engine fallback",
    buffer: `+${routeBuffer + eventBuffer} min`,
    liveInsight: "Hora recomendada para iniciar a jornada até ao aeroporto.",
    reasoning: `Calculado com ${routeMinutes} min de trajeto, ${routeBuffer} min de buffer de transporte e ${eventBuffer} min de eventos/disrupções.`,
    operationalSignals: [
      ...(routeEngine?.intelligenceFlags || []),
      ...(eventEngine?.operationalSignals || []).filter((signal) =>
        signal?.affects?.includes("leave_home_time")
      ),
    ],
  });

  timeline.push({
    step: "arrive_airport",
    title: "Chegar ao aeroporto",
    recommendedTime: airportArrivalDate.toISOString(),
    category: "airport",
    confidenceScore:
      airportEngine?.operationalIntelligence?.confidenceScore ||
      Math.max(40, reliability.score),
    trustLevel:
      airportEngine?.operationalIntelligence?.confidenceLevel === "low"
        ? "low"
        : reliability.trustLevel,
    status: "buffer",
    source: airportEngine?.success
      ? airportEngine?.operationalIntelligence?.sourceType ||
        "Airport Intelligence Engine"
      : "Airport fallback model",
    liveInsight:
      airportEngine?.reasoning?.[0] ||
      "Chegada ao aeroporto calculada com margem conservadora.",
    reasoning:
      "Chegada ao aeroporto antes dos passos críticos: check-in/bag drop, segurança, passaporte e porta.",
    operationalSignals: airportEngine?.intelligenceFlags || [],
  });

  if (!checkedIn || bags) {
    timeline.push({
      step: "checkin_bagdrop",
      title: bags ? "Check-in / Bag drop" : "Check-in",
      recommendedTime: checkInStartDate.toISOString(),
      category: "check-in",
      confidenceScore: checkedIn ? 75 : 62,
      trustLevel: checkedIn ? "high" : "medium",
      status: checkedIn ? "ready" : "buffer",
      source: "Passenger profile + airline rules model",
      buffer: `${checkInMinutes} min`,
      liveInsight: checkedIn
        ? "Check-in online indicado como concluído."
        : "Check-in/bag drop ainda exige margem operacional.",
      reasoning: bags
        ? "Como existe bagagem de porão, a jornada inclui tempo para balcão ou bag drop."
        : "Como o check-in online não está confirmado, a jornada reserva margem para regularização.",
      operationalSignals: !checkedIn
        ? [
            {
              type: "checkin_pending",
              label: "Check-in online por confirmar",
              severity: "medium",
            },
          ]
        : [],
    });
  }

  timeline.push({
    step: "security",
    title: fastTrack ? "Segurança Fast Track" : "Segurança",
    recommendedTime: securityStartDate.toISOString(),
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
      "Tempo estimado com base no perfil do aeroporto e terminal, ainda sem fila live oficial.",
    operationalSignals:
      airportEngine?.layers?.securityIntelligence?.flags || [],
  });

  if (flightType === "passport") {
    timeline.push({
      step: "passport_control",
      title: "Controlo de passaporte",
      recommendedTime: passportStartDate.toISOString(),
      category: "passport",
      confidenceScore: 58,
      trustLevel: "low",
      status: "buffer",
      source: "Flight type model",
      buffer: `${passportMinutes} min`,
      liveInsight: "Voo com controlo de fronteira/passaporte considerado.",
      reasoning:
        "A timeline reserva tempo adicional para controlo documental antes da porta.",
      operationalSignals: [],
    });
  }

  timeline.push({
    step: "gate_arrival",
    title: "Chegar à porta de embarque",
    recommendedTime: gateArrivalDate.toISOString(),
    category: "gate",
    confidenceScore: 65,
    trustLevel: "medium",
    status: "ready",
    source: "Gate timing model",
    buffer: `${gateReadyBuffer} min antes do embarque`,
    liveInsight: priorityBoarding
      ? "Embarque prioritário permite margem ligeiramente menor."
      : "Chegada à porta recomendada antes da abertura provável do embarque.",
    reasoning: `Inclui deslocação interna estimada de ${gateWalkingMinutes} min e margem para estar pronto antes do embarque.`,
    operationalSignals: [],
  });

  timeline.push({
    step: "boarding",
    title: "Hora prevista de embarque",
    recommendedTime: boardingStartDate.toISOString(),
    category: "boarding",
    confidenceScore: 60,
    trustLevel: "medium",
    status: "ready",
    source: "Boarding buffer model",
    liveInsight: "Hora operacional alvo para início provável de embarque.",
    reasoning:
      "Estimativa baseada na margem antes da partida; será melhorada com regras por companhia, terminal e gate real.",
    operationalSignals: [],
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
    operationalSignals: [],
  });

  return timeline;
}

export default async function handler(req, res) {
  const flight = String(req.query.flight || "KL1578").toUpperCase();
  const origin = String(req.query.origin || "Lisboa");
  const airport = String(req.query.airport || "LIS").toUpperCase();
  const airline = String(req.query.airline || flight.slice(0, 2)).toUpperCase();
  const terminal = String(req.query.terminal || "1");
  const transport = String(req.query.transport || "public").toLowerCase();

  const bags = toBoolean(req.query.bags, true);
  const kids = toBoolean(req.query.kids, false);
  const checkedIn = toBoolean(req.query.checkedIn, false);
  const fastTrack = toBoolean(req.query.fastTrack, false);
  const priorityBoarding = toBoolean(req.query.priorityBoarding, false);
  const forceManualTime = toBoolean(req.query.forceManualTime, false);
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
    `&terminal=${encodeURIComponent(terminal)}` +
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

  const [flightEngineRaw, airportEngine, routeEngine, eventEngine] =
    await Promise.all([
      fetchJson(flightUrl),
      fetchJson(airportUrl),
      fetchJson(routeUrl),
      fetchJson(eventUrl),
    ]);

  const hasLiveFlightData = Boolean(flightEngineRaw?.success) && !forceManualTime;

  const flightEngine = forceManualTime
    ? {
        success: false,
        provider: {
          name: "manual_time_override",
          reachable: false,
          liveDataActive: false,
        },
        reliability: {
          score: 55,
          confidenceScore: 55,
          trustLevel: "medium",
          sourceType: "manual_time_override",
          liveDataActive: false,
          limitations: [
            "Hora de partida forçada manualmente para teste ou fallback.",
          ],
        },
        operationalSignals: [
          {
            type: "manual_time_override",
            label: "Hora manual usada",
            severity: "medium",
          },
        ],
      }
    : flightEngineRaw;

  const flightData = hasLiveFlightData
    ? flightEngineRaw.flight
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
      version: "1.2.0-core-flow-corrected",
      error: "Flight departure time unavailable.",
      diagnostics: {
        flightEngineAvailable: hasLiveFlightData,
        fallbackDepartureTime,
        urls: {
          flightUrl,
          airportUrl,
          routeUrl,
          eventUrl,
        },
      },
    });
  }

  const flightStatus = flightData?.status || "unknown";

  if (hasLiveFlightData && isFlightFinished(flightStatus, departureDate)) {
    return res.status(200).json({
      success: true,
      engine: "Home2Flight Journey Planning Engine",
      version: "1.2.0-core-flow-corrected",
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
      flightIntelligence: flightEngineRaw,
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
          confidenceScore: flightEngineRaw?.reliability?.confidenceScore || 82,
          trustLevel: "high",
          status: "ready",
          source: "Flight Status Engine",
          liveInsight:
            "Este voo já saiu ou terminou. A Home2Flight não gera recomendação pré-voo normal.",
          reasoning:
            "A recomendação pré-voo só é válida antes da janela operacional do voo.",
        },
      ],
      diagnostics: {
        usedLiveFlightData: true,
        urls: {
          flightUrl,
          airportUrl,
          routeUrl,
          eventUrl,
        },
      },
    });
  }

  const airportOperational = airportEngine?.operationalIntelligence || {};

  const airportBuffer = airportOperational.recommendedAirportBuffer || 60;

  const routeMinutes =
    routeEngine?.route?.liveTrafficDurationMinutes ||
    routeEngine?.route?.baseDurationMinutes ||
    30;

  const routeBuffer =
    routeEngine?.route?.dynamicBufferMinutes ||
    (transport === "public" ? 25 : 15);

  const eventBuffer =
    eventEngine?.eventIntelligence?.totalExtraBufferMinutes || 0;

  const checkInMinutes = checkedIn ? (bags ? 12 : 0) : bags ? 20 : 10;

  const baseSecurityMinutes =
    airportOperational.estimatedSecurityMinutes || 20;

  const securityMinutes = fastTrack
    ? Math.max(8, Math.round(baseSecurityMinutes * 0.55))
    : baseSecurityMinutes;

  const passportMinutes = flightType === "passport" ? 12 : 0;

  const gateWalkingMinutes = airportOperational.estimatedWalkingMinutes || 10;

  const boardingBeforeDepartureMinutes = priorityBoarding ? 35 : 28;

  const gateReadyBuffer = priorityBoarding ? 8 : 12;

  const boardingStartDate = subtractMinutes(
    departureDate,
    boardingBeforeDepartureMinutes
  );

  const gateArrivalDate = subtractMinutes(boardingStartDate, gateReadyBuffer);

  const passportStartDate =
    flightType === "passport"
      ? subtractMinutes(gateArrivalDate, passportMinutes)
      : gateArrivalDate;

  const securityStartDate = subtractMinutes(
    passportStartDate,
    securityMinutes
  );

  const checkInStartDate = subtractMinutes(
    securityStartDate,
    checkInMinutes
  );

  const airportArrivalDate = subtractMinutes(checkInStartDate, 10);

  const leaveHomeDate = subtractMinutes(
    airportArrivalDate,
    routeMinutes + routeBuffer + eventBuffer
  );

  const totalAirportFlow = Math.round(
    (departureDate.getTime() - airportArrivalDate.getTime()) / 60000
  );

  const totalBeforeDeparture = Math.round(
    (departureDate.getTime() - leaveHomeDate.getTime()) / 60000
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

  const { headline, shortMessage } = getHeadlineFromReliability(
    reliability.score
  );

  const timeline = buildTimeline({
    departureDate,
    leaveHomeDate,
    airportArrivalDate,
    checkInStartDate,
    securityStartDate,
    passportStartDate,
    gateArrivalDate,
    boardingStartDate,
    checkedIn,
    bags,
    fastTrack,
    priorityBoarding,
    flightType,
    routeMinutes,
    routeBuffer,
    eventBuffer,
    checkInMinutes,
    securityMinutes,
    passportMinutes,
    gateWalkingMinutes,
    gateReadyBuffer,
    reliability,
    airportEngine,
    routeEngine,
    eventEngine,
  });

  return res.status(200).json({
    success: true,
    engine: "Home2Flight Journey Planning Engine",
    version: "1.2.0-core-flow-corrected",
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

    uiSummary: {
      status: getStatusFromReliability(reliability.score),
      headline,
      shortMessage,
    },

    decision: {
      leaveHomeTime: leaveHomeDate.toISOString(),
      airportArrivalTime: airportArrivalDate.toISOString(),
      checkInTime: checkInStartDate.toISOString(),
      securityTime: securityStartDate.toISOString(),
      passportControlTime:
        flightType === "passport" ? passportStartDate.toISOString() : null,
      gateArrivalTime: gateArrivalDate.toISOString(),
      boardingTime: boardingStartDate.toISOString(),
      departureTime: departureDate.toISOString(),
      operationalStatus: getStatusFromReliability(reliability.score),
    },

    operationalFlow: {
      transport: {
        routeMinutes,
        routeBuffer,
        eventBuffer,
      },
      airportArrival: {
        recommendedTime: airportArrivalDate.toISOString(),
        airportBuffer,
      },
      checkIn: {
        required: !checkedIn || bags,
        checkedInOnline: checkedIn,
        bags,
        recommendedTime: checkInStartDate.toISOString(),
        estimatedMinutes: checkInMinutes,
      },
      security: {
        fastTrack,
        recommendedTime: securityStartDate.toISOString(),
        estimatedMinutes: securityMinutes,
      },
      passportControl: {
        required: flightType === "passport",
        recommendedTime:
          flightType === "passport" ? passportStartDate.toISOString() : null,
        estimatedMinutes: passportMinutes,
      },
      gateArrival: {
        recommendedTime: gateArrivalDate.toISOString(),
        walkingMinutes: gateWalkingMinutes,
        gateReadyBuffer,
      },
      boarding: {
        priorityBoarding,
        recommendedTime: boardingStartDate.toISOString(),
        boardingBeforeDepartureMinutes,
      },
    },

    buffers: {
      airportBuffer,
      routeBuffer,
      eventBuffer,
      totalAirportFlow,
      totalBeforeDeparture,
      gateReadyBuffer,
      boardingBeforeDepartureMinutes,
    },

    reliability,

    flight: flightData,
    flightIntelligence: flightEngine,
    airportIntelligence: airportEngine,
    routeIntelligence: routeEngine,
    eventDisruptionIntelligence: eventEngine,

    sources: {
      flight: hasLiveFlightData
        ? flightEngineRaw?.reliability
        : {
            sourceType: forceManualTime
              ? "manual_time_override"
              : "manual_or_safe_fallback",
            liveDataActive: false,
            limitations: [
              forceManualTime
                ? "Hora de partida forçada manualmente."
                : "AviationStack indisponível ou limite mensal atingido.",
              "Hora de partida obtida por fallback/manual.",
            ],
          },
      airport: airportEngine?.operationalIntelligence || null,
      route: routeEngine?.reliability || null,
      events: eventEngine?.eventIntelligence || null,
    },

    timeline,

    diagnostics: {
      usedLiveFlightData: hasLiveFlightData,
      forcedManualTime: forceManualTime,
      airportEngineSuccess: Boolean(airportEngine?.success),
      routeEngineSuccess: Boolean(routeEngine?.success),
      eventEngineSuccess: Boolean(eventEngine?.success),
      urls: {
        flightUrl,
        airportUrl,
        routeUrl,
        eventUrl,
      },
      fetchErrors: {
        flight: flightEngineRaw?._fetchError || null,
        airport: airportEngine?._fetchError || null,
        route: routeEngine?._fetchError || null,
        event: eventEngine?._fetchError || null,
      },
    },
  });
}