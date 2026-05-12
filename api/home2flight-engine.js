export default async function handler(req, res) {
  const flight = String(req.query.flight || "AF1195").toUpperCase();
  const origin = String(req.query.origin || "Lisboa");
  const airport = String(req.query.airport || "LIS").toUpperCase();
  const mode = String(req.query.mode || "car");

  try {
    const baseUrl = buildBaseUrl(req);

    const flightData = await getFlightIntelligence(flight);
    const airportData = getAirportIntelligence(airport);
    const routeData = await getRouteIntelligence({
      origin,
      airport,
      mode,
      baseUrl,
    });
    const weatherData = getWeatherIntelligence(airport);

    const decision = buildDecision({
      flightData,
      airportData,
      routeData,
      weatherData,
    });

    const timeline = buildTimeline({
      flightData,
      airportData,
      routeData,
      weatherData,
      decision,
    });

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      engine: "Home2Flight Unified Operational Engine",
      version: "0.2.0",
      request: {
        flight,
        origin,
        airport,
        mode,
      },
      decision,
      timeline,
      inputs: {
        flight: flightData,
        airport: airportData,
        route: routeData,
        weather: weatherData,
      },
      sourceBreakdown: {
        flightEngine: "aviationstack_live_or_safe_fallback",
        airportEngine: "internal_airport_profile",
        routeEngine: routeData?.reliability?.liveDataActive
          ? "google_maps_live_traffic"
          : "internal_route_profile_fallback",
        weatherEngine: "internal_weather_profile",
        decisionEngine: "weighted_operational_reliability_model",
        timelineEngine: "dynamic_timeline_generation",
      },
      limitations: [
        ...flightData.reliability.limitations,
        ...airportData.reliability.limitations,
        ...routeData.reliability.limitations,
        ...weatherData.reliability.limitations,
      ],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      generatedAt: new Date().toISOString(),
      engine: "Home2Flight Unified Operational Engine",
      version: "0.2.0",
      error: error.message,
    });
  }
}

function buildBaseUrl(req) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  return `${protocol}://${host}`;
}

