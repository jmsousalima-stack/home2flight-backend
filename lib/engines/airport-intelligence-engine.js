// /lib/engines/airport-intelligence-engine.js

import {
  getAirportOperationalProfile,
  getAirlineOperationalProfile,
} from "./airport-data-registry.js";

const ENGINE_VERSION = "2.2.0-registry-powered-lib";

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

function buildFallbackAirportProfile(airportCode) {
  return {
    code: airportCode,
    name: airportCode,
    city: null,
    country: null,
    complexity: "medium",
    baselineRisk: "medium",
    defaultTerminal: "unknown",
    peakWindows: [],
    walkingMinutes: { min: 10, typical: 18, max: 28 },
    terminalProfiles: {},
    sourceType: "fallback_internal_model",
    confidenceScore: 45,
  };
}

function buildFallbackAirlineProfile(airlineCode, hasCheckedBag) {
  return {
    code: airlineCode,
    name: airlineCode,
    type: "unknown",
    bagDropRisk: hasCheckedBag ? "medium" : "low",
    boardingStrictness: "medium",
    operationalReliability: "medium",
    recommendedExtraBuffer: hasCheckedBag ? 10 : 5,
    sourceType: "fallback_airline_model",
    confidenceScore: 42,
  };
}

function safeGetAirportProfile(airportCode) {
  try {
    const profile = getAirportOperationalProfile(airportCode);
    return profile || buildFallbackAirportProfile(airportCode);
  } catch {
    return buildFallbackAirportProfile(airportCode);
  }
}

function safeGetAirlineProfile(airlineCode, hasCheckedBag) {
  try {
    const profile = getAirlineOperationalProfile(airlineCode);
    return profile || buildFallbackAirlineProfile(airlineCode, hasCheckedBag);
  } catch {
    return buildFallbackAirlineProfile(airlineCode, hasCheckedBag);
  }
}

function buildAirportProfileLayer({ airport, departureTime }) {
  const airportCode = normalizeAirportCode(airport);
  const profile = safeGetAirportProfile(airportCode);

  const profileKnown = profile.code !== "UNKNOWN" && profile.sourceType !== "fallback_internal_model";

  const time = getTimeHHMM(departureTime);
  const matchedPeakWindow = Array.isArray(profile.peakWindows)
    ? profile.peakWindows.find((window) => isWithinWindow(time, window))
    : null;

  return {
    airport: {
      code: profile.code || airportCode,
      name: profile.name || airportCode,
      city: profile.city || null,
      country: profile.country || null,
    },
    complexity: profile.complexity || "medium",
    baselineRisk: profile.baselineRisk || "medium",
    peakRiskActive: Boolean(matchedPeakWindow),
    peakWindowMatched: matchedPeakWindow || null,
    walkingMinutes: profile.walkingMinutes || { min: 10, typical: 18, max: 28 },
    confidenceScore: profile.confidenceScore || (profileKnown ? 68 : 45),
    confidenceLevel: getConfidenceLevel(profile.confidenceScore || (profileKnown ? 68 : 45)),
    sourceType: profile.sourceType || (profileKnown ? "airport_data_registry" : "fallback_internal_model"),
    reasoning: [
      !profileKnown
        ? `Sem perfil específico para ${airportCode}. Aplicado perfil conservador genérico.`
        : matchedPeakWindow
        ? `${profile.code} está dentro de uma janela de maior pressão operacional.`
        : `${profile.code} fora das principais janelas internas de pico.`,
    ],
    flags: !profileKnown
      ? [
          {
            type: "airport_profile_missing",
            label: "Perfil de aeroporto ainda não configurado",
            severity: "medium",
          },
        ]
      : matchedPeakWindow
      ? [
          {
            type: "airport_peak_window",
            label: "Janela de maior pressão operacional",
            severity: matchedPeakWindow.riskImpact || "medium",
          },
        ]
      : [],
    limitations: profileKnown
      ? [
          "Perfil baseado no Airport Data Registry interno, ainda sem filas oficiais em tempo real.",
        ]
      : [
          "Perfil específico do aeroporto ainda não existe na base interna.",
        ],
    rawProfile: profileKnown ? profile : null,
  };
}

