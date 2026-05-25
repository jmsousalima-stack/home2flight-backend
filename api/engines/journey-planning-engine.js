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

async function postJson(url, body, timeoutMs = 7000) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
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

function subtractMinutes(date, minutes) {
  return new Date(date.getTime() - minutes * 60000);
}

function getFlightDepartureTime({ flightEngine, manualDepartureTime }) {
  const flightData = flightEngine?.flight;

  const liveDeparture =
    flightData?.departure?.estimated || flightData?.departure?.scheduled;

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

function severityFromRisk(risk) {
  if (risk === "high") return "high";
  if (risk === "medium") return "medium";
  if (risk === "low") return "low";
  return "medium";
}

function buildInternalOperationalSignals({
  departureResolution,
  flightEngine,
  airportEngine,
  routeEngine,
  eventEngine,
  checkedIn,
  kids,
  bags,
  fastTrack,
  priorityBoarding,
  transport,
  flightType,
}) {
  const signals = [];

  if (departureResolution.liveFlightUsed) {
    signals.push({
      id: "flight_status_live",
      type: "flight_status",
      title: "Dados reais de voo disponíveis",
      severity: "low",
      confidenceScore:
        flightEngine?.reliability?.confidenceScore ||
        flightEngine?.reliability?.score ||
        82,
      sourceType:
        flightEngine?.reliability?.sourceType || "aviationstack_live",
      freshness: "live",
      affects: ["flight", "departure_time"],
      extraBufferMinutes: 0,
      reasoning:
        flightEngine?.intelligenceSummary?.summary ||
        "O motor recebeu dados externos de voo para calcular a timeline.",
    });
  } else {
    signals.push({
      id: "flight_manual_fallback",
      type: "flight_status",
      title: "Hora de voo por fallback manual",
      severity: "medium",
      confidenceScore: 55,
      sourceType: "manual_fallback_time",
      freshness: "fallback",
      affects: ["flight", "departure_time", "overall_reliability"],
      extraBufferMinutes: 5,
      reasoning:
        "A hora de partida foi obtida por fallback manual. A timeline mantém postura conservadora.",
    });
  }

  const airportRisk =
    airportEngine?.operationalIntelligence?.airportRisk || "medium";

  signals.push({
    id: "airport_operational_risk",
    type: "airport_pressure",
    title:
      airportRisk === "high"
        ? "Aeroporto com pressão operacional elevada"
        : airportRisk === "medium"
        ? "Aeroporto com variabilidade moderada"
        : "Aeroporto operacionalmente estável",
    severity: severityFromRisk(airportRisk),
    confidenceScore:
      airportEngine?.operationalIntelligence?.confidenceScore || 55,
    sourceType:
      airportEngine?.operationalIntelligence?.sourceType ||
      "structured_internal_operational_model",
    freshness: airportEngine?.operationalIntelligence?.liveDataActive
      ? "live"
      : "profile",
    affects: ["airport", "security", "terminal_access"],
    extraBufferMinutes:
      airportRisk === "high" ? 20 : airportRisk === "medium" ? 10 : 0,
    reasoning:
      airportEngine?.reasoning?.[0] ||
      "Perfil aeroportuário considerado no cálculo operacional.",
    limitations: airportEngine?.limitations || [],
  });

  const routeRisk =
    routeEngine?.operationalProfile?.routeRiskLevel || "low";

  signals.push({
    id: "route_operational_status",
    type: "route_status",
    title:
      routeRisk === "high"
        ? "Rota com risco elevado"
        : routeRisk === "medium"
        ? "Rota sob monitorização"
        : "Rota dentro do esperado",
    severity: severityFromRisk(routeRisk),
    confidenceScore:
      routeEngine?.reliability?.confidenceScore ||
      routeEngine?.reliability?.score ||
      70,
    sourceType:
      routeEngine?.reliability?.sourceType || "google_maps_route_estimate",
    freshness: routeEngine?.reliability?.liveDataActive ? "live" : "cached",
    affects: ["route", "airport_access"],
    extraBufferMinutes:
      routeEngine?.route?.dynamicBufferMinutes ||
      (transport === "public" ? 25 : transport === "uber" ? 18 : 15),
    reasoning:
      routeEngine?.intelligenceSummary?.summary ||
      "Estimativa de trajeto considerada no cálculo.",
    limitations: routeEngine?.reliability?.limitations || [],
  });

  const eventRisk =
    eventEngine?.eventIntelligence?.eventRisk || "medium";

  signals.push({
    id: "event_disruption_watch",
    type: "event_disruption",
    title:
      eventRisk === "high"
        ? "Disrupções/eventos com impacto elevado"
        : eventRisk === "medium"
        ? "Eventos/disrupções sob monitorização"
        : "Sem disrupção relevante detetada",
    severity: severityFromRisk(eventRisk),
    confidenceScore: eventEngine?.eventIntelligence?.confidenceScore || 50,
    sourceType:
      eventEngine?.eventIntelligence?.sourceType || "internal_event_profile",
    freshness: eventEngine?.eventIntelligence?.liveDataActive
      ? "live"
      : "profile",
    affects: ["route", "airport_access", "overall_reliability"],
    extraBufferMinutes:
      eventEngine?.eventIntelligence?.totalExtraBufferMinutes || 0,
    reasoning:
      eventEngine?.intelligenceSummary?.summary ||
      "Camada de eventos e disrupções considerada.",
    limitations: eventEngine?.limitations || [],
  });

  if (!checkedIn) {
    signals.push({
      id: "checkin_pending",
      type: "passenger_readiness",
      title: "Check-in online ainda por confirmar",
      severity: "medium",
      confidenceScore: 88,
      sourceType: "user_profile",
      freshness: "profile",
      affects: ["check_in", "bag_drop", "airport_arrival"],
      extraBufferMinutes: bags ? 10 : 5,
      reasoning:
        "Sem check-in online confirmado, a timeline mantém margem para balcão/check-in.",
    });
  }

  if (bags) {
    signals.push({
      id: "checked_bags",
      type: "baggage",
      title: "Bagagem de porão",
      severity: "medium",
      confidenceScore: 90,
      sourceType: "user_profile",
      freshness: "profile",
      affects: ["bag_drop", "airport_arrival"],
      extraBufferMinutes: 8,
      reasoning:
        "Bagagem de porão aumenta dependência de bag drop e variabilidade no aeroporto.",
    });
  }

  if (kids) {
    signals.push({
      id: "travel_with_children",
      type: "passenger_profile",
      title: "Viagem com crianças",
      severity: "medium",
      confidenceScore: 90,
      sourceType: "user_profile",
      freshness: "profile",
      affects: ["leave_home_time", "airport_arrival", "overall_reliability"],
      extraBufferMinutes: 12,
      reasoning:
        "Viajar com crianças aumenta fricção operacional e justifica margem adicional.",
    });
  }

  if (fastTrack) {
    signals.push({
      id: "fast_track_enabled",
      type: "security_fast_track",
      title: "Fast track ativo",
      severity: "low",
      confidenceScore: 80,
      sourceType: "user_profile",
      freshness: "profile",
      affects: ["security"],
      extraBufferMinutes: 0,
      reasoning:
        "Fast track reduz variabilidade no controlo de segurança.",
    });
  }

  if (priorityBoarding) {
    signals.push({
      id: "priority_boarding_enabled",
      type: "boarding_profile",
      title: "Embarque prioritário ativo",
      severity: "low",
      confidenceScore: 75,
      sourceType: "user_profile",
      freshness: "profile",
      affects: ["boarding", "gate_timing"],
      extraBufferMinutes: 0,
      reasoning:
        "Embarque prioritário reduz a margem necessária antes da abertura provável do embarque.",
    });
  }

  if (flightType === "passport") {
    signals.push({
      id: "passport_control_required",
      type: "passport_control",
      title: "Controlo de passaporte necessário",
      severity: "medium",
      confidenceScore: 85,
      sourceType: "user_profile",
      freshness: "profile",
      affects: ["passport_control", "gate_timing"],
      extraBufferMinutes: 8,
      reasoning:
        "Voo com controlo documental/fronteiriço exige tempo adicional antes da porta.",
    });
  }

  return signals;
}

function buildReliabilityFromEngines({
  arbitration,
  bufferGovernance,
  signalPriority,
  usedLiveFlightData,
}) {
  if (!arbitration?.success || !arbitration?.aggregation) {
    return {
      score: 50,
      trustLevel: "medium",
      readiness: "sensitive",
      adjustments: [
        {
          factor: "arbitration_unavailable",
          impact: 0,
          reason:
            "Motor de arbitragem indisponível. Aplicada fiabilidade neutra.",
        },
      ],
    };
  }

  const riskScore = arbitration.aggregation.operationalRiskScore || 50;
  const confidenceScore = arbitration.aggregation.confidenceScore || 50;
  const governedBuffer =
    bufferGovernance?.summary?.totalBufferMinutes || 0;

  const dominantCount =
    signalPriority?.metadata?.dominantSignalCount || 0;

  const contradictionCount =
    signalPriority?.metadata?.contradictionCount || 0;

  let score = Math.round(
    82 - riskScore * 0.45 + confidenceScore * 0.22
  );

  if (!usedLiveFlightData) score -= 12;
  if (governedBuffer > 70) score -= 8;
  if (governedBuffer > 95) score -= 14;
  if (dominantCount >= 3) score -= 6;
  if (contradictionCount > 0) score -= 3;

  score = Math.max(0, Math.min(95, score));

  return {
    score,
    trustLevel: score >= 75 ? "high" : score >= 50 ? "medium" : "low",
    readiness: score >= 75 ? "ready" : score >= 50 ? "sensitive" : "fragile",

    arbitration: arbitration.aggregation,

    bufferGovernance: bufferGovernance?.summary || null,

    signalPriority: {
      dominantSignalCount: dominantCount,
      supportingSignalCount:
        signalPriority?.metadata?.supportingSignalCount || 0,
      contradictionCount,
      dominantSignals:
        signalPriority?.dominantSignals?.slice(0, 3).map((signal) => ({
          id: signal.id,
          title: signal.title,
          priority: signal.priority,
          priorityScore: signal.priorityScore,
        })) || [],
    },

    adjustments:
      arbitration.recommendations?.map((item) => ({
        factor: item.type,
        impact: 0,
        reason: item.reasoning,
      })) || [],
  };
}

function buildLeaveHomeReasoning(signalPriority) {
  const dominantSignals = signalPriority?.dominantSignals || [];

  if (dominantSignals.length > 0) {
    return `A decisão foi principalmente influenciada por: ${dominantSignals
      .slice(0, 3)
      .map((signal) => signal.title)
      .join(", ")}.`;
  }

  const supportingSignals = signalPriority?.supportingSignals || [];

  if (supportingSignals.length > 0) {
    return `A timeline foi suportada por sinais moderados: ${supportingSignals
      .slice(0, 3)
      .map((signal) => signal.title)
      .join(", ")}.`;
  }

  return "A timeline foi calculada a partir do perfil operacional e sinais disponíveis.";
}

export default async function handler(req, res) {
  const flight = String(req.query.flight || "KL1578").toUpperCase();
  const origin = String(req.query.origin || "Lisboa");
  const airport = String(req.query.airport || "LIS").toUpperCase();
  const airline = String(req.query.airline || flight.slice(0, 2)).toUpperCase();
  const terminal = String(req.query.terminal || "1");
  const transport = String(req.query.transport || "public").toLowerCase();
  const weather = String(req.query.weather || "normal").toLowerCase();

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

  const externalSignalsUrl =
    `${BASE_URL}/api/engines/external-operational-signals-engine` +
    `?airport=${encodeURIComponent(airport)}` +
    `&mode=${encodeURIComponent(transport)}` +
    `&weather=${encodeURIComponent(weather)}`;

  const arbitrationUrl =
    `${BASE_URL}/api/engines/reliability-arbitration-engine`;

  const bufferGovernanceUrl =
    `${BASE_URL}/api/engines/buffer-governance-engine`;

  const signalPriorityUrl =
    `${BASE_URL}/api/engines/signal-priority-engine`;

  const [
    flightEngine,
    airportEngine,
    routeEngine,
    eventEngine,
    externalSignalsEngine,
  ] = await Promise.all([
    fetchJson(flightUrl),
    fetchJson(airportUrl),
    fetchJson(routeUrl),
    fetchJson(eventUrl),
    fetchJson(externalSignalsUrl),
  ]);

  const departureResolution = getFlightDepartureTime({
    flightEngine,
    manualDepartureTime,
  });

  if (!departureResolution.departureTime) {
    return res.status(200).json({
      success: false,
      engine: "Home2Flight Journey Planning Engine",
      version: "1.7.0-signal-priority-integrated",
      error:
        "Flight departure time unavailable. Enable manual time or use a flight with available live data.",
    });
  }

  const departureDate = new Date(departureResolution.departureTime);

  if (Number.isNaN(departureDate.getTime())) {
    return res.status(200).json({
      success: false,
      engine: "Home2Flight Journey Planning Engine",
      version: "1.7.0-signal-priority-integrated",
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

  const airportInfo = airportEngine?.operationalIntelligence || {};
  const routeInfo = routeEngine?.route || {};
  const eventInfo = eventEngine?.eventIntelligence || {};

  const internalSignals = buildInternalOperationalSignals({
    departureResolution,
    flightEngine,
    airportEngine,
    routeEngine,
    eventEngine,
    checkedIn,
    kids,
    bags,
    fastTrack,
    priorityBoarding,
    transport,
    flightType,
  });

  const externalSignals = externalSignalsEngine?.signals || [];
  const operationalSignals = [...internalSignals, ...externalSignals];

  const [arbitration, bufferGovernance, signalPriority] = await Promise.all([
    postJson(arbitrationUrl, {
      signals: operationalSignals,
    }),

    postJson(bufferGovernanceUrl, {
      signals: operationalSignals,
      profile: {
        bags,
        kids,
        checkedIn,
        fastTrack,
        priorityBoarding,
        flightType,
        transport,
      },
    }),

    postJson(signalPriorityUrl, {
      signals: operationalSignals,
    }),
  ]);

  const reliability = buildReliabilityFromEngines({
    arbitration,
    bufferGovernance,
    signalPriority,
    usedLiveFlightData: departureResolution.liveFlightUsed,
  });

  const baseRouteMinutes =
    routeInfo.liveTrafficDurationMinutes || routeInfo.baseDurationMinutes || 30;

  const baseRouteBuffer =
    routeInfo.dynamicBufferMinutes ??
    (transport === "public" ? 25 : transport === "uber" ? 18 : 15);

  const governedRouteBuffer =
    bufferGovernance?.domains?.route?.bufferMinutes || 0;

  const governedAirportBuffer =
    bufferGovernance?.domains?.airport?.bufferMinutes || 0;

  const governedGateBuffer =
    bufferGovernance?.domains?.gate?.bufferMinutes || 0;

  const governedGeneralBuffer =
    bufferGovernance?.domains?.general?.bufferMinutes || 0;

  const eventBuffer = Math.min(
    70,
    governedRouteBuffer + governedGeneralBuffer
  );

  const routeBuffer = Math.max(baseRouteBuffer, governedRouteBuffer);

  const securityMinutes = fastTrack
    ? 10
    : airportInfo.estimatedSecurityMinutes || 20;

  const walkingMinutes = airportInfo.estimatedWalkingMinutes || 12;

  const passportMinutes = flightType === "passport" ? 12 : 0;

  const checkInMinutes = checkedIn ? (bags ? 12 : 0) : bags ? 25 : 15;

  const kidsExtraMinutes = kids ? 12 : 0;

  const airportEntryBuffer =
    10 + kidsExtraMinutes + Math.min(governedAirportBuffer, 25);

  const boardingBeforeDepartureMinutes = priorityBoarding ? 22 : 28;

  const gateReadyBuffer =
    (priorityBoarding ? 6 : 12) + Math.min(governedGateBuffer, 10);

  const boardingDate = subtractMinutes(
    departureDate,
    boardingBeforeDepartureMinutes
  );

  const gateArrivalDate = subtractMinutes(boardingDate, gateReadyBuffer);

  const passportDate = subtractMinutes(
    gateArrivalDate,
    walkingMinutes + passportMinutes
  );

  const securityDate = subtractMinutes(passportDate, securityMinutes);

  const checkInDate = subtractMinutes(securityDate, checkInMinutes);

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
    totalAirportFlow + baseRouteMinutes + routeBuffer + eventBuffer;

  const operationalStatus =
    reliability.score >= 70
      ? "stable"
      : reliability.score >= 45
      ? "sensitive"
      : "fragile";

  return res.status(200).json({
    success: true,
    engine: "Home2Flight Journey Planning Engine",
    version: "1.7.0-signal-priority-integrated",
    generatedAt: new Date().toISOString(),

    journey: {
      origin,
      airport,
      flight,
      airline,
      terminal,
      transport,
      weather,
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
      governedRouteBuffer,
      governedAirportBuffer,
      governedGateBuffer,
      governedGeneralBuffer,
      totalAirportFlow,
      totalBeforeDeparture,
      gateReadyBuffer,
      boardingBeforeDepartureMinutes,
      bufferGovernanceTotal:
        bufferGovernance?.summary?.totalBufferMinutes || null,
    },

    reliability,

    reliabilityArbitration: arbitration,

    bufferGovernance,

    signalPriority,

    operationalSignals,

    externalOperationalSignals: externalSignalsEngine,

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
      externalSignals: externalSignalsEngine?.summary || null,
      arbitration: arbitration?.aggregation || null,
      bufferGovernance: bufferGovernance?.summary || null,
      signalPriority: signalPriority?.metadata || null,
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
        source:
          "Journey Planning Engine + Reliability Arbitration + Buffer Governance + Signal Priority",
        buffer: `+${routeBuffer + eventBuffer} min`,
        liveInsight:
          "Hora recomendada para iniciar a jornada até ao aeroporto.",
        reasoning: buildLeaveHomeReasoning(signalPriority),
        operationalSignals,
        dominantSignals: signalPriority?.dominantSignals?.slice(0, 3) || [],
      },
      {
        step: "arrive_airport",
        title: "Chegar ao aeroporto",
        recommendedTime: airportArrivalDate.toISOString(),
        category: "airport",
        confidenceScore: airportInfo.confidenceScore || 55,
        trustLevel: "medium",
        status: "buffer",
        source: "Airport Intelligence Engine + Buffer Governance",
        liveInsight:
          airportEngine?.layers?.airportProfile?.reasoning?.[0] ||
          "Chegada ao aeroporto calculada com margem governada.",
        reasoning:
          "Inclui margem antes dos passos críticos: check-in, segurança, controlo documental e porta.",
        operationalSignals: operationalSignals.filter((signal) =>
          signal.affects?.some((item) =>
            ["airport", "security", "terminal_access", "airport_access"].includes(
              item
            )
          )
        ),
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
        operationalSignals: operationalSignals.filter((signal) =>
          signal.affects?.some((item) => ["check_in", "bag_drop"].includes(item))
        ),
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
        operationalSignals: operationalSignals.filter((signal) =>
          signal.affects?.includes("security")
        ),
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
        reasoning: "Tempo ajustado ao tipo de voo selecionado.",
        operationalSignals: operationalSignals.filter((signal) =>
          signal.affects?.includes("passport_control")
        ),
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
        operationalSignals: operationalSignals.filter((signal) =>
          signal.affects?.some((item) =>
            ["gate_timing", "boarding"].includes(item)
          )
        ),
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
        operationalSignals: operationalSignals.filter((signal) =>
          signal.affects?.includes("boarding")
        ),
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
        liveInsight: "Hora usada como âncora da timeline operacional.",
        reasoning:
          "Todos os passos são calculados de trás para a frente a partir da hora prevista/estimada de partida.",
        operationalSignals: operationalSignals.filter((signal) =>
          signal.affects?.includes("flight")
        ),
      },
    ],

    diagnostics: {
      usedLiveFlightData: departureResolution.liveFlightUsed,
      departureSource: departureResolution.source,
      arbitrationSuccess: Boolean(arbitration?.success),
      bufferGovernanceSuccess: Boolean(bufferGovernance?.success),
      signalPrioritySuccess: Boolean(signalPriority?.success),
      externalSignalsSuccess: Boolean(externalSignalsEngine?.success),
      airportEngineSuccess: Boolean(airportEngine?.success),
      routeEngineSuccess: Boolean(routeEngine?.success),
      eventEngineSuccess: Boolean(eventEngine?.success),
      urls: {
        flightUrl,
        airportUrl,
        routeUrl,
        eventUrl,
        externalSignalsUrl,
        arbitrationUrl,
        bufferGovernanceUrl,
        signalPriorityUrl,
      },
    },
  });
}