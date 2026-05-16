// /api/engines/airport-intelligence-engine.js

const AIRPORT_PROFILES = {
  LIS: {
    code: "LIS",
    name: "Lisboa Humberto Delgado",
    city: "Lisbon",
    country: "Portugal",
    complexity: "medium",
    baselineRisk: "medium",
    defaultTerminal: "1",
    peakWindows: [
      { start: "06:00", end: "09:00", riskImpact: "medium" },
      { start: "17:00", end: "20:00", riskImpact: "medium" },
    ],
    walkingMinutes: {
      min: 8,
      typical: 14,
      max: 22,
    },
    terminalProfiles: {
      "1": {
        terminal: "1",
        pressure: "medium",
        layoutComplexity: "medium",
        securityVariability: "medium",
        walkingMinutes: 16,
      },
      "2": {
        terminal: "2",
        pressure: "medium",
        layoutComplexity: "low",
        securityVariability: "medium",
        walkingMinutes: 12,
      },
    },
  },

  CDG: {
    code: "CDG",
    name: "Paris Charles de Gaulle",
    city: "Paris",
    country: "France",
    complexity: "high",
    baselineRisk: "high",
    defaultTerminal: "2E",
    peakWindows: [
      { start: "06:00", end: "10:00", riskImpact: "high" },
      { start: "16:00", end: "20:00", riskImpact: "medium" },
    ],
    walkingMinutes: {
      min: 12,
      typical: 22,
      max: 35,
    },
    terminalProfiles: {},
  },

  AMS: {
    code: "AMS",
    name: "Amsterdam Schiphol",
    city: "Amsterdam",
    country: "Netherlands",
    complexity: "high",
    baselineRisk: "high",
    defaultTerminal: "1",
    peakWindows: [
      { start: "06:00", end: "10:00", riskImpact: "high" },
      { start: "16:00", end: "20:00", riskImpact: "medium" },
    ],
    walkingMinutes: {
      min: 12,
      typical: 22,
      max: 36,
    },
    terminalProfiles: {
      "1": {
        terminal: "1",
        pressure: "high",
        layoutComplexity: "high",
        securityVariability: "high",
        walkingMinutes: 24,
      },
    },
  },
};

const AIRLINE_PROFILES = {
  AF: {
    code: "AF",
    name: "Air France",
    type: "legacy",
    bagDropRisk: "medium",
    boardingStrictness: "medium",
    operationalReliability: "high",
    recommendedExtraBuffer: 5,
  },

  KL: {
    code: "KL",
    name: "KLM",
    type: "legacy",
    bagDropRisk: "medium",
    boardingStrictness: "medium",
    operationalReliability: "high",
    recommendedExtraBuffer: 5,
  },

  TP: {
    code: "TP",
    name: "TAP Air Portugal",
    type: "legacy",
    bagDropRisk: "medium",
    boardingStrictness: "medium",
    operationalReliability: "medium",
    recommendedExtraBuffer: 7,
  },

  FR: {
    code: "FR",
    name: "Ryanair",
    type: "low_cost",
    bagDropRisk: "medium",
    boardingStrictness: "high",
    operationalReliability: "medium",
    recommendedExtraBuffer: 10,
  },

  U2: {
    code: "U2",
    name: "easyJet",
    type: "low_cost",
    bagDropRisk: "medium",
    boardingStrictness: "medium",
    operationalReliability: "medium",
    recommendedExtraBuffer: 8,
  },
};

const RISK_SCORE = {
  low: 25,
  medium: 55,
  high: 80,
  critical: 95,
};

function clamp(number, min, max) {
  return Math.max(min, Math.min(max, number));
}

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return String(value).toLowerCase() === "true";
}

function normalizeAirportCode(airport) {
  if (!airport) return "UNKNOWN";
  if (typeof airport === "string") return airport.toUpperCase();
  return String(
    airport.code || airport.iata || airport.airport || "UNKNOWN"
  ).toUpperCase();
}