async function getFlightIntelligence(flightNumber) {
  const apiKey = process.env.AVIATIONSTACK_API_KEY;

  if (!apiKey) {
    return buildFlightFallback({
      flightNumber,
      reason: "AVIATIONSTACK_API_KEY is not configured.",
    });
  }

  try {
    const url = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${encodeURIComponent(
      flightNumber
    )}`;

    const response = await fetch(url);
    const rawData = await response.json();
    const flightData = rawData?.data?.[0];

    if (!flightData) {
      return buildFlightFallback({
        flightNumber,
        reason: "No matching flight found from provider.",
      });
    }

    const departureDelay =
      flightData?.departure?.delay ??
      calculateDelayMinutes(
        flightData?.departure?.scheduled,
        flightData?.departure?.estimated
      );

    const arrivalDelay =
      flightData?.arrival?.delay ??
      calculateDelayMinutes(
        flightData?.arrival?.scheduled,
        flightData?.arrival?.estimated
      );

    const status = flightData?.flight_status || "unknown";

    const score = calculateFlightScore({
      status,
      departureDelay,
      hasEstimatedDeparture: Boolean(flightData?.departure?.estimated),
      hasTerminal: Boolean(flightData?.departure?.terminal),
      hasGate: Boolean(flightData?.departure?.gate),
    });

    return {
      success: true,
      provider: {
        name: "AviationStack",
        liveDataActive: true,
        providerReachable: true,
        providerStatus: response.status,
      },
      flight: {
        number: flightData?.flight?.iata || flightNumber,
        icao: flightData?.flight?.icao || null,
        airline: {
          name: flightData?.airline?.name || null,
          code: flightData?.airline?.iata || null,
        },
        status,
        route: {
          from: {
            code: flightData?.departure?.iata || null,
            icao: flightData?.departure?.icao || null,
            name: flightData?.departure?.airport || null,
            timezone: flightData?.departure?.timezone || null,
          },
          to: {
            code: flightData?.arrival?.iata || null,
            icao: flightData?.arrival?.icao || null,
            name: flightData?.arrival?.airport || null,
            timezone: flightData?.arrival?.timezone || null,
          },
        },
        departure: {
          scheduled: flightData?.departure?.scheduled || null,
          estimated: flightData?.departure?.estimated || null,
          actual: flightData?.departure?.actual || null,
          delayMinutes: departureDelay,
          terminal: flightData?.departure?.terminal || null,
          gate: flightData?.departure?.gate || null,
        },
        arrival: {
          scheduled: flightData?.arrival?.scheduled || null,
          estimated: flightData?.arrival?.estimated || null,
          actual: flightData?.arrival?.actual || null,
          delayMinutes: arrivalDelay,
          terminal: flightData?.arrival?.terminal || null,
          gate: flightData?.arrival?.gate || null,
        },
      },
      reliability: {
        score,
        confidenceScore: score,
        trustLevel: getTrustLevel(score),
        sourceType: "aviationstack_live",
        liveDataActive: true,
        limitations: getFlightLimitations(flightData),
      },
      intelligenceSummary: {
        operationalStatus: getFlightOperationalStatus(status),
        delayRisk: getFlightDelayRisk(departureDelay, status),
        recommendationImpact: getFlightRecommendationImpact(
          getFlightDelayRisk(departureDelay, status)
        ),
        summary: buildFlightSummary({
          flightNumber,
          status,
          departureDelay,
          from: flightData?.departure?.iata,
          to: flightData?.arrival?.iata,
        }),
      },
      intelligenceFlags: buildFlightFlags({ status, departureDelay }),
    };
  } catch (error) {
    return buildFlightFallback({
      flightNumber,
      reason: error.message,
    });
  }
}

function buildFlightFallback({ flightNumber, reason }) {
  return {
    success: false,
    provider: {
      name: "AviationStack",
      liveDataActive: false,
      providerReachable: false,
      providerStatus: null,
    },
    flight: {
      number: flightNumber,
      airline: {
        name: null,
        code: null,
      },
      status: "unknown",
      route: {
        from: {
          code: null,
          name: null,
        },
        to: {
          code: null,
          name: null,
        },
      },
      departure: {
        scheduled: null,
        estimated: null,
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
    },
    reliability: {
      score: 25,
      confidenceScore: 25,
      trustLevel: "low",
      sourceType: "flight_fallback",
      liveDataActive: false,
      limitations: [
        "Dados reais de voo indisponíveis neste momento.",
        "A timeline deve usar fallback conservador.",
        "O motor deve pedir validação manual.",
      ],
    },
    intelligenceSummary: {
      operationalStatus: "unknown",
      delayRisk: "unknown",
      recommendationImpact: "manual_validation_required",
      summary:
        "Não foi possível obter dados reais fiáveis para este voo. A Home2Flight deve aplicar lógica conservadora e pedir validação manual.",
    },
    intelligenceFlags: [
      {
        type: "flight_data",
        label: "Dados de voo indisponíveis",
        severity: "high",
      },
    ],
    diagnostics: {
      reason,
    },
  };
}

function getAirportIntelligence(airport) {
  const profiles = {
    LIS: {
      name: "Lisboa Humberto Delgado",
      city: "Lisbon",
      country: "Portugal",
      riskLevel: "medium",
      operationalComplexity: "medium",
      congestionLevel: "medium",
      terminalComplexity: "medium",
      securityVariability: "medium",
      score: 64,
      confidenceScore: 66,
      buffers: {
        airportBufferMinutes: 25,
        securityMinutes: 22,
        bagDropMinutes: 14,
        passportControlMinutes: 12,
        gateWalkMinutes: 16,
      },
    },
    CDG: {
      name: "Paris Charles de Gaulle",
      city: "Paris",
      country: "France",
      riskLevel: "high",
      operationalComplexity: "high",
      congestionLevel: "high",
      terminalComplexity: "high",
      securityVariability: "high",
      score: 58,
      confidenceScore: 61,
      buffers: {
        airportBufferMinutes: 35,
        securityMinutes: 32,
        bagDropMinutes: 18,
        passportControlMinutes: 20,
        gateWalkMinutes: 28,
      },
    },
    AMS: {
      name: "Amsterdam Schiphol",
      city: "Amsterdam",
      country: "Netherlands",
      riskLevel: "medium",
      operationalComplexity: "medium",
      congestionLevel: "medium",
      terminalComplexity: "medium",
      securityVariability: "medium",
      score: 72,
      confidenceScore: 76,
      buffers: {
        airportBufferMinutes: 25,
        securityMinutes: 22,
        bagDropMinutes: 14,
        passportControlMinutes: 12,
        gateWalkMinutes: 18,
      },
    },
  };

  const profile = profiles[airport] || profiles.LIS;

  return {
    success: true,
    airport: {
      code: airport,
      name: profile.name,
      city: profile.city,
      country: profile.country,
    },
    operationalProfile: {
      riskLevel: profile.riskLevel,
      operationalComplexity: profile.operationalComplexity,
      congestionLevel: profile.congestionLevel,
      terminalComplexity: profile.terminalComplexity,
      securityVariability: profile.securityVariability,
      peakRiskWindows: ["06:00-09:00", "17:00-20:00"],
      recommendedBuffers: profile.buffers,
    },
    reliability: {
      score: profile.score,
      confidenceScore: profile.confidenceScore,
      trustLevel: getTrustLevel(profile.score),
      sourceType: "internal_airport_profile",
      source: `Home2Flight Internal Airport Profile — ${airport}`,
      liveDataActive: false,
      dataFreshness: "static-profile",
      limitations: [
        "Ainda sem integração direta com tempos oficiais de segurança em tempo real.",
        "Ainda sem dados específicos por companhia aérea para bag drop.",
        "Ainda sem reports comunitários validados.",
        "Perfil interno usado como camada conservadora até existir fonte live confirmada.",
      ],
    },
    intelligenceSummary: {
      operationalStatus: "monitoring",
      airportRisk: profile.riskLevel,
      recommendationImpact:
        profile.riskLevel === "high"
          ? "strong_airport_buffer_required"
          : "dynamic_buffer_recommended",
      summary:
        profile.riskLevel === "high"
          ? `${airport} apresenta risco operacional elevado. A timeline deve aplicar margem aeroportuária reforçada.`
          : `${airport} apresenta risco operacional moderado. A timeline deve aplicar margem dinâmica e manter monitorização até à partida.`,
    },
    intelligenceFlags: [
      {
        type: "security_variability",
        label: "Variabilidade em segurança",
        severity: profile.riskLevel === "high" ? "high" : "medium",
      },
      {
        type: "terminal_pressure",
        label: "Aeroporto com pressão operacional",
        severity: "medium",
      },
    ],
  };
}

async function getRouteIntelligence({ origin, airport, mode, baseUrl }) {
  try {
    const url =
      `${baseUrl}/api/engines/route-intelligence-engine` +
      `?origin=${encodeURIComponent(origin)}` +
      `&airport=${encodeURIComponent(airport)}` +
      `&mode=${encodeURIComponent(mode)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data?.success) {
      return {
        ...data,
        reliability: {
          ...data.reliability,
          limitations: data.reliability?.limitations || [
            "Rota calculada com dados live do Google Maps Distance Matrix API.",
          ],
        },
      };
    }

    return getRouteFallback({ origin, airport, mode });
  } catch {
    return getRouteFallback({ origin, airport, mode });
  }
}

