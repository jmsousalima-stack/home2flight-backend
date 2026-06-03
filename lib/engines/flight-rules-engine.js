// /lib/engines/flight-rules-engine.js

const FLIGHT_RULES_ENGINE_VERSION = "0.1.0-foundation";

const SCHENGEN_COUNTRIES = new Set([
  "Austria",
  "Belgium",
  "Bulgaria",
  "Croatia",
  "Czech Republic",
  "Denmark",
  "Estonia",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "Iceland",
  "Italy",
  "Latvia",
  "Liechtenstein",
  "Lithuania",
  "Luxembourg",
  "Malta",
  "Netherlands",
  "Norway",
  "Poland",
  "Portugal",
  "Romania",
  "Slovakia",
  "Slovenia",
  "Spain",
  "Sweden",
  "Switzerland",
]);

function normalizeCountry(value) {
  if (!value) return null;
  return String(value).trim();
}

function normalizeAirportCode(value) {
  if (!value) return null;
  return String(value).trim().toUpperCase();
}

function isSchengenCountry(country) {
  const normalized = normalizeCountry(country);
  if (!normalized) return null;
  return SCHENGEN_COUNTRIES.has(normalized);
}

export function inferFlightRules({
  originAirport,
  destinationAirport,
  from,
  to,
  passengerNationality = null,
} = {}) {
  const originCode = normalizeAirportCode(
    originAirport?.code || originAirport?.iata || from?.code || from?.iata
  );

  const destinationCode = normalizeAirportCode(
    destinationAirport?.code || destinationAirport?.iata || to?.code || to?.iata
  );

  const originCountry = normalizeCountry(
    originAirport?.country || from?.country || null
  );

  const destinationCountry = normalizeCountry(
    destinationAirport?.country || to?.country || null
  );

  const originSchengen = isSchengenCountry(originCountry);
  const destinationSchengen = isSchengenCountry(destinationCountry);

  let passportControlRequired = true;
  let flightArea = "unknown";
  let confidenceScore = 45;
  let reason = "Informação insuficiente para inferir regras do voo com elevada confiança.";

  if (originSchengen === true && destinationSchengen === true) {
    passportControlRequired = false;
    flightArea = "schengen";
    confidenceScore = 82;
    reason =
      "Origem e destino estão no Espaço Schengen. Controlo de passaporte regular não é esperado.";
  }

  if (originSchengen === true && destinationSchengen === false) {
    passportControlRequired = true;
    flightArea = "schengen_to_non_schengen";
    confidenceScore = 78;
    reason =
      "Voo de país Schengen para país fora do Espaço Schengen. Controlo documental/fronteiriço é provável.";
  }

  if (originSchengen === false && destinationSchengen === true) {
    passportControlRequired = true;
    flightArea = "non_schengen_to_schengen";
    confidenceScore = 78;
    reason =
      "Voo de país fora do Espaço Schengen para país Schengen. Controlo documental/fronteiriço é provável.";
  }

  if (originSchengen === false && destinationSchengen === false) {
    passportControlRequired = true;
    flightArea = "non_schengen";
    confidenceScore = 65;
    reason =
      "Origem e destino fora do Espaço Schengen ou sem cobertura completa. Mantida decisão conservadora.";
  }

  const trustLevel =
    confidenceScore >= 80 ? "high" : confidenceScore >= 60 ? "medium" : "low";

  return {
    success: true,
    engine: "Home2Flight Flight Rules Engine",
    version: FLIGHT_RULES_ENGINE_VERSION,
    generatedAt: new Date().toISOString(),

    route: {
      originAirport: originCode,
      destinationAirport: destinationCode,
      originCountry,
      destinationCountry,
      originSchengen,
      destinationSchengen,
    },

    rules: {
      flightArea,
      passportControlRequired,
      passengerNationality,
    },

    reliability: {
      confidenceScore,
      trustLevel,
      sourceType: "internal_schengen_rules_model",
      liveDataActive: false,
    },

    reasoning: [reason],

    limitations: [
      "Primeira versão baseada em regras internas do Espaço Schengen.",
      "Ainda não considera nacionalidade, vistos, residência, menores, escalas ou regras especiais.",
      "Ainda não cruza regras oficiais por país, companhia ou aeroporto.",
    ],
  };
}

export default inferFlightRules;