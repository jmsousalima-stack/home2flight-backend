// Home2Flight — Flight Source Arbitration Engine
// Version: 1.0.0-provider-arbitration-foundation

const ENGINE_VERSION = "1.0.0-provider-arbitration-foundation";

function nowIso() {
  return new Date().toISOString();
}

function minutesBetween(a, b) {
  if (!a || !b) return null;
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.round((da - db) / 60000);
}

function safeUpper(value, fallback = "") {
  return String(value || fallback).trim().toUpperCase();
}

function buildManualFallbackCandidate(input) {
  const departureTime =
    input.manualDepartureTime ||
    input.departureTime ||
    input.scheduledDeparture ||
    null;

  return {
    provider: "manual_fallback",
    providerType: "fallback",
    status: departureTime ? "available" : "insufficient_data",
    isFallback: true,
    fetchedAt: nowIso(),
    normalized: {
      flight: safeUpper(input.flight),
      airline: safeUpper(input.airline),
      departureAirport: safeUpper(input.airport),
      arrivalAirport: safeUpper(input.arrivalAirport),
      terminal: input.terminal || null,
      gate: null,
      scheduledDeparture: departureTime,
      estimatedDeparture: null,
      actualDeparture: null,
      departureStatus: "manual",
      departureSource: "manual_fallback_time",
    },
    diagnostics: {
      reason: departureTime
        ? "Hora manual usada como fallback operacional."
        : "Não existe hora manual suficiente para fallback.",
      providerConfidenceBase: departureTime ? 35 : 10,
      freshnessScore: departureTime ? 40 : 0,
      completenessScore: departureTime ? 35 : 5,
    },
  };
}

async function fetchAviationStackCandidate(input) {
  const accessKey = process.env.AVIATIONSTACK_API_KEY;

  if (!accessKey) {
    return {
      provider: "aviationstack",
      providerType: "external_api",
      status: "not_configured",
      isFallback: false,
      fetchedAt: nowIso(),
      normalized: null,
      diagnostics: {
        reason: "AVIATIONSTACK_API_KEY não configurada.",
        providerConfidenceBase: 0,
        freshnessScore: 0,
        completenessScore: 0,
      },
    };
  }

  if (input.forceManualTime === true || input.forceManualTime === "true") {
    return {
      provider: "aviationstack",
      providerType: "external_api",
      status: "skipped_by_request",
      isFallback: false,
      fetchedAt: nowIso(),
      normalized: null,
      diagnostics: {
        reason: "Provider ignorado porque forceManualTime está ativo.",
        providerConfidenceBase: 0,
        freshnessScore: 0,
        completenessScore: 0,
      },
    };
  }

  const flight = safeUpper(input.flight);

  try {
    const url = `http://api.aviationstack.com/v1/flights?access_key=${accessKey}&flight_iata=${encodeURIComponent(
      flight
    )}`;

    const response = await fetch(url);
    const json = await response.json();

    if (!response.ok) {
      const code = json?.error?.code || response.status;

      return {
        provider: "aviationstack",
        providerType: "external_api",
        status: code === "usage_limit_reached" || response.status === 429
          ? "usage_limit_reached"
          : "provider_error",
        isFallback: false,
        fetchedAt: nowIso(),
        normalized: null,
        diagnostics: {
          reason:
            code === "usage_limit_reached" || response.status === 429
              ? "AviationStack atingiu o limite de utilização."
              : "AviationStack respondeu com erro.",
          providerConfidenceBase: 0,
          freshnessScore: 0,
          completenessScore: 0,
          rawError: json?.error || null,
        },
      };
    }

    const first = Array.isArray(json?.data) ? json.data[0] : null;

    if (!first) {
      return {
        provider: "aviationstack",
        providerType: "external_api",
        status: "no_result",
        isFallback: false,
        fetchedAt: nowIso(),
        normalized: null,
        diagnostics: {
          reason: "AviationStack não devolveu resultado para este voo.",
          providerConfidenceBase: 20,
          freshnessScore: 20,
          completenessScore: 0,
        },
      };
    }

    const normalized = {
      flight: first?.flight?.iata || flight,
      airline: first?.airline?.iata || safeUpper(input.airline),
      departureAirport: first?.departure?.iata || safeUpper(input.airport),
      arrivalAirport: first?.arrival?.iata || safeUpper(input.arrivalAirport),
      terminal: first?.departure?.terminal || input.terminal || null,
      gate: first?.departure?.gate || null,
      scheduledDeparture: first?.departure?.scheduled || null,
      estimatedDeparture: first?.departure?.estimated || null,
      actualDeparture: first?.departure?.actual || null,
      departureStatus: first?.flight_status || "unknown",
      departureSource: "aviationstack",
    };

    let completenessScore = 0;
    if (normalized.flight) completenessScore += 15;
    if (normalized.airline) completenessScore += 10;
    if (normalized.departureAirport) completenessScore += 15;
    if (normalized.scheduledDeparture) completenessScore += 25;
    if (normalized.estimatedDeparture) completenessScore += 15;
    if (normalized.terminal) completenessScore += 10;
    if (normalized.gate) completenessScore += 10;

    return {
      provider: "aviationstack",
      providerType: "external_api",
      status: "available",
      isFallback: false,
      fetchedAt: nowIso(),
      normalized,
      diagnostics: {
        reason: "Dados externos obtidos com sucesso via AviationStack.",
        providerConfidenceBase: 70,
        freshnessScore: 65,
        completenessScore,
      },
    };
  } catch (error) {
    return {
      provider: "aviationstack",
      providerType: "external_api",
      status: "provider_exception",
      isFallback: false,
      fetchedAt: nowIso(),
      normalized: null,
      diagnostics: {
        reason: "Erro técnico ao consultar AviationStack.",
        providerConfidenceBase: 0,
        freshnessScore: 0,
        completenessScore: 0,
        errorMessage: error?.message || String(error),
      },
    };
  }
}