function getRouteFallback({ origin, airport, mode }) {
  const estimatedRouteMinutes = mode === "public_transport" ? 42 : 28;
  const dynamicBufferMinutes = mode === "public_transport" ? 30 : 25;
  const totalRecommendedRouteMinutes =
    estimatedRouteMinutes + dynamicBufferMinutes;

  return {
    success: true,
    fallback: true,
    engine: "Home2Flight Route Intelligence Fallback",
    version: "0.1.0",
    route: {
      origin,
      destinationAirport: {
        code: airport,
        name: airport === "LIS" ? "Lisboa Humberto Delgado" : airport,
        city: airport === "LIS" ? "Lisbon" : null,
        country: airport === "LIS" ? "Portugal" : null,
      },
      transportMode: mode,
      estimatedRouteMinutes,
      baseDurationMinutes: estimatedRouteMinutes,
      liveTrafficDurationMinutes: estimatedRouteMinutes,
      trafficDeltaMinutes: 0,
      dynamicBufferMinutes,
      totalRecommendedRouteMinutes,
    },
    operationalProfile: {
      trafficRisk: "medium",
      disruptionRisk: "low",
      airportAccessRisk: "medium",
      airportRiskLevel: "medium",
      routeRiskLevel: "medium",
    },
    reliability: {
      score: 65,
      confidenceScore: 71,
      trustLevel: "medium",
      sourceType: "internal_route_profile",
      source: "Home2Flight Internal Route Intelligence",
      liveDataActive: false,
      dataFreshness: "static-route-profile",
      limitations: [
        "Ainda sem integração direta com Google Maps, Apple Maps ou transportes públicos em tempo real.",
        "Ainda sem deteção automática de acidentes, greves, obras ou incidentes urbanos.",
        "Tempo de rota calculado por perfil interno conservador.",
        "A recomendação deve ser tratada como estimativa operacional até existir fonte live confirmada.",
      ],
    },
    intelligenceSummary: {
      operationalStatus: "monitoring",
      recommendationImpact: "dynamic_route_buffer_recommended",
      summary: `Trajeto ${origin} → ${airport} por ${mode} tem variabilidade moderada. A timeline deve aplicar buffer dinâmico de ${dynamicBufferMinutes} min. Recomendação total: ${totalRecommendedRouteMinutes} min.`,
    },
    intelligenceFlags: [
      {
        type: "traffic",
        label: "Margem de trânsito aplicada",
        severity: "medium",
      },
      {
        type: "airport_access",
        label: "Acesso ao aeroporto com variabilidade",
        severity: "medium",
      },
    ],
  };
}

