// /lib/engines/flight-discovery-engine.js

import { getFlightStatusIntelligence } from "./flight-status-engine.js";

const ENGINE_VERSION = "1.0.0-foundation";

function normalizeFlightNumber(value) {
  return String(value || "").trim().replace(/\s+/g, "").toUpperCase();
}

function extractAirlineCode(flightNumber) {
  const match = normalizeFlightNumber(flightNumber).match(/^[A-Z]{2,3}/);
  return match ? match[0] : null;
}

function getPrimaryFlightData(flightIntelligence) {
  return flightIntelligence?.flight || null;
}

function getFlightDecision(flightIntelligence) {
  return flightIntelligence?.flightDecision || null;
}

export async function runFlightDiscoveryEngine({
  flight = "KL1578",
  flightDate = null,
  airport = "LIS",
  terminal = "1",
  forceManualTime = false,
  departureTime = "",
} = {}) {
  const normalizedFlight = normalizeFlightNumber(flight);
  const normalizedAirport = String(airport || "LIS").toUpperCase();
  const normalizedTerminal = String(terminal || "1");
  const airline = extractAirlineCode(normalizedFlight);

  const flightIntelligence = await getFlightStatusIntelligence({
    flightNumber: normalizedFlight,
    flight: normalizedFlight,
    flightDate,
    airline,
    airport: normalizedAirport,
    terminal: normalizedTerminal,
    manualDepartureTime: forceManualTime ? departureTime : null,
    departureTime: forceManualTime ? departureTime : null,
    forceManualTime,
  });

  const flightData = getPrimaryFlightData(flightIntelligence);
  const decision = getFlightDecision(flightIntelligence);

  const departure =
    decision?.estimatedDeparture ||
    decision?.scheduledDeparture ||
    flightData?.departure?.estimated ||
    flightData?.departure?.scheduled ||
    null;

  const destinationAirport =
    flightData?.route?.to?.code ||
    flightData?.arrival?.airport ||
    decision?.destinationAirport ||
    null;

  const originAirport =
    flightData?.route?.from?.code ||
    normalizedAirport ||
    null;

  const discovered = Boolean(departure);

  return {
    success: discovered,
    engine: "Home2Flight Flight Discovery Engine",
    version: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),

    discoveryStatus: discovered ? "flight_discovered" : "flight_not_found",

    request: {
      flight: normalizedFlight,
      flightDate,
      airport: normalizedAirport,
      terminal: normalizedTerminal,
    },

    flight: {
      number: normalizedFlight,
      airline: {
        code: decision?.airline || airline,
        name: flightData?.airline?.name || decision?.airline || airline,
      },
      status: decision?.status || flightData?.status || "unknown",
      providerStatusRaw: flightData?.providerStatusRaw || null,
      originAirport,
      destinationAirport,
      terminal:
        decision?.terminal ||
        flightData?.departure?.terminal ||
        normalizedTerminal,
      gate:
        decision?.gate ||
        flightData?.departure?.gate ||
        null,
      departure: {
        scheduled:
          decision?.scheduledDeparture ||
          flightData?.departure?.scheduled ||
          null,
        estimated:
          decision?.estimatedDeparture ||
          flightData?.departure?.estimated ||
          null,
        selected: departure,
        delayMinutes:
          decision?.delayMinutes ??
          flightData?.departure?.delayMinutes ??
          null,
      },
      arrival: {
        scheduled: flightData?.arrival?.scheduled || null,
        estimated: flightData?.arrival?.estimated || null,
        delayMinutes: flightData?.arrival?.delayMinutes ?? null,
      },
    },

    reliability: {
      confidenceScore:
        decision?.confidenceScore ||
        flightIntelligence?.reliability?.confidenceScore ||
        0,
      trustLevel:
        decision?.trustLevel ||
        flightIntelligence?.reliability?.trustLevel ||
        "low",
      liveDataActive: Boolean(
        decision?.liveDataActive ||
          flightIntelligence?.reliability?.liveDataActive
      ),
      selectedProvider:
        decision?.selectedProvider ||
        flightIntelligence?.provider?.name ||
        null,
      selectedSourceType:
        decision?.selectedSourceType ||
        flightIntelligence?.reliability?.sourceType ||
        null,
    },

    intelligenceSummary:
      flightIntelligence?.intelligenceSummary || {
        operationalStatus: discovered ? "available" : "unavailable",
        summary: discovered
          ? "Voo identificado com dados suficientes para preparar timeline."
          : "Não foi possível identificar hora de partida para este voo.",
      },

    source: flightIntelligence,
  };
}

export default runFlightDiscoveryEngine;