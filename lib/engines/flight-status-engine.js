// /lib/engines/flight-status-engine.js

import { runFlightSourceArbitration } from "./flight-source-arbitration-engine.js";

const ENGINE_VERSION = "0.5.0-multi-source-aerodatabox";

export async function getFlightStatusIntelligence({
  flightNumber = "AF1195",
  airline = null,
  airport = null,
  terminal = null,
  manualDepartureTime = null,
  departureTime = null,
  forceManualTime = false,
} = {}) {
  const normalizedFlightNumber = String(flightNumber || "AF1195").toUpperCase();
  const normalizedAirline = String(
    airline || normalizedFlightNumber.slice(0, 2)
  ).toUpperCase();
  const normalizedAirport = airport ? String(airport).toUpperCase() : "";
  const normalizedTerminal = terminal ? String(terminal) : null;
  const normalizedManualDepartureTime =
    manualDepartureTime || departureTime || null;

  const aviationStackSource = await fetchAviationStackSource({
    flightNumber: normalizedFlightNumber,
  });

  const aeroDataBoxSource = await fetchAeroDataBoxSource({
    flightNumber: normalizedFlightNumber,
    airline: normalizedAirline,
    airport: normalizedAirport,
    terminal: normalizedTerminal,
    manualDepartureTime: normalizedManualDepartureTime,
  });

  const usableSources = [
    aviationStackSource?.source || null,
    aeroDataBoxSource?.source || null,
  ].filter(Boolean);

  const flightSourceDecision = await runFlightSourceArbitration({
    flight: normalizedFlightNumber,
    airline: normalizedAirline,
    airport: normalizedAirport,
    terminal: normalizedTerminal,
    manualDepartureTime: normalizedManualDepartureTime,
    forceManualTime,
    sources: usableSources,
  });

  const selectedFlight = buildSelectedFlight({
    flightNumber: normalizedFlightNumber,
    airline: normalizedAirline,
    airport: normalizedAirport,
    terminal: normalizedTerminal,
    sourceDecision: flightSourceDecision,
    aviationStackSource,
    aeroDataBoxSource,
  });

  const reliability = calculateReliabilityFromDecision({
    decision: flightSourceDecision?.flightDecision,
    sources: usableSources,
  });

  const operationalSignals = buildOperationalSignals(selectedFlight);
  const intelligenceSummary = buildIntelligenceSummary(selectedFlight);

  const success = Boolean(flightSourceDecision?.success);

  return {
    success,
    generatedAt: new Date().toISOString(),
    engine: "Home2Flight Flight Status Engine",
    version: ENGINE_VERSION,

    provider: {
      name: success
        ? flightSourceDecision?.flightDecision?.selectedProvider || "multi_source"
        : "multi_source_unavailable",
      reachable: usableSources.some((source) => source.reachable),
      status: {
        aviationStack: aviationStackSource?.providerStatus || null,
        aeroDataBox: aeroDataBoxSource?.providerStatus || null,
      },
      liveDataActive: usableSources.some((source) => source.liveDataActive),
    },

    flight: selectedFlight,
    flightDecision: flightSourceDecision.flightDecision,
    sourceArbitration: flightSourceDecision,
    reliability,
    operationalSignals,
    intelligenceSummary,

    diagnostics: {
      requestedFlight: normalizedFlightNumber,
      requestedAirline: normalizedAirline,
      requestedAirport: normalizedAirport,
      requestedTerminal: normalizedTerminal,

      aviationStack: {
        attempted: aviationStackSource?.attempted || false,
        success: aviationStackSource?.success || false,
        providerStatus: aviationStackSource?.providerStatus || null,
        reason: aviationStackSource?.reason || null,
        errorMessage: aviationStackSource?.errorMessage || null,
        preview: aviationStackSource?.providerPreview || null,
      },

      aeroDataBox: {
        attempted: aeroDataBoxSource?.attempted || false,
        success: aeroDataBoxSource?.success || false,
        providerStatus: aeroDataBoxSource?.providerStatus || null,
        reason: aeroDataBoxSource?.reason || null,
        errorMessage: aeroDataBoxSource?.errorMessage || null,
        endpointUsed: aeroDataBoxSource?.endpointUsed || null,
        preview: aeroDataBoxSource?.providerPreview || null,
      },

      sourceArbitrationActive: true,
      sourceArbitrationSuccess: Boolean(flightSourceDecision.success),
      selectedFlightProvider:
        flightSourceDecision.flightDecision?.selectedProvider || null,
      selectedFlightSourceType:
        flightSourceDecision.flightDecision?.selectedSourceType || null,
      flightDecisionConfidence:
        flightSourceDecision.flightDecision?.confidenceScore || null,

      fallbackContextReceived: {
        airline: normalizedAirline,
        airport: normalizedAirport,
        terminal: normalizedTerminal,
        forceManualTime: Boolean(forceManualTime),
        manualDepartureTime: normalizedManualDepartureTime,
      },
    },
  };
}