function getWeatherIntelligence(airport) {
  const profiles = {
    LIS: {
      condition: "Stable",
      impactLevel: "low",
      visibility: "good",
      windRisk: "low",
      disruptionRisk: "low",
    },
    CDG: {
      condition: "Rain",
      impactLevel: "medium",
      visibility: "moderate",
      windRisk: "medium",
      disruptionRisk: "medium",
    },
    AMS: {
      condition: "Wind",
      impactLevel: "medium",
      visibility: "good",
      windRisk: "medium",
      disruptionRisk: "medium",
    },
  };

  const weather = profiles[airport] || profiles.LIS;
  const score = calculateWeatherScore(weather);

  return {
    success: true,
    airport,
    operationalWeather: weather,
    reliability: {
      score,
      confidenceScore: score,
      trustLevel: getTrustLevel(score),
      sourceType: "internal_weather_profile",
      liveDataActive: false,
      limitations: [
        "Ainda sem integração meteorológica em tempo real.",
        "Ainda sem radar operacional aeroportuário.",
        "Perfil meteorológico interno usado como fallback.",
      ],
    },
    intelligenceSummary: {
      operationalStatus:
        weather.disruptionRisk === "medium" ? "monitoring" : "stable",
      weatherRisk: weather.impactLevel,
      recommendationImpact:
        weather.impactLevel === "medium"
          ? "weather_buffer_recommended"
          : "standard_monitoring",
      summary:
        weather.impactLevel === "medium"
          ? `${airport} apresenta impacto meteorológico moderado. O motor deve aplicar buffer climático preventivo.`
          : `${airport} sem impacto meteorológico relevante detetado.`,
    },
    intelligenceFlags:
      weather.impactLevel === "medium"
        ? [
            {
              type: "weather",
              label: "Impacto meteorológico moderado",
              severity: "medium",
            },
          ]
        : [
            {
              type: "weather",
              label: "Meteorologia estável",
              severity: "low",
            },
          ],
  };
}