function buildTerminalIntelligenceLayer({ airportProfile, terminal }) {
  const selectedTerminal =
    terminal || airportProfile?.rawProfile?.defaultTerminal || "unknown";

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
      limitations: ["Ainda sem dados detalhados por terminal para este aeroporto."],
    };
  }

  return {
    terminal: selectedTerminal,
    terminalKnown: true,
    terminalPressure: terminalProfile.pressure || "medium",
    layoutComplexity: terminalProfile.layoutComplexity || "medium",
    securityVariability: terminalProfile.securityVariability || "medium",
    estimatedWalkingMinutes:
      terminalProfile.walkingMinutes ||
      airportProfile?.walkingMinutes?.typical ||
      18,
    confidenceScore: terminalProfile.confidenceScore || 62,
    confidenceLevel: getConfidenceLevel(terminalProfile.confidenceScore || 62),
    sourceType: terminalProfile.sourceType || "airport_data_registry_terminal_profile",
    reasoning: [
      `Terminal ${selectedTerminal} avaliado com pressão ${
        terminalProfile.pressure || "medium"
      }.`,
    ],
    flags:
      terminalProfile.pressure !== "low"
        ? [
            {
              type: "terminal_pressure",
              label: "Pressão operacional do terminal",
              severity: terminalProfile.pressure || "medium",
            },
          ]
        : [],
    limitations: ["Perfil de terminal ainda baseado em registry interno/heurística operacional."],
  };
}

function buildAirlineOperationLayer({ airline, baggageProfile }) {
  const airlineCode = normalizeAirlineCode(airline);

  const hasCheckedBag =
    baggageProfile?.checkedBags === true ||
    baggageProfile?.checkedBags > 0 ||
    baggageProfile === "checked";

  const profile = safeGetAirlineProfile(airlineCode, hasCheckedBag);
  const profileKnown = profile.sourceType !== "fallback_airline_model";

  return {
    airline: {
      code: profile.code || airlineCode,
      name: profile.name || airlineCode,
    },
    airlineKnown: profileKnown,
    airlineType: profile.type || "unknown",
    bagDropRisk: hasCheckedBag ? profile.bagDropRisk || "medium" : "low",
    boardingStrictness: profile.boardingStrictness || "medium",
    operationalReliability: profile.operationalReliability || "medium",
    recommendedExtraBuffer:
      (profile.recommendedExtraBuffer || 5) + (hasCheckedBag && profileKnown ? 8 : 0),
    confidenceScore: profile.confidenceScore || (profileKnown ? 58 : 42),
    confidenceLevel: getConfidenceLevel(profile.confidenceScore || (profileKnown ? 58 : 42)),
    sourceType: profile.sourceType || (profileKnown ? "airport_data_registry_airline_profile" : "fallback_airline_model"),
    reasoning: [
      !profileKnown
        ? `Sem perfil específico para a companhia ${airlineCode}. Aplicado modelo conservador.`
        : hasCheckedBag
        ? `${profile.name}: passageiro com bagagem de porão, aplicado buffer adicional.`
        : `${profile.name}: sem bagagem de porão, risco de bag drop reduzido.`,
    ],
    flags: !profileKnown
      ? [
          {
            type: "airline_profile_missing",
            label: "Perfil de companhia ainda não configurado",
            severity: "medium",
          },
        ]
      : hasCheckedBag
      ? [
          {
            type: "bag_drop_required",
            label: "Bagagem de porão aumenta variabilidade",
            severity: profile.bagDropRisk || "medium",
          },
        ]
      : [],
    limitations: profileKnown
      ? [
          "Perfil da companhia ainda não ligado a regras oficiais de check-in/bag drop.",
        ]
      : [
          "Perfil da companhia aérea ainda não existe na base interna.",
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