function scoreCandidate(candidate) {
  const base = candidate?.diagnostics?.providerConfidenceBase || 0;
  const freshness = candidate?.diagnostics?.freshnessScore || 0;
  const completeness = candidate?.diagnostics?.completenessScore || 0;

  let penalty = 0;

  if (candidate.status !== "available") penalty += 60;
  if (candidate.isFallback) penalty += 15;
  if (!candidate.normalized?.scheduledDeparture) penalty += 20;

  const reliabilityScore = Math.max(
    0,
    Math.min(100, Math.round(base * 0.45 + freshness * 0.25 + completeness * 0.3 - penalty))
  );

  return {
    ...candidate,
    arbitration: {
      reliabilityScore,
      selected: false,
    },
  };
}

function detectConflicts(scoredCandidates) {
  const available = scoredCandidates.filter(
    (c) => c.status === "available" && c.normalized?.scheduledDeparture
  );

  const conflicts = [];

  for (let i = 0; i < available.length; i++) {
    for (let j = i + 1; j < available.length; j++) {
      const a = available[i];
      const b = available[j];

      const diff = minutesBetween(
        a.normalized.estimatedDeparture || a.normalized.scheduledDeparture,
        b.normalized.estimatedDeparture || b.normalized.scheduledDeparture
      );

      if (diff !== null && Math.abs(diff) >= 15) {
        conflicts.push({
          type: "departure_time_conflict",
          severity: Math.abs(diff) >= 30 ? "high" : "medium",
          providers: [a.provider, b.provider],
          differenceMinutes: Math.abs(diff),
          explanation: `Diferença relevante entre fontes na hora de partida: ${Math.abs(
            diff
          )} minutos.`,
        });
      }
    }
  }

  return conflicts;
}

function selectBestCandidate(scoredCandidates) {
  const available = scoredCandidates.filter((c) => c.status === "available");

  if (available.length === 0) {
    return scoredCandidates.sort(
      (a, b) => b.arbitration.reliabilityScore - a.arbitration.reliabilityScore
    )[0];
  }

  return available.sort(
    (a, b) => b.arbitration.reliabilityScore - a.arbitration.reliabilityScore
  )[0];
}

function buildExplanation(selected, candidates, conflicts) {
  const unavailableExternal = candidates.filter(
    (c) => c.providerType === "external_api" && c.status !== "available"
  );

  const parts = [];

  if (selected?.provider === "manual_fallback") {
    parts.push(
      "A decisão de voo está assente em fallback manual porque não existe uma fonte externa utilizável neste momento."
    );
  } else {
    parts.push(`A fonte selecionada para o voo foi ${selected.provider}.`);
  }

  if (unavailableExternal.length > 0) {
    parts.push(
      `Fontes externas indisponíveis/limitadas: ${unavailableExternal
        .map((c) => `${c.provider} (${c.status})`)
        .join(", ")}.`
    );
  }

  if (conflicts.length > 0) {
    parts.push(
      "Foram detetadas contradições entre fontes, por isso a confiança operacional foi reduzida."
    );
  }

  return parts.join(" ");
}

export async function getFlightSourceArbitration(input = {}) {
  const candidates = [];

  const aviationStack = await fetchAviationStackCandidate(input);
  candidates.push(aviationStack);

  const manualFallback = buildManualFallbackCandidate(input);
  candidates.push(manualFallback);

  const scoredCandidates = candidates.map(scoreCandidate);
  const conflicts = detectConflicts(scoredCandidates);
  const selectedRaw = selectBestCandidate(scoredCandidates);

  const selected = {
    ...selectedRaw,
    arbitration: {
      ...selectedRaw.arbitration,
      selected: true,
    },
  };

  const finalCandidates = scoredCandidates.map((candidate) =>
    candidate.provider === selected.provider
      ? selected
      : candidate
  );

  const confidencePenalty = conflicts.length > 0 ? 15 : 0;
  const finalConfidence = Math.max(
    0,
    Math.min(100, selected.arbitration.reliabilityScore - confidencePenalty)
  );

  return {
    success: true,
    engine: "Home2Flight Flight Source Arbitration Engine",
    version: ENGINE_VERSION,
    generatedAt: nowIso(),
    selectedSource: selected.provider,
    selectedStatus: selected.status,
    confidence: finalConfidence,
    confidenceLabel:
      finalConfidence >= 75
        ? "high"
        : finalConfidence >= 50
        ? "medium"
        : "low",
    departureSource: selected.normalized?.departureSource || selected.provider,
    flightData: selected.normalized,
    providerCandidates: finalCandidates,
    conflicts,
    explanation: buildExplanation(selected, finalCandidates, conflicts),
    operationalSignals: {
      riskSignals:
        selected.provider === "manual_fallback"
          ? [
              {
                type: "flight_source_risk",
                severity: "medium",
                label: "Fonte de voo em fallback manual",
                explanation:
                  "A hora de partida não foi confirmada por uma fonte externa ativa.",
              },
            ]
          : [],
      confidenceSupportSignals:
        selected.status === "available" && selected.provider !== "manual_fallback"
          ? [
              {
                type: "external_flight_source_available",
                severity: "positive",
                label: "Fonte externa de voo disponível",
                explanation:
                  "Existe uma fonte externa ativa a suportar os dados do voo.",
              },
            ]
          : [],
    },
  };
}

export default getFlightSourceArbitration;