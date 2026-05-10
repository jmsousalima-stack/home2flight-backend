export default async function handler(req, res) {
  const flightNumber = String(req.query.flight || "AF1195").toUpperCase();
  const apiKey = process.env.AVIATIONSTACK_API_KEY;

  if (!apiKey) {
    return res.status(200).json(
      buildFallbackResponse({
        flightNumber,
        reason: "AVIATIONSTACK_API_KEY is not configured.",
        providerReachable: false,
      })
    );
  }

  try {
    const url = new URL("http://api.aviationstack.com/v1/flights");

    url.searchParams.set("access_key", apiKey);
    url.searchParams.set("flight_iata", flightNumber);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const responseText = await response.text();

    let rawData = null;

    try {
      rawData = JSON.parse(responseText);
    } catch (parseError) {
      return res.status(200).json(
        buildFallbackResponse({
          flightNumber,
          reason: "Provider returned non-JSON response.",
          providerReachable: true,
          providerStatus: response.status,
          providerRawPreview: responseText.slice(0, 300),
        })
      );
    }

    if (!response.ok) {
      return res.status(200).json(
        buildFallbackResponse({
          flightNumber,
          reason: "Provider returned HTTP error.",
          providerReachable: true,
          providerStatus: response.status,
          providerResponse: sanitizeProviderResponse(rawData),
        })
      );
    }

    if (rawData?.error) {
      return res.status(200).json(
        buildFallbackResponse({
          flightNumber,
          reason: "Provider returned API error.",
          providerReachable: true,
          providerStatus: response.status,
          providerResponse: sanitizeProviderResponse(rawData),
        })
      );
    }

    const flightData = rawData?.data?.[0];

    if (!flightData) {
      return res.status(200).json(
        buildFallbackResponse({
          flightNumber,
          reason: "No matching flight found in provider response.",
          providerReachable: true,
          providerStatus: response.status,
          providerResponse: sanitizeProviderResponse(rawData),
        })
      );
    }

    const departureDelay =
      normalizeDelay(flightData?.departure?.delay) ??
      calculateDelayMinutes(
        flightData?.departure?.scheduled,
        flightData?.departure?.estimated
      );

    const arrivalDelay =
      normalizeDelay(flightData?.arrival?.delay) ??
      calculateDelayMinutes(
        flightData?.arrival?.scheduled,
        flightData?.arrival?.estimated
      );

    const flightStatus = flightData?.flight_status || "unknown";

    const reliabilityScore = calculateReliabilityScore({
      flightStatus,
      departureDelay,
      hasEstimatedDeparture: Boolean(flightData?.departure?.estimated),
      hasTerminal: Boolean(flightData?.departure?.terminal),
      hasGate: Boolean(flightData?.departure?.gate),
    });

    const delayRisk = getDelayRisk(departureDelay, flightStatus);
    const recommendationImpact = getRecommendationImpact(delayRisk);

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      engine: "Home2Flight Unified Flight Intelligence Layer",
      version: "0.3.0",
      provider: {
        name: "AviationStack",
        liveDataActive: true,
        providerReachable: true,
        providerStatus: response.status,
      },
      flight: {
        number: flightData?.flight?.iata || flightNumber,
        icao: flightData?.flight?.icao || null,
        airline: {
          name: flightData?.airline?.name || null,
          code: flightData?.airline?.iata || null,
        },
        status: flightStatus,
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
          scheduled: flightData?.departure?.scheduled || null,
          estimated: flightData?.departure?.estimated || null,
          actual: flightData?.departure?.actual || null,
          delayMinutes: departureDelay,
          terminal: flightData?.departure?.terminal || null,
          gate: flightData?.departure?.gate || null,
        },
        arrival: {
          scheduled: flightData?.arrival?.scheduled || null,
          estimated: flightData?.arrival?.estimated || null,
          actual: flightData?.arrival?.actual || null,
          delayMinutes: arrivalDelay,
          terminal: flightData?.arrival?.terminal || null,
          gate: flightData?.arrival?.gate || null,
        },
      },
      reliability: {
        score: reliabilityScore,
        trustLevel: getTrustLevel(reliabilityScore),
        sourceType: "aviationstack_live",
        liveDataActive: true,
        limitations: getLimitations(flightData),
      },
      intelligenceSummary: {
        operationalStatus: getOperationalStatus(flightStatus),
        delayRisk,
        recommendationImpact,
        summary: buildSummary({
          flightNumber,
          flightStatus,
          departureDelay,
          departureAirport: flightData?.departure?.iata,
          arrivalAirport: flightData?.arrival?.iata,
        }),
      },
    });
  } catch (error) {
    return res.status(200).json(
      buildFallbackResponse({
        flightNumber,
        reason: "Provider fetch failed.",
        providerReachable: false,
        errorMessage: error?.message || "Unknown error",
      })
    );
  }
}

