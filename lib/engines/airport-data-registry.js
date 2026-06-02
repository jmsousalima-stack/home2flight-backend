// /lib/engines/airport-data-registry.js

const AIRPORT_DATA_REGISTRY_VERSION = "0.2.0-airport-airline-compatible";

const AIRPORTS = {
  LIS: {
    code: "LIS",
    icao: "LPPT",
    name: "Lisboa Humberto Delgado",
    city: "Lisbon",
    country: "Portugal",
    timezone: "Europe/Lisbon",
    defaultTerminal: "1",
    complexity: "medium",
    baselineRisk: "medium",
    schengenArea: true,

    terminals: {
      "1": {
        terminal: "1",
        type: "main",
        pressure: "medium",
        layoutComplexity: "medium",
        securityVariability: "medium",
        walkingMinutes: { min: 8, typical: 16, max: 25 },
        passportControlTypicalMinutes: { min: 8, typical: 12, max: 25 },
      },
      "2": {
        terminal: "2",
        type: "low_cost",
        pressure: "medium",
        layoutComplexity: "low",
        securityVariability: "medium",
        walkingMinutes: { min: 6, typical: 12, max: 20 },
        passportControlTypicalMinutes: { min: 8, typical: 12, max: 22 },
      },
    },

    peakWindows: [
      { start: "06:00", end: "09:00", riskImpact: "medium" },
      { start: "17:00", end: "20:00", riskImpact: "medium" },
    ],

    dataCoverage: {
      airportProfile: "structured_internal",
      terminalProfile: "structured_internal",
      securityWaitTimes: "not_live",
      passportControl: "profile_estimate",
      walkingTimes: "profile_estimate",
      bagDropRules: "airline_profile_estimate",
      officialAirportAlerts: "not_connected",
      communityReports: "not_connected",
    },

    limitations: [
      "Ainda sem tempos reais oficiais de segurança.",
      "Ainda sem tempos reais de controlo de passaporte.",
      "Ainda sem integração oficial com alertas operacionais do aeroporto.",
      "Ainda sem reports comunitários validados.",
    ],
  },

  OPO: {
    code: "OPO",
    icao: "LPPR",
    name: "Porto Francisco Sá Carneiro",
    city: "Porto",
    country: "Portugal",
    timezone: "Europe/Lisbon",
    defaultTerminal: "1",
    complexity: "medium",
    baselineRisk: "medium",
    schengenArea: true,

    terminals: {
      "1": {
        terminal: "1",
        type: "main",
        pressure: "medium",
        layoutComplexity: "medium",
        securityVariability: "medium",
        walkingMinutes: { min: 7, typical: 14, max: 22 },
        passportControlTypicalMinutes: { min: 7, typical: 12, max: 22 },
      },
    },

    peakWindows: [
      { start: "06:00", end: "09:00", riskImpact: "medium" },
      { start: "16:30", end: "19:30", riskImpact: "medium" },
    ],

    dataCoverage: {
      airportProfile: "structured_internal",
      terminalProfile: "structured_internal",
      securityWaitTimes: "not_live",
      passportControl: "profile_estimate",
      walkingTimes: "profile_estimate",
      bagDropRules: "airline_profile_estimate",
      officialAirportAlerts: "not_connected",
      communityReports: "not_connected",
    },

    limitations: [
      "Perfil inicial baseado em estimativa operacional interna.",
      "Ainda sem tempos reais oficiais de segurança.",
      "Ainda sem reports comunitários validados.",
    ],
  },

  AMS: {
    code: "AMS",
    icao: "EHAM",
    name: "Amsterdam Schiphol",
    city: "Amsterdam",
    country: "Netherlands",
    timezone: "Europe/Amsterdam",
    defaultTerminal: "1",
    complexity: "high",
    baselineRisk: "medium",
    schengenArea: true,

    terminals: {
      "1": {
        terminal: "1",
        type: "main",
        pressure: "medium",
        layoutComplexity: "high",
        securityVariability: "medium",
        walkingMinutes: { min: 10, typical: 20, max: 35 },
        passportControlTypicalMinutes: { min: 10, typical: 18, max: 35 },
      },
      "2": {
        terminal: "2",
        type: "main",
        pressure: "medium",
        layoutComplexity: "high",
        securityVariability: "medium",
        walkingMinutes: { min: 10, typical: 22, max: 38 },
        passportControlTypicalMinutes: { min: 10, typical: 18, max: 35 },
      },
      "3": {
        terminal: "3",
        type: "main",
        pressure: "medium",
        layoutComplexity: "high",
        securityVariability: "medium",
        walkingMinutes: { min: 12, typical: 25, max: 42 },
        passportControlTypicalMinutes: { min: 12, typical: 20, max: 40 },
      },
    },

    peakWindows: [
      { start: "06:00", end: "09:30", riskImpact: "medium" },
      { start: "15:30", end: "19:30", riskImpact: "medium" },
    ],

    dataCoverage: {
      airportProfile: "structured_internal",
      terminalProfile: "structured_internal",
      securityWaitTimes: "not_live",
      passportControl: "profile_estimate",
      walkingTimes: "profile_estimate",
      bagDropRules: "airline_profile_estimate",
      officialAirportAlerts: "not_connected",
      communityReports: "not_connected",
    },

    limitations: [
      "Aeroporto grande e complexo; estimativas internas devem ser conservadoras.",
      "Ainda sem tempos reais oficiais de segurança ligados.",
      "Ainda sem integração oficial com alertas do aeroporto.",
    ],
  },
};

