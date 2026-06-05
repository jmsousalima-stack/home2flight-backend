// /lib/engines/border-intelligence-engine.js

const ENGINE_VERSION = "1.0.1-lib-exportable";

function normalize(value, fallback = "") {
  return String(value || fallback).trim().toUpperCase();
}

export async function runBorderIntelligenceEngine({
  airport = "LIS",
  destinationAirport = null,
  flightType = "auto",
  terminal = "1",
  airline = null,
  flight = null,
} = {}) {
  const normalizedAirport = normalize(airport, "LIS");
  const normalizedDestination = normalize(destinationAirport, "");
  const normalizedFlightType = String(flightType || "auto").toLowerCase();

  let effectiveFlightType = normalizedFlightType;

  if (normalizedFlightType === "auto") {
    if (normalizedDestination === "AMS") {
      effectiveFlightType = "schengen";
    } else if (normalizedDestination) {
      effectiveFlightType = "passport";
    } else {
      effectiveFlightType = "passport";
    }
  }

  const passportRequired = effectiveFlightType === "passport";

  return {
    success: true,
    engine: "Home2Flight Border Intelligence Engine",
    version: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),

    request: {
      airport: normalizedAirport,
      destinationAirport: normalizedDestination || null,
      terminal: String(terminal || "1"),
      airline,
      flight,
      flightType: normalizedFlightType,
    },

    borderIntelligence: {
      effectiveFlightType,
      passportControlRequired: passportRequired,
      estimatedPassportControlMinutes: passportRequired ? 12 : 0,
      confidenceScore: normalizedDestination ? 70 : 45,
      trustLevel: normalizedDestination ? "medium" : "low",
      sourceType: "internal_border_rules_foundation",
      liveDataActive: false,
    },

    operationalSignals: passportRequired
      ? [
          {
            id: "passport_control_required",
            type: "passport_control",
            title: "Controlo de passaporte necessário",
            severity: "medium",
            confidenceScore: 75,
            sourceType: "border_intelligence_engine",
            freshness: "profile",
            affects: ["passport_control", "gate_timing"],
            extraBufferMinutes: 8,
            reasoning:
              "O motor classificou este voo como sujeito a controlo documental/fronteiriço.",
          },
        ]
      : [
          {
            id: "passport_control_not_required",
            type: "passport_control",
            title: "Sem controlo de passaporte previsto",
            severity: "low",
            confidenceScore: 75,
            sourceType: "border_intelligence_engine",
            freshness: "profile",
            affects: ["passport_control", "gate_timing"],
            extraBufferMinutes: 0,
            reasoning:
              "O motor classificou este voo como Schengen, sem controlo de passaporte previsto.",
          },
        ],

    intelligenceSummary: {
      operationalStatus: passportRequired ? "passport_required" : "schengen_flow",
      summary: passportRequired
        ? "Controlo de passaporte considerado na timeline operacional."
        : "Fluxo Schengen considerado; controlo de passaporte removido da timeline.",
    },

    limitations: [
      "Primeira versão baseada em regras internas.",
      "Ainda sem tabela completa país/aeroporto Schengen.",
      "Ainda sem validação oficial por rota, terminal e companhia.",
    ],
  };
}

export default runBorderIntelligenceEngine;