function buildFallbackResponse({
  flightNumber,
  reason,
  providerReachable,
  providerStatus = null,
  providerResponse = null,
  providerRawPreview = null,
  errorMessage = null,
}) {
  return {
    success: false,
    generatedAt: new Date().toISOString(),
    engine: "Home2Flight Unified Flight Intelligence Layer",
    version: "0.3.0",
    provider: {
      name: "AviationStack",
      liveDataActive: false,
      providerReachable,
      providerStatus,
    },
    flight: {
      number: flightNumber,
      airline: {
        name: null,
        code: null,
      },
      status: "unknown",
      route: {
        from: {
          code: null,
          name: null,
        },
        to: {
          code: null,
          name: null,
        },
      },
      departure: {
        scheduled: null,
        estimated: null,
        actual: null,
        delayMinutes: null,
        terminal: null,
        gate: null,
      },
      arrival: {
        scheduled: null,
        estimated: null,
        actual: null,
        delayMinutes: null,
        terminal: null,
        gate: null,
      },
    },
    reliability: {
      score: 25,
      trustLevel: "low",
      sourceType: "provider_fallback",
      liveDataActive: false,
      limitations: [
        "Dados reais de voo indisponíveis neste momento.",
        "A timeline deve usar fallback seguro e pedir validação manual.",
        "O motor deve manter monitorização até existir fonte confirmada.",
      ],
    },
    intelligenceSummary: {
      operationalStatus: "unknown",
      delayRisk: "unknown",
      recommendationImpact: "manual_validation_required",
      summary:
        "Não foi possível obter dados reais fiáveis para este voo. A Home2Flight deve aplicar uma lógica conservadora e pedir validação manual.",
    },
    diagnostics: {
      reason,
      errorMessage,
      providerRawPreview,
      providerResponse,
    },
  };
}

function sanitizeProviderResponse(rawData) {
  if (!rawData) return null;

  return {
    pagination: rawData.pagination || null,
    error: rawData.error || null,
    dataCount: Array.isArray(rawData.data) ? rawData.data.length : null,
  };
}

function normalizeDelay(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

function calculateDelayMinutes(scheduled, estimated) {
  if (!scheduled || !estimated) return null;

  const scheduledTime = new Date(scheduled).getTime();
  const estimatedTime = new Date(estimated).getTime();

  if (Number.isNaN(scheduledTime) || Number.isNaN(estimatedTime)) {
    return null;
  }

  const diffMinutes = Math.round((estimatedTime - scheduledTime) / 60000);

  return diffMinutes > 0 ? diffMinutes : 0;
}

function calculateReliabilityScore({
  flightStatus,
  departureDelay,
  hasEstimatedDeparture,
  hasTerminal,
  hasGate,
}) {
  let score = 82;

  if (flightStatus === "delayed") score -= 12;
  if (flightStatus === "cancelled") score -= 45;
  if (flightStatus === "unknown") score -= 25;

  if (typeof departureDelay === "number") {
    if (departureDelay >= 60) score -= 18;
    else if (departureDelay >= 30) score -= 12;
    else if (departureDelay > 0) score -= 7;
  } else {
    score -= 10;
  }

  if (!hasEstimatedDeparture) score -= 8;
  if (!hasTerminal) score -= 6;
  if (!hasGate) score -= 5;

  return Math.max(0, Math.min(95, score));
}

function getTrustLevel(score) {
  if (score >= 80) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function getDelayRisk(delayMinutes, flightStatus) {
  if (flightStatus === "cancelled") return "critical";
  if (flightStatus === "delayed") return "medium";

  if (typeof delayMinutes !== "number") return "unknown";
  if (delayMinutes >= 60) return "high";
  if (delayMinutes >= 20) return "medium";
  if (delayMinutes > 0) return "low";

  return "low";
}

function getRecommendationImpact(delayRisk) {
  switch (delayRisk) {
    case "critical":
      return "flight_disruption_detected";
    case "high":
      return "strong_departure_buffer_required";
    case "medium":
      return "departure_buffer_required";
    case "low":
      return "standard_monitoring";
    default:
      return "manual_validation_required";
  }
}

function getOperationalStatus(flightStatus) {
  switch (flightStatus) {
    case "scheduled":
      return "scheduled";
    case "active":
      return "active";
    case "landed":
      return "completed";
    case "delayed":
      return "monitoring";
    case "cancelled":
      return "critical";
    default:
      return "unknown";
  }
}

function getLimitations(flightData) {
  const limitations = [];

  if (!flightData?.departure?.estimated) {
    limitations.push("Hora estimada de partida não disponível.");
  }

  if (!flightData?.departure?.terminal) {
    limitations.push("Terminal de partida ainda não disponível.");
  }

  if (!flightData?.departure?.gate) {
    limitations.push("Gate de partida ainda não disponível.");
  }

  if (!flightData?.arrival?.estimated) {
    limitations.push("Hora estimada de chegada não disponível.");
  }

  if (limitations.length === 0) {
    limitations.push("Dados de voo disponíveis através de fornecedor externo.");
  }

  return limitations;
}

function buildSummary({
  flightNumber,
  flightStatus,
  departureDelay,
  departureAirport,
  arrivalAirport,
}) {
  const routeText =
    departureAirport && arrivalAirport
      ? `${departureAirport} → ${arrivalAirport}`
      : "rota em validação";

  if (flightStatus === "cancelled") {
    return `${flightNumber} (${routeText}) surge como cancelado. A timeline deve bloquear recomendação automática e pedir validação imediata.`;
  }

  if (flightStatus === "delayed" || departureDelay > 0) {
    return `${flightNumber} (${routeText}) apresenta atraso operacional${
      typeof departureDelay === "number" ? ` de ${departureDelay} minutos` : ""
    }. A timeline deve aplicar margem adicional e manter o voo em monitorização.`;
  }

  if (flightStatus === "active") {
    return `${flightNumber} (${routeText}) está ativo. A timeline deve manter monitorização até confirmação de partida e chegada.`;
  }

  return `${flightNumber} (${routeText}) sem atraso relevante detetado. A timeline pode manter plano base com monitorização operacional.`;
}