function buildDecision({ flightData, airportData, routeData, weatherData }) {
  const flightScore = flightData.reliability.score;
  const airportScore = airportData.reliability.score;
  const routeScore = routeData.reliability.score;
  const weatherScore = weatherData.reliability.score;

  const globalReliabilityScore = Math.round(
    flightScore * 0.4 +
      airportScore * 0.25 +
      routeScore * 0.2 +
      weatherScore * 0.15
  );

  const globalConfidenceScore = Math.min(95, globalReliabilityScore + 7);

  const risks = [
    flightData.intelligenceSummary.delayRisk,
    airportData.intelligenceSummary.airportRisk,
    routeData.operationalProfile.routeRiskLevel,
    weatherData.intelligenceSummary.weatherRisk,
  ];

  const operationalRisk = risks.includes("high")
    ? "high"
    : risks.includes("medium")
    ? "medium"
    : "low";

  const routeBuffer = routeData.route.dynamicBufferMinutes || 20;

  const dynamicBufferMinutes =
    operationalRisk === "high"
      ? Math.max(50, routeBuffer)
      : operationalRisk === "medium"
      ? Math.max(25, routeBuffer)
      : Math.max(15, routeBuffer);

  const flightDepartureTime =
    extractFlightTime(flightData.flight.departure.scheduled) || "18:50";

  const totalPreFlightMinutes =
    routeData.route.totalRecommendedRouteMinutes +
    airportData.operationalProfile.recommendedBuffers.airportBufferMinutes +
    dynamicBufferMinutes;

  const recommendedDeparture = buildDepartureFromFlightTime(
    flightDepartureTime,
    totalPreFlightMinutes
  );

  return {
    recommendedDeparture,
    recommendedDepartureLocal: toLocalHHMM(recommendedDeparture),
    operationalRisk,
    globalReliabilityScore,
    globalConfidenceScore,
    trustLevel: getTrustLevel(globalReliabilityScore),
    dynamicBufferMinutes,
    recommendationType:
      operationalRisk === "high"
        ? "leave_with_strong_buffer"
        : operationalRisk === "medium"
        ? "leave_with_dynamic_buffer"
        : "standard_departure",
    summary: `A Home2Flight recomenda sair às ${toLocalHHMM(
      recommendedDeparture
    )}. A decisão considera risco ${operationalRisk} entre voo, aeroporto, rota e meteorologia, com buffer dinâmico de ${dynamicBufferMinutes} minutos.`,
  };
}

