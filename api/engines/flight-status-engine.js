// /api/engines/flight-status-engine.js

export async function getFlightStatusIntelligence({ flightNumber = "AF1195" } = {}) {
  const normalizedFlightNumber = String(flightNumber || "AF1195").toUpperCase();
  const apiKey = process.env.AVIATIONSTACK_API_KEY;

  if (!apiKey) {
    return buildFallbackResponse({
      flightNumber: normalizedFlightNumber,
      reason: "AVIATIONSTACK_API_KEY is not configured.",
    });
  }

  try {
    const providerUrl = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${encodeURIComponent(
      normalizedFlightNumber
    )}`;

    const providerResponse = await fetch(providerUrl);
    const providerStatus = providerResponse.status;
    const providerData = await providerResponse.json();

    const flightData = providerData?.data?.[0];

    if (!flightData) {
      return buildFallbackResponse({
        flightNumber: normalizedFlightNumber,
        reason: "No matching flight found from provider.",
        providerStatus,
        providerPreview: providerData,
      });
    }

    const normalized = normalizeFlightData(normalizedFlightNumber, flightData);
    const reliability = calculateReliability(normalized);
    const operationalSignals = buildOperationalSignals(normalized);
    const intelligenceSummary = buildIntelligenceSummary(normalized);

    return {
      success: true,
      generatedAt: new Date().toISOString(),
      engine: "Home2Flight Flight Status Engine",
      version: "0.3.0-derived-status",
      provider: {
        name: "AviationStack",
        reachable: true,
        status: providerStatus,
        liveDataActive: true,
      },
      flight: normalized,
      reliability,
      operationalSignals,
      intelligenceSummary,
      diagnostics: {
        requestedFlight: normalizedFlightNumber,
        matchedFlight: normalized.number,
        providerStatusRaw: normalized.providerStatusRaw,
        derivedStatus: normalized.status,
        hasEstimatedDeparture: Boolean(normalized.departure.estimated),
        hasActualDeparture: Boolean(normalized.departure.actual),
        hasEstimatedArrival: Boolean(normalized.arrival.estimated),
        hasActualArrival: Boolean(normalized.arrival.actual),
        hasTerminal: Boolean(normalized.departure.terminal),
        hasGate: Boolean(normalized.departure.gate),
      },
    };
  } catch (error) {
    return buildFallbackResponse({
      flightNumber: normalizedFlightNumber,
      reason: "Provider request failed.",
      errorMessage: error.message,
    });
  }
}

export default async function handler(req, res) {
  const flightNumber = String(req.query.flight || "AF1195").toUpperCase();

  const result = await getFlightStatusIntelligence({
    flightNumber,
  });

  return res.status(200).json(result);
}

function normalizeFlightData(flightNumber, flightData) {
  const scheduledDeparture = flightData?.departure?.scheduled || null;
  const estimatedDeparture = flightData?.departure?.estimated || null;
  const actualDeparture = flightData?.departure?.actual || null;

  const scheduledArrival = flightData?.arrival?.scheduled || null;
  const estimatedArrival = flightData?.arrival?.estimated || null;
  const actualArrival = flightData?.arrival?.actual || null;

  const departureDelay =
    normalizeDelay(flightData?.departure?.delay) ??
    calculateDelayMinutes(scheduledDeparture, actualDeparture || estimatedDeparture);

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

function calculateReliability(flight) {
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
    sourceType: "aviationstack_live",
    liveDataActive: true,
    limitations: getLimitations(flight),
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
    typeof flight.departure.delayMinutes === "number" &&
    flight.departure.delayMinutes >= 30
  ) {
    signals.push({
      type: "departure_delay",
      label: `Atraso de partida: ${flight.departure.delayMinutes} min`,
      severity: flight.departure.delayMinutes >= 60 ? "high" : "medium",
    });
  }

  if (!flight.departure.gate && !["landed", "likely_landed"].includes(flight.status)) {
    signals.push({
      type: "gate_pending",
      label: "Gate ainda por confirmar",
      severity: "low",
    });
  }

  if (!flight.departure.terminal) {
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
    (typeof flight.departure.delayMinutes === "number" &&
      flight.departure.delayMinutes > 0)
  ) {
    return {
      operationalStatus: "monitoring",
      flightRisk: getDelayRisk(flight.departure.delayMinutes),
      recommendationImpact: "dynamic_buffer_recommended",
      summary: `${flight.number} (${route}) apresenta sinais de atraso operacional. A timeline deve manter monitorização e ajustar buffer se necessário.`,
    };
  }

  if (flight.status === "active") {
    return {
      operationalStatus: "active",
      flightRisk: "low",
      recommendationImpact: "standard_monitoring",
      summary: `${flight.number} (${route}) está ativo. A timeline deve manter monitorização até confirmação de partida e chegada.`,
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

function buildFallbackResponse({
  flightNumber,
  reason,
  errorMessage = null,
  providerStatus = null,
  providerPreview = null,
}) {
  return {
    success: false,
    generatedAt: new Date().toISOString(),
    engine: "Home2Flight Flight Status Engine",
    version: "0.3.0-derived-status",
    provider: {
      name: "AviationStack",
      reachable: false,
      status: providerStatus,
      liveDataActive: false,
    },
    flight: {
      number: flightNumber,
      status: "unknown",
      providerStatusRaw: "unknown",
    },
    reliability: {
      score: 25,
      confidenceScore: 25,
      trustLevel: "low",
      sourceType: "safe_fallback",
      liveDataActive: false,
      limitations: [
        "Dados reais de voo indisponíveis neste momento.",
        "A Home2Flight deve usar fallback conservador.",
        "A recomendação deve pedir validação manual se o voo for crítico.",
      ],
    },
    operationalSignals: [
      {
        type: "flight_data_unavailable",
        label: "Dados de voo indisponíveis",
        severity: "medium",
      },
    ],
    intelligenceSummary: {
      operationalStatus: "unknown",
      flightRisk: "unknown",
      recommendationImpact: "manual_validation_required",
      summary:
        "Não foi possível obter dados reais fiáveis para este voo. A Home2Flight deve aplicar lógica conservadora.",
    },
    diagnostics: {
      reason,
      errorMessage,
      providerPreview,
    },
  };
}