function normalizeAirlineCode(airline) {
  if (!airline) return "UNKNOWN";
  if (typeof airline === "string") return airline.toUpperCase();
  return String(
    airline.code || airline.iata || airline.airline || "UNKNOWN"
  ).toUpperCase();
}

function getTimeHHMM(dateInput) {
  if (!dateInput) return null;

  const date = new Date(dateInput);

  if (Number.isNaN(date.getTime())) return null;

  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");

  return `${hh}:${mm}`;
}

function isWithinWindow(time, window) {
  if (!time || !window?.start || !window?.end) return false;
  return time >= window.start && time <= window.end;
}

function getRiskLevelFromScore(score) {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function getConfidenceLevel(score) {
  if (score >= 85) return "high";
  if (score >= 65) return "medium";
  return "low";
}

function buildAirportProfileLayer({ airport, departureTime }) {
  const airportCode = normalizeAirportCode(airport);
  const profile = AIRPORT_PROFILES[airportCode];

  if (!profile) {
    return {
      airport: {
        code: airportCode,
        name: airportCode,
        city: null,
        country: null,
      },
      complexity: "medium",
      baselineRisk: "medium",
      peakRiskActive: false,
      peakWindowMatched: null,
      walkingMinutes: {
        min: 10,
        typical: 18,
        max: 28,
      },
      confidenceScore: 45,
      confidenceLevel: "low",
      sourceType: "fallback_internal_model",
      reasoning: [
        `Sem perfil específico para ${airportCode}. Aplicado perfil conservador genérico.`,
      ],
      flags: [
        {
          type: "airport_profile_missing",
          label: "Perfil de aeroporto ainda não configurado",
          severity: "medium",
        },
      ],
      limitations: [
        "Perfil específico do aeroporto ainda não existe na base interna.",
      ],
      rawProfile: null,
    };
  }

  const time = getTimeHHMM(departureTime);
  const matchedPeakWindow = profile.peakWindows.find((window) =>
    isWithinWindow(time, window)
  );

  return {
    airport: {
      code: profile.code,
      name: profile.name,
      city: profile.city,
      country: profile.country,
    },
    complexity: profile.complexity,
    baselineRisk: profile.baselineRisk,
    peakRiskActive: Boolean(matchedPeakWindow),
    peakWindowMatched: matchedPeakWindow || null,
    walkingMinutes: profile.walkingMinutes,
    confidenceScore: 68,
    confidenceLevel: "medium",
    sourceType: "internal_airport_profile",
    reasoning: [
      matchedPeakWindow
        ? `${profile.code} está dentro de uma janela de maior pressão operacional.`
        : `${profile.code} fora das principais janelas internas de pico.`,
    ],
    flags: matchedPeakWindow
      ? [
          {
            type: "airport_peak_window",
            label: "Janela de maior pressão operacional",
            severity: matchedPeakWindow.riskImpact,
          },
        ]
      : [],
    limitations: [
      "Perfil baseado em modelo interno conservador, ainda sem filas oficiais em tempo real.",
    ],
    rawProfile: profile,
  };
}

function buildTerminalIntelligenceLayer({ airportProfile, terminal }) {
  const selectedTerminal =
    terminal ||
    airportProfile?.rawProfile?.defaultTerminal ||
    "unknown";

  const terminalProfile =
    airportProfile?.rawProfile?.terminalProfiles?.[selectedTerminal];

  if (!terminalProfile) {
    return {
      terminal: selectedTerminal,
      terminalKnown: false,
      terminalPressure: "medium",
      layoutComplexity: airportProfile?.complexity || "medium",
      securityVariability: "medium",
      estimatedWalkingMinutes: airportProfile?.walkingMinutes?.typical || 18,
      confidenceScore: 45,
      confidenceLevel: "low",
      sourceType: "fallback_terminal_model",
      reasoning: [
        `Sem perfil específico para o terminal ${selectedTerminal}. Aplicado modelo conservador.`,
      ],
      flags: [
        {
          type: "terminal_profile_missing",
          label: "Perfil de terminal ainda não configurado",
          severity: "medium",
        },
      ],
      limitations: [
        "Ainda sem dados detalhados por terminal para este aeroporto.",
      ],
    };
  }

  return {
    terminal: selectedTerminal,
    terminalKnown: true,
    terminalPressure: terminalProfile.pressure,
    layoutComplexity: terminalProfile.layoutComplexity,
    securityVariability: terminalProfile.securityVariability,
    estimatedWalkingMinutes: terminalProfile.walkingMinutes,
    confidenceScore: 62,
    confidenceLevel: "medium",
    sourceType: "internal_terminal_profile",
    reasoning: [
      `Terminal ${selectedTerminal} avaliado com pressão ${terminalProfile.pressure}.`,
    ],
    flags:
      terminalProfile.pressure !== "low"
        ? [
            {
              type: "terminal_pressure",
              label: "Pressão operacional do terminal",
              severity: terminalProfile.pressure,
            },
          ]
        : [],
    limitations: [
      "Perfil de terminal ainda baseado em heurística interna.",
    ],
  };
}

function buildAirlineOperationLayer({ airline, baggageProfile }) {
  const airlineCode = normalizeAirlineCode(airline);
  const profile = AIRLINE_PROFILES[airlineCode];

  const hasCheckedBag =
    baggageProfile?.checkedBags === true ||
    baggageProfile?.checkedBags > 0 ||
    baggageProfile === "checked";

  if (!profile) {
    return {
      airline: {
        code: airlineCode,
        name: airlineCode,
      },
      airlineKnown: false,
      airlineType: "unknown",
      bagDropRisk: hasCheckedBag ? "medium" : "low",
      boardingStrictness: "medium",
      operationalReliability: "medium",
      recommendedExtraBuffer: hasCheckedBag ? 10 : 5,
      confidenceScore: 42,
      confidenceLevel: "low",
      sourceType: "fallback_airline_model",
      reasoning: [
        `Sem perfil específico para a companhia ${airlineCode}. Aplicado modelo conservador.`,
      ],
      flags: [
        {
          type: "airline_profile_missing",
          label: "Perfil de companhia ainda não configurado",
          severity: "medium",
        },
      ],
      limitations: [
        "Perfil da companhia aérea ainda não existe na base interna.",
      ],
    };
  }

  return {
    airline: {
      code: profile.code,
      name: profile.name,
    },
    airlineKnown: true,
    airlineType: profile.type,
    bagDropRisk: hasCheckedBag ? profile.bagDropRisk : "low",
    boardingStrictness: profile.boardingStrictness,
    operationalReliability: profile.operationalReliability,
    recommendedExtraBuffer:
      profile.recommendedExtraBuffer + (hasCheckedBag ? 8 : 0),
    confidenceScore: 58,
    confidenceLevel: "medium",
    sourceType: "internal_airline_profile",
    reasoning: [
      hasCheckedBag
        ? `${profile.name}: passageiro com bagagem de porão, aplicado buffer adicional.`
        : `${profile.name}: sem bagagem de porão, risco de bag drop reduzido.`,
    ],
    flags: hasCheckedBag
      ? [
          {
            type: "bag_drop_required",
            label: "Bagagem de porão aumenta variabilidade",
            severity: profile.bagDropRisk,
          },
        ]
      : [],
    limitations: [
      "Perfil da companhia ainda não ligado a regras oficiais de check-in/bag drop.",
    ],
  };
}

function buildSecurityIntelligenceLayer({
  airportProfile,
  terminalIntelligence,
  airlineOperationalProfile,
}) {
  const baseSecurityMinutes = 18;

  const airportRiskScore = RISK_SCORE[airportProfile.baselineRisk] || 55;
  const terminalRiskScore =
    RISK_SCORE[terminalIntelligence.terminalPressure] || 55;
  const variabilityScore =
    RISK_SCORE[terminalIntelligence.securityVariability] || 55;

  let estimatedSecurityMinutes = baseSecurityMinutes;

  if (airportRiskScore >= 70) estimatedSecurityMinutes += 8;
  if (terminalRiskScore >= 70) estimatedSecurityMinutes += 6;
  if (variabilityScore >= 70) estimatedSecurityMinutes += 6;
  if (airportProfile.peakRiskActive) estimatedSecurityMinutes += 7;

  const dynamicSecurityBuffer =
    airlineOperationalProfile.recommendedExtraBuffer +
    (airportProfile.peakRiskActive ? 6 : 0) +
    (terminalIntelligence.securityVariability === "medium" ? 4 : 0);

  const securityRiskScore = clamp(
    Math.round((airportRiskScore + terminalRiskScore + variabilityScore) / 3),
    0,
    100
  );

  const securityRisk = getRiskLevelFromScore(securityRiskScore);

  return {
    securityRisk,
    securityRiskScore,
    estimatedSecurityMinutes,
    dynamicSecurityBuffer,
    confidenceScore: 60,
    confidenceLevel: "medium",
    sourceType: "internal_security_model",
    reasoning: [
      `Segurança estimada em ${estimatedSecurityMinutes} minutos com buffer operacional de ${dynamicSecurityBuffer} minutos.`,
    ],
    flags:
      securityRisk !== "low"
        ? [
            {
              type: "security_variability",
              label: "Variabilidade estimada na segurança",
              severity: securityRisk,
            },
          ]
        : [],
    limitations: [
      "Estimativa de segurança baseada em modelo interno, ainda sem tempos live oficiais.",
    ],
  };
}

function buildLiveSignalsLayer() {
  return {
    liveDataActive: false,
    signals: [],
    confidenceScore: 35,
    confidenceLevel: "low",
    sourceType: "live_signals_placeholder",
    reasoning: [
      "Camada live preparada, mas ainda sem integração com sinais operacionais reais.",
    ],
    flags: [],
    limitations: [
      "Ainda sem reports comunitários validados.",
      "Ainda sem integração com feeds operacionais aeroportuários.",
      "Ainda sem deteção automática de greves, incidentes ou filas em tempo real.",
    ],
  };
}

function arbitrateAirportReliability({
  airportProfile,
  terminalIntelligence,
  airlineOperationalProfile,
  securityIntelligence,
  liveOperationalSignals,
}) {
  const airportRiskScore = RISK_SCORE[airportProfile.baselineRisk] || 55;
  const terminalRiskScore =
    RISK_SCORE[terminalIntelligence.terminalPressure] || 55;
  const securityRiskScore = securityIntelligence.securityRiskScore || 55;

  const combinedRiskScore = clamp(
    Math.round(
      airportRiskScore * 0.3 +
        terminalRiskScore * 0.25 +
        securityRiskScore * 0.3 +
        (airportProfile.peakRiskActive ? 10 : 0) +
        (liveOperationalSignals.liveDataActive ? 0 : 5)
    ),
    0,
    100
  );

  const airportRisk = getRiskLevelFromScore(combinedRiskScore);

  const confidenceScore = clamp(
    Math.round(
      airportProfile.confidenceScore * 0.25 +
        terminalIntelligence.confidenceScore * 0.2 +
        airlineOperationalProfile.confidenceScore * 0.15 +
        securityIntelligence.confidenceScore * 0.25 +
        liveOperationalSignals.confidenceScore * 0.15
    ),
    0,
    100
  );

  const estimatedWalkingMinutes =
    terminalIntelligence.estimatedWalkingMinutes ||
    airportProfile.walkingMinutes?.typical ||
    18;

  const recommendedAirportBuffer =
    securityIntelligence.estimatedSecurityMinutes +
    securityIntelligence.dynamicSecurityBuffer +
    estimatedWalkingMinutes;

  return {
    airportRisk,
    airportRiskScore: combinedRiskScore,
    securityRisk: securityIntelligence.securityRisk,
    terminalPressure: terminalIntelligence.terminalPressure,
    airportComplexity: airportProfile.complexity,
    estimatedSecurityMinutes: securityIntelligence.estimatedSecurityMinutes,
    estimatedWalkingMinutes,
    recommendedAirportBuffer,
    confidenceScore,
    confidenceLevel: getConfidenceLevel(confidenceScore),
    liveDataActive: liveOperationalSignals.liveDataActive,
    sourceType: liveOperationalSignals.liveDataActive
      ? "hybrid_operational_intelligence"
      : "structured_internal_operational_model",
  };
}

export async function getAirportOperationalIntelligence({
  airport,
  airline,
  terminal,
  departureTime,
  passengerProfile = {},
  baggageProfile = {},
} = {}) {
  const airportProfile = buildAirportProfileLayer({
    airport,
    departureTime,
  });

  const terminalIntelligence = buildTerminalIntelligenceLayer({
    airportProfile,
    terminal,
  });

  const airlineOperationalProfile = buildAirlineOperationLayer({
    airline,
    baggageProfile,
    passengerProfile,
  });

  const securityIntelligence = buildSecurityIntelligenceLayer({
    airportProfile,
    terminalIntelligence,
    airlineOperationalProfile,
  });

  const liveOperationalSignals = buildLiveSignalsLayer();

  const operationalIntelligence = arbitrateAirportReliability({
    airportProfile,
    terminalIntelligence,
    airlineOperationalProfile,
    securityIntelligence,
    liveOperationalSignals,
  });

  const reasoning = [
    ...airportProfile.reasoning,
    ...terminalIntelligence.reasoning,
    ...airlineOperationalProfile.reasoning,
    ...securityIntelligence.reasoning,
    ...liveOperationalSignals.reasoning,
  ];

  const intelligenceFlags = [
    ...airportProfile.flags,
    ...terminalIntelligence.flags,
    ...airlineOperationalProfile.flags,
    ...securityIntelligence.flags,
    ...liveOperationalSignals.flags,
  ];

  const limitations = [
    ...airportProfile.limitations,
    ...terminalIntelligence.limitations,
    ...airlineOperationalProfile.limitations,
    ...securityIntelligence.limitations,
    ...liveOperationalSignals.limitations,
  ];

  return {
    success: true,
    airport: airportProfile.airport,
    operationalIntelligence,
    layers: {
      airportProfile,
      terminalIntelligence,
      airlineOperationalProfile,
      securityIntelligence,
      liveOperationalSignals,
    },
    reasoning,
    intelligenceFlags,
    limitations,
  };
}

export default async function handler(req, res) {
  try {
    const {
      airport = "LIS",
      airline = "AF",
      terminal = "1",
      departureTime = new Date().toISOString(),
      bags = "true",
      kids = "false",
      checkedIn = "false",
    } = req.query;

    const result = await getAirportOperationalIntelligence({
      airport,
      airline,
      terminal,
      departureTime,
      passengerProfile: {
        travellingWithKids: toBoolean(kids, false),
        checkedInOnline: toBoolean(checkedIn, false),
      },
      baggageProfile: {
        checkedBags: toBoolean(bags, true) ? 1 : 0,
      },
    });

    return res.status(200).json({
      ...result,
      engine: "Home2Flight Airport Intelligence Engine",
      version: "2.1.0-endpoint-fixed",
      generatedAt: new Date().toISOString(),
      request: {
        airport,
        airline,
        terminal,
        departureTime,
        bags: toBoolean(bags, true),
        kids: toBoolean(kids, false),
        checkedIn: toBoolean(checkedIn, false),
      },
    });
  } catch (error) {
    console.error("[AIRPORT INTELLIGENCE ERROR]", error);

    return res.status(500).json({
      success: false,
      engine: "Home2Flight Airport Intelligence Engine",
      version: "2.1.0-endpoint-fixed",
      error: error.message,
      stack: error.stack,
    });
  }
}