const AIRLINES = {
  KL: {
    code: "KL",
    name: "KLM",
    type: "legacy",
    bagDropRisk: "medium",
    boardingStrictness: "medium",
    operationalReliability: "high",
    recommendedExtraBuffer: 5,
    limitations: [
      "Perfil interno inicial; ainda sem regras oficiais live de check-in/bag drop.",
    ],
  },

  AF: {
    code: "AF",
    name: "Air France",
    type: "legacy",
    bagDropRisk: "medium",
    boardingStrictness: "medium",
    operationalReliability: "high",
    recommendedExtraBuffer: 5,
    limitations: [
      "Perfil interno inicial; ainda sem regras oficiais live de check-in/bag drop.",
    ],
  },

  TP: {
    code: "TP",
    name: "TAP Air Portugal",
    type: "legacy",
    bagDropRisk: "medium",
    boardingStrictness: "medium",
    operationalReliability: "medium",
    recommendedExtraBuffer: 7,
    limitations: [
      "Perfil interno inicial; ainda sem regras oficiais live de check-in/bag drop.",
    ],
  },

  FR: {
    code: "FR",
    name: "Ryanair",
    type: "low_cost",
    bagDropRisk: "medium",
    boardingStrictness: "high",
    operationalReliability: "medium",
    recommendedExtraBuffer: 10,
    limitations: [
      "Perfil interno inicial; companhia low-cost com maior sensibilidade a regras de embarque/bagagem.",
    ],
  },

  U2: {
    code: "U2",
    name: "easyJet",
    type: "low_cost",
    bagDropRisk: "medium",
    boardingStrictness: "medium",
    operationalReliability: "medium",
    recommendedExtraBuffer: 8,
    limitations: [
      "Perfil interno inicial; ainda sem regras oficiais live de check-in/bag drop.",
    ],
  },
};

const DEFAULT_AIRPORT_PROFILE = {
  code: "UNKNOWN",
  icao: null,
  name: "Unknown airport",
  city: null,
  country: null,
  timezone: "UTC",
  defaultTerminal: "1",
  complexity: "medium",
  baselineRisk: "medium",
  schengenArea: null,

  terminals: {
    "1": {
      terminal: "1",
      type: "generic",
      pressure: "medium",
      layoutComplexity: "medium",
      securityVariability: "medium",
      walkingMinutes: { min: 8, typical: 15, max: 25 },
      passportControlTypicalMinutes: { min: 8, typical: 15, max: 30 },
    },
  },

  peakWindows: [
    { start: "06:00", end: "09:00", riskImpact: "medium" },
    { start: "17:00", end: "20:00", riskImpact: "medium" },
  ],

  dataCoverage: {
    airportProfile: "generic_fallback",
    terminalProfile: "generic_fallback",
    securityWaitTimes: "not_live",
    passportControl: "generic_estimate",
    walkingTimes: "generic_estimate",
    bagDropRules: "airline_profile_estimate",
    officialAirportAlerts: "not_connected",
    communityReports: "not_connected",
  },

  limitations: [
    "Aeroporto ainda sem perfil dedicado.",
    "Estimativa baseada em fallback conservador.",
    "Deve ser melhorado quando houver dados específicos deste aeroporto.",
  ],
};