function buildTimeline({
  flightData,
  airportData,
  routeData,
  weatherData,
  decision,
}) {
  const departureTime = decision.recommendedDepartureLocal;
  const flightStatus = flightData.flight.status;
  const airportRisk = airportData.intelligenceSummary.airportRisk;
  const routeRisk = routeData.operationalProfile.routeRiskLevel;
  const weatherRisk = weatherData.intelligenceSummary.weatherRisk;
  const dynamicBuffer = decision.dynamicBufferMinutes;
  const flightDepartureTime =
    extractFlightTime(flightData.flight.departure.scheduled) || "18:50";

  return [
    {
      id: 1,
      time: buildRelativeTime(departureTime, -70),
      title: "Preparar documentos e essenciais",
      category: "Preparation",
      status: "ready",
      confidence: "Preparation",
      confidenceScore: 88,
      trustLevel: "high",
      source: "User checklist",
      sourceType: "user_context",
      buffer: "Prep",
      lastUpdatedMinutesAgo: 1,
      recalculationStatus: "stable",
      liveInsight: "Preparação inicial validada com margem confortável.",
      reasoning: "Tempo recomendado para preparação inicial antes da saída.",
      intelligenceFlags: [
        {
          type: "user_readiness",
          label: "Checklist pessoal",
          severity: "low",
        },
      ],
      operationalSignals: [],
    },
    {
      id: 2,
      time: buildRelativeTime(departureTime, -40),
      title: "Confirmar estado do voo",
      category: "Flight",
      status: flightStatus === "delayed" ? "buffer" : "ready",
      confidence: "Flight",
      confidenceScore: flightData.reliability.score,
      trustLevel: flightData.reliability.trustLevel,
      source: "Flight data",
      sourceType: "flight_engine",
      buffer: flightStatus === "delayed" ? "+10m" : "Pending",
      lastUpdatedMinutesAgo: 1,
      recalculationStatus:
        flightStatus === "delayed" ? "monitoring" : "stable",
      liveInsight: flightData.intelligenceSummary.summary,
      reasoning: "Verificação final do estado do voo e documentação digital.",
      intelligenceFlags: flightData.intelligenceFlags,
      operationalSignals: flightData.intelligenceFlags,
    },
    {
      id: 3,
      time: buildRelativeTime(departureTime, 0),
      title: "Sair de casa",
      category: "Transport",
      status: routeRisk === "medium" || routeRisk === "high" ? "buffer" : "ready",
      confidence: "Transport",
      confidenceScore: routeData.reliability.confidenceScore,
      trustLevel: routeData.reliability.trustLevel,
      source: routeData.reliability.liveDataActive
        ? "Google Maps live traffic"
        : "Route engine",
      sourceType: routeData.reliability.sourceType,
      buffer: `+${routeData.route.dynamicBufferMinutes || dynamicBuffer}m`,
      lastUpdatedMinutesAgo: 1,
      recalculationStatus: routeData.reliability.liveDataActive
        ? "live_recalculated"
        : "recalculated",
      liveInsight: routeData.intelligenceSummary.summary,
      reasoning: routeData.reliability.liveDataActive
        ? `Google Maps live: ${routeData.route.liveTrafficDurationMinutes} min · buffer ${routeData.route.dynamicBufferMinutes} min.`
        : "Hora calculada considerando transporte, buffers dinâmicos e margem operacional.",
      intelligenceFlags: routeData.intelligenceFlags,
      operationalSignals: routeData.intelligenceFlags,
    },
    {
      id: 4,
      time: buildRelativeTime(departureTime, dynamicBuffer),
      title: "Chegar ao aeroporto",
      category: "Airport",
      status: airportRisk === "high" ? "risk" : "buffer",
      confidence: "Airport intel",
      confidenceScore: airportData.reliability.confidenceScore,
      trustLevel: airportData.reliability.trustLevel,
      source: "Operational profile",
      sourceType: "airport_profile",
      buffer: `+${dynamicBuffer}m`,
      lastUpdatedMinutesAgo: 1,
      recalculationStatus:
        airportRisk === "high" ? "risk_adjusted" : "recalculated",
      liveInsight: airportData.intelligenceSummary.summary,
      reasoning:
        "Chegada recomendada baseada em filas, deslocações internas, segurança e risco operacional.",
      intelligenceFlags: [
        ...airportData.intelligenceFlags,
        ...weatherData.intelligenceFlags,
      ],
      operationalSignals: airportData.intelligenceFlags,
    },
    {
      id: 5,
      time: buildAbsoluteTime(flightDepartureTime),
      title: "Partida do voo",
      category: "Flight",
      status: flightStatus === "cancelled" ? "risk" : "ready",
      confidence: "Flight",
      confidenceScore: flightData.reliability.score,
      trustLevel: flightData.reliability.trustLevel,
      source: "Flight data",
      sourceType: "flight_engine",
      buffer: "Pending",
      lastUpdatedMinutesAgo: 1,
      recalculationStatus:
        flightStatus === "active" || weatherRisk === "medium"
          ? "monitoring"
          : "stable",
      liveInsight: flightData.intelligenceSummary.summary,
      reasoning: "Hora programada atualmente pela companhia aérea.",
      intelligenceFlags: [
        {
          type: "flight_monitoring",
          label: "Estado do voo em monitorização",
          severity: flightStatus === "cancelled" ? "high" : "low",
        },
      ],
      operationalSignals: [],
    },
  ];
}

function calculateDelayMinutes(scheduled, estimated) {
  if (!scheduled || !estimated) return null;

  const scheduledTime = new Date(scheduled).getTime();
  const estimatedTime = new Date(estimated).getTime();

  if (Number.isNaN(scheduledTime) || Number.isNaN(estimatedTime)) return null;

  const diffMinutes = Math.round((estimatedTime - scheduledTime) / 60000);

  return diffMinutes > 0 ? diffMinutes : 0;
}

function calculateFlightScore({
  status,
  departureDelay,
  hasEstimatedDeparture,
  hasTerminal,
  hasGate,
}) {
  let score = 82;

  if (status === "delayed") score -= 12;
  if (status === "cancelled") score -= 45;
  if (status === "unknown") score -= 25;

  if (typeof departureDelay === "number") {
    if (departureDelay >= 60) score -= 18;
    else if (departureDelay >= 30) score -= 12;
    else if (departureDelay > 0) score -= 7;
  } else {
    score -= 8;
  }

  if (!hasEstimatedDeparture) score -= 5;
  if (!hasTerminal) score -= 4;
  if (!hasGate) score -= 4;

  return Math.max(0, Math.min(95, score));
}

function calculateWeatherScore(weather) {
  let score = 84;

  if (weather.impactLevel === "medium") score -= 14;
  if (weather.impactLevel === "high") score -= 28;
  if (weather.windRisk === "medium") score -= 8;
  if (weather.windRisk === "high") score -= 16;

  return Math.max(20, Math.min(95, score));
}

