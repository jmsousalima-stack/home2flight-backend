// /lib/engines/airport-intelligence-engine.js

import {
  buildAirportOperationalProfile,
} from "./airport-data-registry.js";

const ENGINE_VERSION = "2.2.1-registry-normalized-lib";

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

function normalizeAirportCode(airport) {
  if (!airport) return "UNKNOWN";
  if (typeof airport === "string") return airport.trim().toUpperCase();
  return String(
    airport.code || airport.iata || airport.airport || "UNKNOWN"
  )
    .trim()
    .toUpperCase();
}

function normalizeAirlineCode(airline) {
  if (!airline) return "UNKNOWN";
  if (typeof airline === "string") return airline.trim().toUpperCase();
  return String(
    airline.code || airline.iata || airline.airline || "UNKNOWN"
  )
    .trim()
    .toUpperCase();
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

function buildAirportProfileLayer({ airport, terminal, departureTime }) {
  const airportCode = normalizeAirportCode(airport);

  const registryProfile = buildAirportOperationalProfile({
    airportCode,
    terminal,
    departureTime,
  });

  const registryAirport = registryProfile.airport || {};
  const registryOperational = registryProfile.operationalProfile || {};

  const airportName = registryAirport.name || airportCode;

  return {
    airport: {
      code: registryAirport.code || airportCode,
      icao: registryAirport.icao || null,
      name: airportName,
      city: registryAirport.city || null,
      country: registryAirport.country || null,
      timezone: registryAirport.timezone || null,
      dedicatedProfile: Boolean(registryAirport.dedicatedProfile),
      coverageScore: registryAirport.coverageScore ?? null,
    },
    complexity: registryOperational.complexity || "medium",
    baselineRisk: registryOperational.baselineRisk || "medium",
    peakRiskActive: Boolean(registryOperational.peakWindowActive),
    peakWindowMatched: registryOperational.peakWindowMatched || null,
    walkingMinutes: {
      min: registryProfile.terminal?.walkingMinutes?.min ?? 10,
      typical:
        registryOperational.estimatedWalkingMinutes ||
        registryProfile.terminal?.walkingMinutes?.typical ||
        18,
      max: registryProfile.terminal?.walkingMinutes?.max ?? 28,
    },
    confidenceScore: registryOperational.confidenceScore || 55,
    confidenceLevel: getConfidenceLevel(
      registryOperational.confidenceScore || 55
    ),
    sourceType: "airport_data_registry",
    reasoning: [
      registryOperational.peakWindowActive
        ? `${airportName} está dentro de uma janela de maior pressão operacional.`
        : `${airportName} fora das principais janelas internas de pico.`,
    ],
    flags: registryOperational.peakWindowActive
      ? [
          {
            type: "airport_peak_window",
            label: "Janela de maior pressão operacional",
            severity:
              registryOperational.peakWindowMatched?.riskImpact || "medium",
          },
        ]
      : [],
    limitations: [
      "Perfil baseado no Airport Data Registry interno, ainda sem filas oficiais em tempo real.",
      ...(registryProfile.limitations || []),
    ],
    rawProfile: registryProfile,
  };
}

function buildTerminalIntelligenceLayer({ airportProfile, terminal }) {
  const registryProfile = airportProfile?.rawProfile;
  const registryTerminal = registryProfile?.terminal;

  const selectedTerminal = String(
    terminal ||
      registryTerminal?.terminal ||
      registryProfile?.airport?.defaultTerminal ||
      "1"
  );

  if (!registryTerminal) {
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
      limitations: ["Ainda sem dados detalhados por terminal para este aeroporto."],
    };
  }

  return {
    terminal: registryTerminal.terminal || selectedTerminal,
    terminalKnown: Boolean(registryTerminal.terminalKnown),
    terminalPressure: registryTerminal.pressure || "medium",
    layoutComplexity: registryTerminal.layoutComplexity || "medium",
    securityVariability: registryTerminal.securityVariability || "medium",
    estimatedWalkingMinutes:
      registryTerminal.walkingMinutes?.typical ||
      airportProfile?.walkingMinutes?.typical ||
      18,
    confidenceScore: registryTerminal.terminalKnown ? 62 : 45,
    confidenceLevel: registryTerminal.terminalKnown ? "medium" : "low",
    sourceType: registryTerminal.terminalKnown
      ? "airport_data_registry_terminal_profile"
      : "fallback_terminal_model",
    reasoning: [
      registryTerminal.terminalKnown
        ? `Terminal ${registryTerminal.terminal} avaliado com pressão ${registryTerminal.pressure}.`
        : `Sem perfil específico para o terminal ${selectedTerminal}. Aplicado modelo conservador.`,
    ],
    flags:
      registryTerminal.pressure !== "low"
        ? [
            {
              type: "terminal_pressure",
              label: "Pressão operacional do terminal",
              severity: registryTerminal.pressure || "medium",
            },
          ]
        : [],
    limitations: [
      registryTerminal.terminalKnown
        ? "Perfil de terminal baseado no Airport Data Registry interno."
        : "Ainda sem dados detalhados por terminal para este aeroporto.",
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
      airline: { code: airlineCode, name: airlineCode },
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
    airline: { code: profile.code, name: profile.name },
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
  const registrySecurityMinutes =
    airportProfile?.rawProfile?.operationalProfile?.estimatedSecurityMinutes;

  const baseSecurityMinutes = registrySecurityMinutes || 18;

  const airportRiskScore = RISK_SCORE[airportProfile.baselineRisk] || 55;
  const terminalRiskScore =
    RISK_SCORE[terminalIntelligence.terminalPressure] || 55;
  const variabilityScore =
    RISK_SCORE[terminalIntelligence.securityVariability] || 55;

  let estimatedSecurityMinutes = baseSecurityMinutes;

  if (!registrySecurityMinutes) {
    if (airportRiskScore >= 70) estimatedSecurityMinutes += 8;
    if (terminalRiskScore >= 70) estimatedSecurityMinutes += 6;
    if (variabilityScore >= 70) estimatedSecurityMinutes += 6;
    if (airportProfile.peakRiskActive) estimatedSecurityMinutes += 7;
  }

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
    sourceType: "internal_security_model_registry_inputs",
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
      "Estimativa de segurança baseada em registry interno, ainda sem tempos live oficiais.",
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
      : "registry_structured_operational_model",
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
    terminal,
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
    engine: "Home2Flight Airport Intelligence Engine",
    version: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
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

export default getAirportOperationalIntelligence;