const DEFAULT_AIRLINE_PROFILE = {
  code: "UNKNOWN",
  name: "Unknown airline",
  type: "unknown",
  bagDropRisk: "medium",
  boardingStrictness: "medium",
  operationalReliability: "medium",
  recommendedExtraBuffer: 8,
  limitations: [
    "Companhia aérea ainda sem perfil dedicado.",
    "Estimativa baseada em fallback conservador.",
  ],
};

export function getAirportRegistryVersion() {
  return AIRPORT_DATA_REGISTRY_VERSION;
}

export function getSupportedAirportCodes() {
  return Object.keys(AIRPORTS).sort();
}

export function getSupportedAirlineCodes() {
  return Object.keys(AIRLINES).sort();
}

export function hasDedicatedAirportProfile(airportCode) {
  const code = normalizeAirportCode(airportCode);
  return Boolean(AIRPORTS[code]);
}

export function hasDedicatedAirlineProfile(airlineCode) {
  const code = normalizeAirlineCode(airlineCode);
  return Boolean(AIRLINES[code]);
}

export function getAirportProfile(airportCode = "LIS") {
  const code = normalizeAirportCode(airportCode);
  const profile = AIRPORTS[code];

  if (!profile) {
    return {
      ...DEFAULT_AIRPORT_PROFILE,
      code,
      dedicatedProfile: false,
      coverageScore: calculateCoverageScore(DEFAULT_AIRPORT_PROFILE),
    };
  }

  return {
    ...profile,
    dedicatedProfile: true,
    coverageScore: calculateCoverageScore(profile),
  };
}

export function getAirlineProfile(airlineCode = "KL") {
  const code = normalizeAirlineCode(airlineCode);
  const profile = AIRLINES[code];

  if (!profile) {
    return {
      ...DEFAULT_AIRLINE_PROFILE,
      code,
      name: code,
      dedicatedProfile: false,
      confidenceScore: 42,
      sourceType: "airline_data_registry_fallback",
    };
  }

  return {
    ...profile,
    dedicatedProfile: true,
    confidenceScore: 58,
    sourceType: "airline_data_registry_profile",
  };
}

export function getTerminalProfile({
  airportCode = "LIS",
  airport = null,
  terminal = null,
} = {}) {
  const resolvedAirportCode = normalizeAirportCode(airportCode || airport);
  const airportProfile = getAirportProfile(resolvedAirportCode);

  const selectedTerminal = String(
    terminal || airportProfile.defaultTerminal || "1"
  );

  const terminalProfile =
    airportProfile.terminals?.[selectedTerminal] ||
    airportProfile.terminals?.[airportProfile.defaultTerminal] ||
    Object.values(airportProfile.terminals || {})[0] ||
    DEFAULT_AIRPORT_PROFILE.terminals["1"];

  return {
    ...terminalProfile,
    terminal: terminalProfile.terminal || selectedTerminal,
    airportCode: airportProfile.code,
    airportName: airportProfile.name,
    terminalKnown: Boolean(airportProfile.terminals?.[selectedTerminal]),
  };
}