async function fetchAviationStackSource({ flightNumber }) {
  const apiKey = process.env.AVIATIONSTACK_API_KEY;

  if (!apiKey) {
    return {
      attempted: false,
      success: false,
      providerStatus: null,
      reason: "AVIATIONSTACK_API_KEY is not configured.",
      source: null,
    };
  }

  try {
    const providerUrl = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${encodeURIComponent(
      flightNumber
    )}`;

    const providerResponse = await fetch(providerUrl);
    const providerStatus = providerResponse.status;
    const providerData = await providerResponse.json();

    const flightData = providerData?.data?.[0];

    if (!flightData) {
      return {
        attempted: true,
        success: false,
        providerStatus,
        reason: "No matching flight found from AviationStack.",
        providerPreview: providerData,
        source: null,
      };
    }

    const normalized = normalizeAviationStackFlightData(flightNumber, flightData);
    const reliability = calculateProviderReliability(normalized, "aviationstack_live");

    return {
      attempted: true,
      success: true,
      providerStatus,
      normalized,
      source: {
        id: "aviationstack_primary",
        provider: "AviationStack",
        sourceType: "aviationstack_live",
        reachable: true,
        liveDataActive: true,
        scheduledDeparture: normalized.departure?.scheduled || null,
        estimatedDeparture:
          normalized.departure?.estimated ||
          normalized.departure?.scheduled ||
          null,
        status: normalized.status,
        providerStatusRaw: normalized.providerStatusRaw,
        terminal: normalized.departure?.terminal || null,
        gate: normalized.departure?.gate || null,
        delayMinutes: normalized.departure?.delayMinutes ?? null,
        confidenceScore: reliability.confidenceScore,
        freshness: "live",
        limitations: reliability.limitations,
        flight: normalized,
      },
    };
  } catch (error) {
    return {
      attempted: true,
      success: false,
      providerStatus: null,
      reason: "AviationStack request failed.",
      errorMessage: error?.message || String(error),
      source: null,
    };
  }
}

async function fetchAeroDataBoxSource({
  flightNumber,
  airline,
  airport,
  terminal,
  manualDepartureTime,
}) {
  const apiKey = process.env.AERODATABOX_API_KEY;

  if (!apiKey) {
    return {
      attempted: false,
      success: false,
      providerStatus: null,
      reason: "AERODATABOX_API_KEY is not configured.",
      source: null,
    };
  }

  const dateLocal = getDateLocalFromManualTime(manualDepartureTime);
  const baseUrl =
    process.env.AERODATABOX_API_BASE_URL ||
    "https://prod.api.market/api/v1/aedbx/aerodatabox";

  const endpoint = `${baseUrl}/flights/number/${encodeURIComponent(
    flightNumber
  )}/${encodeURIComponent(dateLocal)}`;

  try {
    const providerResponse = await fetch(endpoint, {
      method: "GET",
      headers: {
        "x-magicapi-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    const providerStatus = providerResponse.status;
    const providerData = await providerResponse.json();

    const flightData = extractAeroDataBoxFlight(providerData, flightNumber, airport);

    if (!flightData) {
      return {
        attempted: true,
        success: false,
        providerStatus,
        endpointUsed: endpoint,
        reason: "No matching flight found from AeroDataBox.",
        providerPreview: providerData,
        source: null,
      };
    }

    const normalized = normalizeAeroDataBoxFlightData({
      flightNumber,
      airline,
      airport,
      terminal,
      flightData,
    });

    const reliability = calculateProviderReliability(
      normalized,
      "aerodatabox_live"
    );

    return {
      attempted: true,
      success: true,
      providerStatus,
      endpointUsed: endpoint,
      normalized,
      source: {
        id: "aerodatabox_primary",
        provider: "AeroDataBox",
        sourceType: "aerodatabox_live",
        reachable: true,
        liveDataActive: true,
        scheduledDeparture: normalized.departure?.scheduled || null,
        estimatedDeparture:
          normalized.departure?.estimated ||
          normalized.departure?.scheduled ||
          null,
        status: normalized.status,
        providerStatusRaw: normalized.providerStatusRaw,
        terminal: normalized.departure?.terminal || terminal || null,
        gate: normalized.departure?.gate || null,
        delayMinutes: normalized.departure?.delayMinutes ?? null,
        confidenceScore: reliability.confidenceScore,
        freshness: "live",
        limitations: reliability.limitations,
        flight: normalized,
      },
    };
  } catch (error) {
    return {
      attempted: true,
      success: false,
      providerStatus: null,
      endpointUsed: endpoint,
      reason: "AeroDataBox request failed.",
      errorMessage: error?.message || String(error),
      source: null,
    };
  }
}

function getDateLocalFromManualTime(value) {
  if (!value) return new Date().toISOString().slice(0, 10);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function extractAeroDataBoxFlight(providerData, flightNumber, airport) {
  const candidates = Array.isArray(providerData)
    ? providerData
    : Array.isArray(providerData?.flights)
    ? providerData.flights
    : Array.isArray(providerData?.departures)
    ? providerData.departures
    : Array.isArray(providerData?.arrivals)
    ? providerData.arrivals
    : providerData?.flight
    ? [providerData.flight]
    : providerData
    ? [providerData]
    : [];

  const normalizedFlight = String(flightNumber || "").replace(/\s+/g, "").toUpperCase();
  const normalizedAirport = String(airport || "").toUpperCase();

  return (
    candidates.find((item) => {
      const itemNumber = String(
        item?.number ||
          item?.flightNumber ||
          item?.flight?.iata ||
          item?.flight?.number ||
          ""
      )
        .replace(/\s+/g, "")
        .toUpperCase();

      const departureAirport = String(
        item?.departure?.airport?.iata ||
          item?.departure?.iata ||
          item?.departure?.airport?.code ||
          ""
      ).toUpperCase();

      if (itemNumber && itemNumber !== normalizedFlight) return false;
      if (normalizedAirport && departureAirport && departureAirport !== normalizedAirport) {
        return false;
      }

      return true;
    }) || candidates[0] || null
  );
}

function normalizeAeroDataBoxFlightData({
  flightNumber,
  airline,
  airport,
  terminal,
  flightData,
}) {
  const departure = flightData?.departure || {};
  const arrival = flightData?.arrival || {};

  const scheduledDeparture =
    departure?.scheduledTime?.utc ||
    departure?.scheduledTime?.local ||
    departure?.scheduled ||
    departure?.time ||
    null;

  const estimatedDeparture =
    departure?.revisedTime?.utc ||
    departure?.revisedTime?.local ||
    departure?.estimatedTime?.utc ||
    departure?.estimatedTime?.local ||
    departure?.estimated ||
    scheduledDeparture ||
    null;

  const actualDeparture =
    departure?.runwayTime?.utc ||
    departure?.runwayTime?.local ||
    departure?.actualTime?.utc ||
    departure?.actualTime?.local ||
    departure?.actual ||
    null;

  const scheduledArrival =
    arrival?.scheduledTime?.utc ||
    arrival?.scheduledTime?.local ||
    arrival?.scheduled ||
    null;

  const estimatedArrival =
    arrival?.revisedTime?.utc ||
    arrival?.revisedTime?.local ||
    arrival?.estimatedTime?.utc ||
    arrival?.estimatedTime?.local ||
    arrival?.estimated ||
    scheduledArrival ||
    null;

  const actualArrival =
    arrival?.runwayTime?.utc ||
    arrival?.runwayTime?.local ||
    arrival?.actualTime?.utc ||
    arrival?.actualTime?.local ||
    arrival?.actual ||
    null;

  const providerStatusRaw =
    flightData?.status ||
    flightData?.movementStatus ||
    flightData?.flightStatus ||
    "unknown";

  const derivedStatus = deriveOperationalStatus({
    providerStatusRaw,
    actualDeparture,
    actualArrival,
    estimatedArrival,
    scheduledArrival,
  });

  return {
    number:
      flightData?.number ||
      flightData?.flightNumber ||
      flightData?.flight?.iata ||
      flightNumber,
    icao: flightData?.icao || flightData?.flight?.icao || null,
    airline: {
      name: flightData?.airline?.name || airline || null,
      code: flightData?.airline?.iata || airline || null,
    },
    status: derivedStatus,
    providerStatusRaw,
    route: {
      from: {
        code:
          departure?.airport?.iata ||
          departure?.iata ||
          departure?.airport?.code ||
          airport ||
          null,
        icao: departure?.airport?.icao || departure?.icao || null,
        name: departure?.airport?.name || departure?.airportName || null,
        timezone: departure?.airport?.timeZone || departure?.timezone || null,
      },
      to: {
        code:
          arrival?.airport?.iata ||
          arrival?.iata ||
          arrival?.airport?.code ||
          null,
        icao: arrival?.airport?.icao || arrival?.icao || null,
        name: arrival?.airport?.name || arrival?.airportName || null,
        timezone: arrival?.airport?.timeZone || arrival?.timezone || null,
      },
    },
    departure: {
      scheduled: scheduledDeparture,
      estimated: estimatedDeparture,
      actual: actualDeparture,
      delayMinutes: calculateDelayMinutes(
        scheduledDeparture,
        actualDeparture || estimatedDeparture
      ),
      terminal: departure?.terminal || terminal || null,
      gate: departure?.gate || null,
    },
    arrival: {
      scheduled: scheduledArrival,
      estimated: estimatedArrival,
      actual: actualArrival,
      delayMinutes: calculateDelayMinutes(
        scheduledArrival,
        actualArrival || estimatedArrival
      ),
      terminal: arrival?.terminal || null,
      gate: arrival?.gate || null,
    },
  };
}

function normalizeAviationStackFlightData(flightNumber, flightData) {
  const scheduledDeparture = flightData?.departure?.scheduled || null;
  const estimatedDeparture = flightData?.departure?.estimated || null;
  const actualDeparture = flightData?.departure?.actual || null;

  const scheduledArrival = flightData?.arrival?.scheduled || null;
  const estimatedArrival = flightData?.arrival?.estimated || null;
  const actualArrival = flightData?.arrival?.actual || null;

  const departureDelay =
    normalizeDelay(flightData?.departure?.delay) ??
    calculateDelayMinutes(
      scheduledDeparture,
      actualDeparture || estimatedDeparture
    );

  const arrivalDelay =
    normalizeDelay(flightData?.arrival?.delay) ??
    calculateDelayMinutes(scheduledArrival, actualArrival || estimatedArrival);

  const providerStatusRaw = flightData?.flight_status || "unknown";

  const derivedStatus = deriveOperationalStatus({
    providerStatusRaw,
    actualDeparture,
    actualArrival,
    estimatedArrival,
    scheduledArrival,
  });

  return {
    number: flightData?.flight?.iata || flightNumber,
    icao: flightData?.flight?.icao || null,
    airline: {
      name: flightData?.airline?.name || null,
      code: flightData?.airline?.iata || null,
    },
    status: derivedStatus,
    providerStatusRaw,
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
      scheduled: scheduledDeparture,
      estimated: estimatedDeparture,
      actual: actualDeparture,
      delayMinutes: departureDelay,
      terminal: flightData?.departure?.terminal || null,
      gate: flightData?.departure?.gate || null,
    },
    arrival: {
      scheduled: scheduledArrival,
      estimated: estimatedArrival,
      actual: actualArrival,
      delayMinutes: arrivalDelay,
      terminal: flightData?.arrival?.terminal || null,
      gate: null,
    },
  };
}

function buildSelectedFlight({
  flightNumber,
  airline,
  airport,
  terminal,
  sourceDecision,
  aviationStackSource,
  aeroDataBoxSource,
}) {
  const selectedProvider = sourceDecision?.flightDecision?.selectedProvider;

  const providerFlight =
    selectedProvider === "AeroDataBox"
      ? aeroDataBoxSource?.normalized
      : selectedProvider === "AviationStack"
      ? aviationStackSource?.normalized
      : null;

  const decision = sourceDecision?.flightDecision || {};

  return {
    ...(providerFlight || {}),
    number: providerFlight?.number || flightNumber,
    icao: providerFlight?.icao || null,
    airline: providerFlight?.airline || {
      name: airline,
      code: airline,
    },
    status: decision.status || providerFlight?.status || "unknown",
    providerStatusRaw:
      providerFlight?.providerStatusRaw || decision.status || "unknown",
    route: providerFlight?.route || {
      from: {
        code: airport || null,
        icao: null,
        name: null,
        timezone: null,
      },
      to: {
        code: null,
        icao: null,
        name: null,
        timezone: null,
      },
    },
    departure: {
      scheduled:
        decision.scheduledDeparture ||
        providerFlight?.departure?.scheduled ||
        null,
      estimated:
        decision.estimatedDeparture ||
        providerFlight?.departure?.estimated ||
        null,
      actual: providerFlight?.departure?.actual || null,
      delayMinutes:
        decision.delayMinutes ?? providerFlight?.departure?.delayMinutes ?? null,
      terminal:
        decision.terminal || providerFlight?.departure?.terminal || terminal || null,
      gate: decision.gate || providerFlight?.departure?.gate || null,
    },
    arrival: providerFlight?.arrival || {
      scheduled: null,
      estimated: null,
      actual: null,
      delayMinutes: null,
      terminal: null,
      gate: null,
    },
  };
}

function deriveOperationalStatus({
  providerStatusRaw,
  actualDeparture,
  actualArrival,
  estimatedArrival,
  scheduledArrival,
}) {
  const raw = String(providerStatusRaw || "").toLowerCase();

  if (["cancelled", "canceled"].includes(raw)) return "cancelled";
  if (["incident", "diverted"].includes(raw)) return raw;
  if (actualArrival) return "landed";
  if (actualDeparture) return "departed";

  const arrivalCandidate = estimatedArrival || scheduledArrival;

  if (arrivalCandidate) {
    const arrivalTime = new Date(arrivalCandidate).getTime();
    const now = Date.now();

    if (!Number.isNaN(arrivalTime) && now > arrivalTime + 30 * 60000) {
      return "likely_landed";
    }
  }

  if (raw.includes("cancel")) return "cancelled";
  if (raw.includes("delay")) return "delayed";
  if (raw.includes("depart")) return "departed";
  if (raw.includes("land") || raw.includes("arriv")) return "landed";

  return raw || "unknown";
}

function normalizeDelay(value) {
  if (typeof value !== "number") return null;
  if (Number.isNaN(value)) return null;
  return Math.max(0, value);
}

function calculateDelayMinutes(scheduled, comparison) {
  if (!scheduled || !comparison) return null;

  const scheduledTime = new Date(scheduled).getTime();
  const comparisonTime = new Date(comparison).getTime();

  if (Number.isNaN(scheduledTime) || Number.isNaN(comparisonTime)) {
    return null;
  }

  return Math.max(0, Math.round((comparisonTime - scheduledTime) / 60000));
}

function calculateProviderReliability(flight, sourceType) {
  let score = 88;

  if (flight.status === "unknown") score -= 24;
  if (flight.status === "cancelled") score -= 55;
  if (flight.status === "delayed") score -= 16;
  if (flight.status === "likely_landed") score -= 8;

  if (!flight.departure.estimated) score -= 8;
  if (!flight.departure.terminal) score -= 6;
  if (!flight.departure.gate) score -= 6;

  if (typeof flight.departure.delayMinutes === "number") {
    if (flight.departure.delayMinutes >= 60) score -= 18;
    else if (flight.departure.delayMinutes >= 30) score -= 12;
    else if (flight.departure.delayMinutes > 0) score -= 6;
  } else {
    score -= 8;
  }

  const finalScore = Math.max(0, Math.min(95, score));

  return {
    score: finalScore,
    confidenceScore: finalScore,
    trustLevel: getTrustLevel(finalScore),
    sourceType,
    liveDataActive: true,
    limitations: getLimitations(flight),
  };
}

function calculateReliabilityFromDecision({ decision, sources }) {
  const score = decision?.confidenceScore || 20;

  return {
    score,
    confidenceScore: score,
    trustLevel: getTrustLevel(score),
    sourceType: decision?.selectedSourceType || "unavailable",
    liveDataActive: Boolean(decision?.liveDataActive),
    limitations:
      sources?.length > 0
        ? [
            `Decisão calculada por arbitragem de ${sources.length} fonte(s).`,
            `Consenso entre fontes: ${decision?.consensusStrength || "none"}.`,
          ]
        : [
            "Dados reais de voo indisponíveis neste momento.",
            "A Home2Flight deve usar fallback conservador.",
            "A recomendação deve pedir validação manual se o voo for crítico.",
          ],
  };
}

function getTrustLevel(score) {
  if (score >= 80) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function getLimitations(flight) {
  const limitations = [];

  if (flight.providerStatusRaw && flight.providerStatusRaw !== flight.status) {
    limitations.push(
      `Estado derivado pela Home2Flight: ${flight.status}. Estado bruto do fornecedor: ${flight.providerStatusRaw}.`
    );
  }

  if (!flight.departure.estimated) {
    limitations.push("Hora estimada de partida ainda não disponível.");
  }

  if (!flight.departure.terminal) {
    limitations.push("Terminal de partida ainda não disponível.");
  }

  if (!flight.departure.gate) {
    limitations.push("Gate de partida ainda não disponível.");
  }

  if (!flight.arrival.estimated) {
    limitations.push("Hora estimada de chegada ainda não disponível.");
  }

  if (limitations.length === 0) {
    limitations.push("Dados de voo disponíveis através de fornecedor externo.");
  }

  return limitations;
}

function buildOperationalSignals(flight) {
  const signals = [];

  if (flight.status === "cancelled") {
    signals.push({
      type: "flight_cancelled",
      label: "Voo cancelado",
      severity: "high",
    });
  }

  if (flight.status === "landed" || flight.status === "likely_landed") {
    signals.push({
      type: "flight_finished",
      label: "Voo já concluído",
      severity: "low",
    });
  }

  if (flight.status === "departed") {
    signals.push({
      type: "flight_departed",
      label: "Voo já partiu",
      severity: "medium",
    });
  }

  if (flight.status === "delayed") {
    signals.push({
      type: "flight_delayed",
      label: "Voo com atraso",
      severity: "medium",
    });
  }

  if (
    typeof flight.departure?.delayMinutes === "number" &&
    flight.departure.delayMinutes >= 30
  ) {
    signals.push({
      type: "departure_delay",
      label: `Atraso de partida: ${flight.departure.delayMinutes} min`,
      severity: flight.departure.delayMinutes >= 60 ? "high" : "medium",
    });
  }

  if (
    !flight.departure?.gate &&
    !["landed", "likely_landed"].includes(flight.status)
  ) {
    signals.push({
      type: "gate_pending",
      label: "Gate ainda por confirmar",
      severity: "low",
    });
  }

  if (!flight.departure?.terminal) {
    signals.push({
      type: "terminal_pending",
      label: "Terminal ainda por confirmar",
      severity: "medium",
    });
  }

  if (signals.length === 0) {
    signals.push({
      type: "flight_monitoring",
      label: "Voo em monitorização",
      severity: "low",
    });
  }

  return signals;
}

function buildIntelligenceSummary(flight) {
  const from = flight.route?.from?.code || "origem";
  const to = flight.route?.to?.code || "destino";
  const route = `${from} → ${to}`;

  if (flight.status === "cancelled") {
    return {
      operationalStatus: "critical",
      flightRisk: "high",
      recommendationImpact: "block_automatic_recommendation",
      summary: `${flight.number} (${route}) surge como cancelado. A Home2Flight deve bloquear recomendação automática e pedir validação imediata.`,
    };
  }

  if (flight.status === "landed" || flight.status === "likely_landed") {
    return {
      operationalStatus: "finished",
      flightRisk: "low",
      recommendationImpact: "do_not_generate_preflight_timeline",
      summary: `${flight.number} (${route}) já terminou. A Home2Flight não deve gerar timeline pré-voo normal para este voo.`,
    };
  }

  if (flight.status === "departed") {
    return {
      operationalStatus: "departed",
      flightRisk: "medium",
      recommendationImpact: "preflight_window_closed",
      summary: `${flight.number} (${route}) já partiu. A janela operacional pré-voo terminou.`,
    };
  }

  if (
    flight.status === "delayed" ||
    (typeof flight.departure?.delayMinutes === "number" &&
      flight.departure.delayMinutes > 0)
  ) {
    return {
      operationalStatus: "monitoring",
      flightRisk: getDelayRisk(flight.departure.delayMinutes),
      recommendationImpact: "dynamic_buffer_recommended",
      summary: `${flight.number} (${route}) apresenta sinais de atraso operacional. A timeline deve manter monitorização e ajustar buffer se necessário.`,
    };
  }

  return {
    operationalStatus: "scheduled",
    flightRisk: "low",
    recommendationImpact: "standard_monitoring",
    summary: `${flight.number} (${route}) sem atraso relevante detetado. A timeline pode manter plano base com monitorização operacional.`,
  };
}

function getDelayRisk(delayMinutes) {
  if (typeof delayMinutes !== "number") return "unknown";
  if (delayMinutes >= 60) return "high";
  if (delayMinutes >= 20) return "medium";
  return "low";
}

export default getFlightStatusIntelligence;