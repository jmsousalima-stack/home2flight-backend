// /lib/engines/border-intelligence-engine.js

const ENGINE_VERSION = "1.0.0-schengen-foundation";

const SCHENGEN_COUNTRIES = new Set([
  "AT", "BE", "BG", "HR", "CZ", "DK", "EE", "FI", "FR", "DE",
  "GR", "HU", "IS", "IT", "LV", "LI", "LT", "LU", "MT", "NL",
  "NO", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "CH"
]);

const AIRPORT_COUNTRY = {
  LIS: "PT",
  OPO: "PT",
  FAO: "PT",

  AMS: "NL",
  MAD: "ES",
  BCN: "ES",
  CDG: "FR",
  ORY: "FR",
  LHR: "GB",
  LGW: "GB",
  STN: "GB",
  MAN: "GB",
  FCO: "IT",
  MXP: "IT",
  CIA: "IT",
  FRA: "DE",
  MUC: "DE",
  BRU: "BE",
  ZRH: "CH",
  GVA: "CH",
  VIE: "AT",
  CPH: "DK",
  DUB: "IE",
  JFK: "US",
  EWR: "US",
  BOS: "US",
  MIA: "US",
  GRU: "BR",
  GIG: "BR",
  CMN: "MA",
  RAK: "MA",
  DXB: "AE",
  DOH: "QA",
  IST: "TR"
};

function normalizeAirportCode(value) {
  if (!value) return null;
  return String(value).trim().toUpperCase();
}

function getCountryFromAirport(code) {
  const normalized = normalizeAirportCode(code);
  if (!normalized) return null;
  return AIRPORT_COUNTRY[normalized] || null;
}

function classifyBorderFlow({ originAirport, destinationAirport }) {
  const originCountry = getCountryFromAirport(originAirport);
  const destinationCountry = getCountryFromAirport(destinationAirport);

  if (!originCountry || !destinationCountry) {
    return {
      borderRequired: true,
      borderFlow: "unknown_conservative",
      flightType: "passport",
      passportControlMinutes: 12,
      extraBufferMinutes: 8,
      confidenceScore: 42,
      trustLevel: "low",
      reasoning:
        "Não foi possível determinar com confiança o país de origem/destino. Aplicada postura conservadora com controlo documental.",
      limitations: [
        "Aeroporto sem mapeamento de país no Border Intelligence Engine.",
        "Ainda sem base global completa IATA → país.",
      ],
    };
  }

  const originSchengen = SCHENGEN_COUNTRIES.has(originCountry);
  const destinationSchengen = SCHENGEN_COUNTRIES.has(destinationCountry);

  if (originSchengen && destinationSchengen) {
    return {
      borderRequired: false,
      borderFlow: "schengen_to_schengen",
      flightType: "schengen",
      passportControlMinutes: 0,
      extraBufferMinutes: 0,
      confidenceScore: 82,
      trustLevel: "high",
      reasoning:
        "Origem e destino pertencem ao espaço Schengen. Não é esperado controlo de passaporte na partida.",
      limitations: [
        "Pode existir controlo documental pontual por razões operacionais ou de segurança.",
      ],
    };
  }

  if (originSchengen && !destinationSchengen) {
    return {
      borderRequired: true,
      borderFlow: "schengen_to_non_schengen",
      flightType: "passport",
      passportControlMinutes: 12,
      extraBufferMinutes: 8,
      confidenceScore: 78,
      trustLevel: "high",
      reasoning:
        "Voo de espaço Schengen para destino fora de Schengen. Controlo de passaporte/fronteira considerado.",
      limitations: [
        "Tempo ainda baseado em perfil interno, sem fila real de fronteira.",
      ],
    };
  }

  if (!originSchengen && destinationSchengen) {
    return {
      borderRequired: true,
      borderFlow: "non_schengen_to_schengen",
      flightType: "passport_arrival",
      passportControlMinutes: 0,
      extraBufferMinutes: 0,
      confidenceScore: 74,
      trustLevel: "medium",
      reasoning:
        "Destino Schengen vindo de fora de Schengen. Controlo principal tende a ocorrer à chegada, não na partida Home2Flight.",
      limitations: [
        "A Home2Flight neste momento calcula sobretudo a jornada pré-partida.",
      ],
    };
  }

  return {
    borderRequired: true,
    borderFlow: "non_schengen_to_non_schengen",
    flightType: "passport",
    passportControlMinutes: 12,
    extraBufferMinutes: 8,
    confidenceScore: 68,
    trustLevel: "medium",
    reasoning:
      "Rota fora do espaço Schengen. Mantida margem para controlo documental.",
    limitations: [
      "Ainda sem regras específicas por país, aeroporto e terminal.",
    ],
  };
}

export async function getBorderIntelligence({
  flight = null,
  flightData = null,
  flightIntelligence = null,
  originAirport = null,
  destinationAirport = null,
} = {}) {
  const resolvedOrigin =
    normalizeAirportCode(originAirport) ||
    normalizeAirportCode(flightData?.route?.from?.code) ||
    normalizeAirportCode(flightIntelligence?.flight?.route?.from?.code);

  const resolvedDestination =
    normalizeAirportCode(destinationAirport) ||
    normalizeAirportCode(flightData?.route?.to?.code) ||
    normalizeAirportCode(flightIntelligence?.flight?.route?.to?.code);

  const classification = classifyBorderFlow({
    originAirport: resolvedOrigin,
    destinationAirport: resolvedDestination,
  });

  return {
    success: true,
    engine: "Home2Flight Border Intelligence Engine",
    version: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    flight,
    route: {
      from: {
        airport: resolvedOrigin,
        country: getCountryFromAirport(resolvedOrigin),
        schengen: SCHENGEN_COUNTRIES.has(getCountryFromAirport(resolvedOrigin)),
      },
      to: {
        airport: resolvedDestination,
        country: getCountryFromAirport(resolvedDestination),
        schengen: SCHENGEN_COUNTRIES.has(
          getCountryFromAirport(resolvedDestination)
        ),
      },
    },
    borderIntelligence: classification,
    operationalSignals: [
      classification.borderRequired
        ? {
            id: "border_control_required",
            type: "border_control",
            title: "Controlo de fronteira/passaporte necessário",
            severity: "medium",
            confidenceScore: classification.confidenceScore,
            sourceType: "border_intelligence_engine",
            freshness: "computed",
            affects: ["passport_control", "gate_timing"],
            extraBufferMinutes: classification.extraBufferMinutes,
            reasoning: classification.reasoning,
          }
        : {
            id: "schengen_no_passport_control",
            type: "border_control",
            title: "Sem controlo de passaporte previsto",
            severity: "low",
            confidenceScore: classification.confidenceScore,
            sourceType: "border_intelligence_engine",
            freshness: "computed",
            affects: ["passport_control", "gate_timing"],
            extraBufferMinutes: 0,
            reasoning: classification.reasoning,
          },
    ],
    limitations: classification.limitations,
  };
}

export default getBorderIntelligence;