export function calculateAirportRiskFromProfile({
  airportCode = "LIS",
  airport = null,
  terminal = null,
  departureTime = null,
} = {}) {
  const resolvedAirportCode = normalizeAirportCode(airportCode || airport);
  const airportProfile = getAirportProfile(resolvedAirportCode);
  const terminalProfile = getTerminalProfile({
    airportCode: resolvedAirportCode,
    terminal,
  });

  const peakWindow = findMatchingPeakWindow({
    airport: airportProfile,
    departureTime,
  });

  let riskScore = 35;

  if (airportProfile.baselineRisk === "medium") riskScore += 12;
  if (airportProfile.baselineRisk === "high") riskScore += 24;

  if (airportProfile.complexity === "medium") riskScore += 8;
  if (airportProfile.complexity === "high") riskScore += 18;

  if (terminalProfile.pressure === "medium") riskScore += 6;
  if (terminalProfile.pressure === "high") riskScore += 14;

  if (terminalProfile.securityVariability === "medium") riskScore += 6;
  if (terminalProfile.securityVariability === "high") riskScore += 14;

  if (peakWindow?.riskImpact === "medium") riskScore += 10;
  if (peakWindow?.riskImpact === "high") riskScore += 18;

  riskScore = Math.max(0, Math.min(95, riskScore));

  return {
    airportCode: airportProfile.code,
    terminal: terminalProfile.terminal,
    riskScore,
    riskLevel: riskScore >= 70 ? "high" : riskScore >= 45 ? "medium" : "low",
    peakWindowActive: Boolean(peakWindow),
    peakWindowMatched: peakWindow,
    confidenceScore: airportProfile.dedicatedProfile ? 64 : 42,
    sourceType: airportProfile.dedicatedProfile
      ? "airport_data_registry_profile"
      : "airport_data_registry_fallback",
    liveDataActive: false,
    reasoning: buildAirportRiskReasoning({
      airport: airportProfile,
      terminalProfile,
      peakWindow,
    }),
    limitations: airportProfile.limitations || [],
  };
}

export function buildAirportOperationalProfile({
  airportCode = "LIS",
  airport = null,
  terminal = null,
  departureTime = null,
} = {}) {
  const resolvedAirportCode = normalizeAirportCode(airportCode || airport);
  const airportProfile = getAirportProfile(resolvedAirportCode);
  const terminalProfile = getTerminalProfile({
    airportCode: resolvedAirportCode,
    terminal,
  });

  const risk = calculateAirportRiskFromProfile({
    airportCode: resolvedAirportCode,
    terminal,
    departureTime,
  });

  return {
    success: true,
    engine: "Home2Flight Airport Data Registry",
    version: AIRPORT_DATA_REGISTRY_VERSION,
    generatedAt: new Date().toISOString(),

    airport: {
      code: airportProfile.code,
      icao: airportProfile.icao,
      name: airportProfile.name,
      city: airportProfile.city,
      country: airportProfile.country,
      timezone: airportProfile.timezone,
      dedicatedProfile: airportProfile.dedicatedProfile,
      coverageScore: airportProfile.coverageScore,
    },

    terminal: terminalProfile,

    operationalProfile: {
      airportRisk: risk.riskLevel,
      airportRiskScore: risk.riskScore,
      complexity: airportProfile.complexity,
      baselineRisk: airportProfile.baselineRisk,
      peakWindowActive: risk.peakWindowActive,
      peakWindowMatched: risk.peakWindowMatched,
      estimatedWalkingMinutes: terminalProfile.walkingMinutes?.typical || 15,
      estimatedSecurityMinutes: estimateSecurityMinutes({
        riskLevel: risk.riskLevel,
        terminalProfile,
      }),
      estimatedPassportControlMinutes:
        terminalProfile.passportControlTypicalMinutes?.typical || 15,
      confidenceScore: risk.confidenceScore,
      sourceType: risk.sourceType,
      liveDataActive: false,
    },

    dataCoverage: airportProfile.dataCoverage,
    reasoning: risk.reasoning,
    limitations: airportProfile.limitations || [],
  };
}

export function buildAirlineOperationalProfile({
  airlineCode = "KL",
  airline = null,
  baggageProfile = {},
} = {}) {
  const resolvedAirlineCode = normalizeAirlineCode(airlineCode || airline);
  const profile = getAirlineProfile(resolvedAirlineCode);

  const hasCheckedBag =
    baggageProfile?.checkedBags === true ||
    Number(baggageProfile?.checkedBags || 0) > 0 ||
    baggageProfile === "checked";

  return {
    success: true,
    engine: "Home2Flight Airport Data Registry",
    version: AIRPORT_DATA_REGISTRY_VERSION,
    generatedAt: new Date().toISOString(),

    airline: {
      code: profile.code,
      name: profile.name,
      dedicatedProfile: profile.dedicatedProfile,
    },

    operationalProfile: {
      airlineType: profile.type,
      bagDropRisk: hasCheckedBag ? profile.bagDropRisk : "low",
      boardingStrictness: profile.boardingStrictness,
      operationalReliability: profile.operationalReliability,
      recommendedExtraBuffer:
        profile.recommendedExtraBuffer + (hasCheckedBag ? 8 : 0),
      confidenceScore: profile.confidenceScore,
      sourceType: profile.sourceType,
      liveDataActive: false,
    },

    reasoning: [
      hasCheckedBag
        ? `${profile.name}: passageiro com bagagem de porão, aplicado buffer adicional.`
        : `${profile.name}: sem bagagem de porão, risco de bag drop reduzido.`,
    ],

    limitations: profile.limitations || [],
  };
}

