// /lib/engines/airport-data-registry.js

const AIRPORT_DATA_REGISTRY_VERSION = "0.1.0-foundation";

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

    sourcePriority: [
      "official_airport",
      "official_transport",
      "flight_provider",
      "maps_provider",
      "weather_provider",
      "community_reports",
      "internal_profile",
    ],

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

export function getAirportRegistryVersion() {
  return AIRPORT_DATA_REGISTRY_VERSION;
}

export function getSupportedAirportCodes() {
  return Object.keys(AIRPORTS).sort();
}

export function hasDedicatedAirportProfile(airportCode) {
  const code = normalizeAirportCode(airportCode);
  return Boolean(AIRPORTS[code]);
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

export function getTerminalProfile({
  airportCode = "LIS",
  terminal = null,
} = {}) {
  const airport = getAirportProfile(airportCode);
  const selectedTerminal = String(
    terminal || airport.defaultTerminal || "1"
  );

  const terminalProfile =
    airport.terminals?.[selectedTerminal] ||
    airport.terminals?.[airport.defaultTerminal] ||
    Object.values(airport.terminals || {})[0] ||
    DEFAULT_AIRPORT_PROFILE.terminals["1"];

  return {
    ...terminalProfile,
    terminal: terminalProfile.terminal || selectedTerminal,
    airportCode: airport.code,
    airportName: airport.name,
    terminalKnown: Boolean(airport.terminals?.[selectedTerminal]),
  };
}

export function calculateAirportRiskFromProfile({
  airportCode = "LIS",
  terminal = null,
  departureTime = null,
} = {}) {
  const airport = getAirportProfile(airportCode);
  const terminalProfile = getTerminalProfile({ airportCode, terminal });

  const peakWindow = findMatchingPeakWindow({
    airport,
    departureTime,
  });

  let riskScore = 35;

  if (airport.baselineRisk === "medium") riskScore += 12;
  if (airport.baselineRisk === "high") riskScore += 24;

  if (airport.complexity === "medium") riskScore += 8;
  if (airport.complexity === "high") riskScore += 18;

  if (terminalProfile.pressure === "medium") riskScore += 6;
  if (terminalProfile.pressure === "high") riskScore += 14;

  if (terminalProfile.securityVariability === "medium") riskScore += 6;
  if (terminalProfile.securityVariability === "high") riskScore += 14;

  if (peakWindow?.riskImpact === "medium") riskScore += 10;
  if (peakWindow?.riskImpact === "high") riskScore += 18;

  riskScore = Math.max(0, Math.min(95, riskScore));

  return {
    airportCode: airport.code,
    terminal: terminalProfile.terminal,
    riskScore,
    riskLevel: riskScore >= 70 ? "high" : riskScore >= 45 ? "medium" : "low",
    peakWindowActive: Boolean(peakWindow),
    peakWindowMatched: peakWindow,
    confidenceScore: airport.dedicatedProfile ? 64 : 42,
    sourceType: airport.dedicatedProfile
      ? "airport_data_registry_profile"
      : "airport_data_registry_fallback",
    liveDataActive: false,
    reasoning: buildAirportRiskReasoning({
      airport,
      terminalProfile,
      peakWindow,
      riskScore,
    }),
    limitations: airport.limitations || [],
  };
}

export function buildAirportOperationalProfile({
  airportCode = "LIS",
  terminal = null,
  departureTime = null,
} = {}) {
  const airport = getAirportProfile(airportCode);
  const terminalProfile = getTerminalProfile({ airportCode, terminal });
  const risk = calculateAirportRiskFromProfile({
    airportCode,
    terminal,
    departureTime,
  });

  return {
    success: true,
    engine: "Home2Flight Airport Data Registry",
    version: AIRPORT_DATA_REGISTRY_VERSION,
    generatedAt: new Date().toISOString(),

    airport: {
      code: airport.code,
      icao: airport.icao,
      name: airport.name,
      city: airport.city,
      country: airport.country,
      timezone: airport.timezone,
      dedicatedProfile: airport.dedicatedProfile,
      coverageScore: airport.coverageScore,
    },

    terminal: terminalProfile,

    operationalProfile: {
      airportRisk: risk.riskLevel,
      airportRiskScore: risk.riskScore,
      complexity: airport.complexity,
      baselineRisk: airport.baselineRisk,
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

    dataCoverage: airport.dataCoverage,
    reasoning: risk.reasoning,
    limitations: airport.limitations || [],
  };
}

function normalizeAirportCode(value) {
  return String(value || "LIS").trim().toUpperCase();
}

function calculateCoverageScore(profile) {
  const coverage = profile.dataCoverage || {};
  let score = 20;

  if (coverage.airportProfile === "structured_internal") score += 20;
  if (coverage.terminalProfile === "structured_internal") score += 15;
  if (coverage.securityWaitTimes === "live") score += 20;
  if (coverage.securityWaitTimes === "not_live") score += 0;
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

  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
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
  hasDedicatedAirportProfile,
  getAirportProfile,
  getTerminalProfile,
  calculateAirportRiskFromProfile,
  buildAirportOperationalProfile,
};