function getTrustLevel(score) {
  if (score >= 80) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function getFlightDelayRisk(delayMinutes, status) {
  if (status === "cancelled") return "high";
  if (status === "delayed") return "medium";
  if (typeof delayMinutes !== "number") return "unknown";
  if (delayMinutes >= 60) return "high";
  if (delayMinutes >= 20) return "medium";
  return "low";
}

function getFlightRecommendationImpact(delayRisk) {
  if (delayRisk === "high") return "strong_departure_buffer_required";
  if (delayRisk === "medium") return "departure_buffer_required";
  if (delayRisk === "low") return "standard_monitoring";
  return "manual_validation_required";
}

function getFlightOperationalStatus(status) {
  switch (status) {
    case "scheduled":
      return "scheduled";
    case "active":
      return "active";
    case "landed":
      return "completed";
    case "delayed":
      return "monitoring";
    case "cancelled":
      return "critical";
    default:
      return "unknown";
  }
}

function getFlightLimitations(flightData) {
  const limitations = [];

  if (!flightData?.departure?.estimated) {
    limitations.push("Hora estimada de partida não disponível.");
  }

  if (!flightData?.departure?.terminal) {
    limitations.push("Terminal de partida ainda não disponível.");
  }

  if (!flightData?.departure?.gate) {
    limitations.push("Gate de partida ainda não disponível.");
  }

  if (!flightData?.arrival?.estimated) {
    limitations.push("Hora estimada de chegada não disponível.");
  }

  if (limitations.length === 0) {
    limitations.push("Dados de voo disponíveis através de fornecedor externo.");
  }

  return limitations;
}

function buildFlightSummary({
  flightNumber,
  status,
  departureDelay,
  from,
  to,
}) {
  const routeText = from && to ? `${from} → ${to}` : "rota em validação";

  if (status === "cancelled") {
    return `${flightNumber} (${routeText}) surge como cancelado. A timeline deve bloquear recomendação automática e pedir validação imediata.`;
  }

  if (status === "delayed" || departureDelay > 0) {
    return `${flightNumber} (${routeText}) apresenta atraso operacional${
      typeof departureDelay === "number" ? ` de ${departureDelay} minutos` : ""
    }. A timeline deve aplicar margem adicional e manter o voo em monitorização.`;
  }

  if (status === "active") {
    return `${flightNumber} (${routeText}) está ativo. A timeline deve manter monitorização até confirmação de partida e chegada.`;
  }

  return `${flightNumber} (${routeText}) sem atraso relevante detetado. A timeline pode manter plano base com monitorização operacional.`;
}

function buildFlightFlags({ status, departureDelay }) {
  if (status === "cancelled") {
    return [
      {
        type: "flight_status",
        label: "Voo cancelado",
        severity: "high",
      },
    ];
  }

  if (status === "delayed" || departureDelay > 0) {
    return [
      {
        type: "flight_status",
        label: "Atraso operacional detetado",
        severity: "medium",
      },
    ];
  }

  return [
    {
      type: "flight_status",
      label: "Estado do voo em monitorização",
      severity: "low",
    },
  ];
}

function buildDepartureFromFlightTime(flightTime, minutesBefore) {
  const [hours, minutes] = String(flightTime).split(":").map(Number);
  const date = new Date();

  date.setHours(Number.isFinite(hours) ? hours : 18);
  date.setMinutes((Number.isFinite(minutes) ? minutes : 50) - minutesBefore);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date.toISOString();
}

function buildRelativeTime(baseTime, offsetMinutes) {
  const [hours, minutes] = String(baseTime).split(":").map(Number);
  const date = new Date();

  date.setHours(Number.isFinite(hours) ? hours : 17);
  date.setMinutes((Number.isFinite(minutes) ? minutes : 42) + offsetMinutes);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date.toISOString();
}

function buildAbsoluteTime(timeString) {
  const [hours, minutes] = String(timeString).split(":").map(Number);
  const date = new Date();

  date.setHours(Number.isFinite(hours) ? hours : 18);
  date.setMinutes(Number.isFinite(minutes) ? minutes : 50);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date.toISOString();
}

function extractFlightTime(dateString) {
  if (!dateString) return null;

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalHHMM(dateString) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}