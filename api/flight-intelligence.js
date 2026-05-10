export default async function handler(req, res) {
  const flightNumber = String(req.query.flight || "AF1195").toUpperCase();
  const apiKey = process.env.AVIATIONSTACK_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      success: false,
      engine: "Home2Flight Unified Flight Intelligence Layer",
      error: "AVIATIONSTACK_API_KEY is not configured.",
    });
  }

  try {
    const aviationstackUrl = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${flightNumber}`;

    const response = await fetch(aviationstackUrl);
    const rawData = await response.json();

    const flightData = rawData?.data?.[0];

    if (!flightData) {
      return res.status(404).json({
        success: false,
        generatedAt: new Date().toISOString(),
        engine: "Home2Flight Unified Flight Intelligence Layer",
        version: "0.2.0",
        flight: {
          number: flightNumber,
        },
        reliability: {
          score: 25,
          trustLevel: "low",
          sourceType: "aviationstack",
          liveDataActive: true,
          limitations: [
            "Não foi encontrado voo correspondente.",
            "O número do voo pode estar incorreto ou fora da janela disponível.",
          ],
        },
        intelligenceSummary: {
          operationalStatus: "unknown",
          delayRisk: "unknown",
          recommendationImpact: "manual_validation_required",
          summary:
            "Não foi possível obter dados reais para este voo. A timeline deve pedir validação manual.",
        },
        rawProviderStatus: rawData,
      });
    }

    const departureDelay =
      flightData?.departure?.delay ??
      calculateDelayMinutes(
        flightData?.departure?.scheduled,
        flightData?.departure?.estimated
      );

    const arrivalDelay =
      flightData?.arrival?.delay ??
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

    const flightIntelligence = {
      success: true,
      generatedAt: new Date().toISOString(),
      engine: "Home2Flight Unified Flight Intelligence Layer",
      version: "0.2.0",
      provider: {
        name: "AviationStack",
        liveDataActive: true,
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
    };

    return res.status(200).json(flightIntelligence);
  } catch (error) {
    return res.status(500).json({
      success: false,
      generatedAt: new Date().toISOString(),
      engine: "Home2Flight Unified Flight Intelligence Layer",
      version: "0.2.0",
      error: "Failed to fetch live flight intelligence.",
      details: error.message,
    });
  }
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