/**
 * Compatibility aliases.
 * These prevent breakage if another engine calls older/newer names.
 */
export const getAirportOperationalProfile = buildAirportOperationalProfile;
export const getAirlineOperationalProfile = buildAirlineOperationalProfile;

function normalizeAirportCode(value) {
  if (!value) return "LIS";

  if (typeof value === "object") {
    return String(
      value.code || value.iata || value.airport || value.airportCode || "LIS"
    )
      .trim()
      .toUpperCase();
  }

  return String(value).trim().toUpperCase();
}

function normalizeAirlineCode(value) {
  if (!value) return "KL";

  if (typeof value === "object") {
    return String(
      value.code || value.iata || value.airline || value.airlineCode || "KL"
    )
      .trim()
      .toUpperCase();
  }

  return String(value).trim().toUpperCase();
}

function calculateCoverageScore(profile) {
  const coverage = profile.dataCoverage || {};
  let score = 20;

  if (coverage.airportProfile === "structured_internal") score += 20;
  if (coverage.terminalProfile === "structured_internal") score += 15;
  if (coverage.securityWaitTimes === "live") score += 20;
  if (coverage.passportControl === "profile_estimate") score += 8;
  if (coverage.walkingTimes === "profile_estimate") score += 8;
  if (coverage.officialAirportAlerts === "connected") score += 15;
  if (coverage.communityReports === "connected") score += 14;

  return Math.max(0, Math.min(100, score));
}

function findMatchingPeakWindow({ airport, departureTime }) {
  if (!departureTime || !airport?.peakWindows?.length) return null;

  const date = new Date(departureTime);
  if (Number.isNaN(date.getTime())) return null;

  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const time = `${hour}:${minute}`;

  return (
    airport.peakWindows.find((window) => {
      return time >= window.start && time <= window.end;
    }) || null
  );
}

function estimateSecurityMinutes({ riskLevel, terminalProfile }) {
  const variability = terminalProfile.securityVariability || "medium";

  if (riskLevel === "high") return variability === "high" ? 35 : 28;
  if (riskLevel === "medium") return variability === "high" ? 26 : 18;
  return variability === "high" ? 18 : 12;
}

function buildAirportRiskReasoning({ airport, terminalProfile, peakWindow }) {
  const reasoning = [];

  reasoning.push(
    `${airport.code} avaliado com complexidade ${airport.complexity} e risco base ${airport.baselineRisk}.`
  );

  reasoning.push(
    `Terminal ${terminalProfile.terminal} com pressão ${terminalProfile.pressure} e variabilidade de segurança ${terminalProfile.securityVariability}.`
  );

  if (peakWindow) {
    reasoning.push(
      `Hora do voo cruza janela de pico ${peakWindow.start}-${peakWindow.end}.`
    );
  } else {
    reasoning.push("Sem janela de pico relevante detetada para esta hora.");
  }

  if (!airport.dedicatedProfile) {
    reasoning.push(
      "Aeroporto sem perfil dedicado; aplicado fallback conservador."
    );
  }

  return reasoning;
}

export default {
  getAirportRegistryVersion,
  getSupportedAirportCodes,
  getSupportedAirlineCodes,
  hasDedicatedAirportProfile,
  hasDedicatedAirlineProfile,
  getAirportProfile,
  getAirlineProfile,
  getTerminalProfile,
  calculateAirportRiskFromProfile,
  buildAirportOperationalProfile,
  buildAirlineOperationalProfile,
  getAirportOperationalProfile,
  getAirlineOperationalProfile,
};