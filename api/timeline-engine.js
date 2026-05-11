export default async function handler(req, res) {
  const flight = req.query.flight || "AF1195";
  const origin = req.query.origin || "Lisboa";
  const airport = req.query.airport || "LIS";
  const mode = req.query.mode || "car";

  try {
    const baseUrl =
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    // =========================
    // FETCH ENGINES
    // =========================

    const [
      flightResponse,
      airportResponse,
      routeResponse,
      decisionResponse,
    ] = await Promise.all([
      fetch(
        `${baseUrl}/api/flight-intelligence?flight=${flight}`
      ),

      fetch(
        `${baseUrl}/api/airport-intel?airport=${airport}`
      ),

      fetch(
        `${baseUrl}/api/route-intelligence?origin=${origin}&airport=${airport}&mode=${mode}`
      ),

      fetch(
        `${baseUrl}/api/reliability-engine?flight=${flight}&origin=${origin}&airport=${airport}&mode=${mode}`
      ),
    ]);

    const flightData = await flightResponse.json();
    const airportData = await airportResponse.json();
    const routeData = await routeResponse.json();
    const decisionData = await decisionResponse.json();

    // =========================
    // CORE VALUES
    // =========================

    const departureTime =
      decisionData?.decision?.recommendedDepartureLocal || "17:42";

    const flightStatus =
      flightData?.flight?.status || "unknown";

    const airportRisk =
      airportData?.operationalProfile?.riskLevel || "medium";

    const routeRisk =
      routeData?.operationalProfile?.routeRiskLevel || "medium";

    const dynamicBuffer =
      decisionData?.decision?.dynamicBufferMinutes || 25;

    // =========================
    // TIMELINE
    // =========================

    const timeline = [
      {
        id: 1,
        time: buildRelativeTime(departureTime, -70),

        status: "ready",

        recalculationStatus: "stable",

        title: "Preparar documentos",

        category: "Preparation",

        confidenceScore: 88,

        trustLevel: "high",

        liveInsight:
          "Preparação inicial validada antes da saída.",

        reasoning:
          "Checklist inicial para garantir documentação, boarding pass e essenciais.",

        source: "Preparation layer",

        operationalSignals: [
          {
            label: "Checklist pessoal",
            severity: "low",
          },
        ],

        lastUpdatedMinutesAgo: 1,
      },

      {
        id: 2,

        time: buildRelativeTime(departureTime, -40),

        status:
          flightStatus === "delayed"
            ? "buffer"
            : "ready",

        recalculationStatus:
          flightStatus === "delayed"
            ? "monitoring"
            : "stable",

        title: "Confirmar estado do voo",

        category: "Flight",

        confidenceScore:
          flightData?.reliability?.score || 70,

        trustLevel:
          flightData?.reliability?.trustLevel || "medium",

        liveInsight:
          flightData?.intelligenceSummary?.summary,

        reasoning:
          "Última validação operacional do voo antes da saída.",

        source: "Flight intelligence",

        operationalSignals: [
          {
            label:
              flightStatus === "delayed"
                ? "Atraso operacional"
                : "Voo monitorizado",

            severity:
              flightStatus === "delayed"
                ? "medium"
                : "low",
          },
        ],

        lastUpdatedMinutesAgo: 1,
      },

      {
        id: 3,

        time: departureTime,

        status:
          routeRisk === "medium"
            ? "buffer"
            : "ready",

        recalculationStatus:
          dynamicBuffer >= 25
            ? "recalculated"
            : "stable",

        title: "Sair para o aeroporto",

        category: "Transport",

        confidenceScore:
          routeData?.reliability?.confidenceScore || 70,

        trustLevel:
          routeData?.reliability?.trustLevel || "medium",

        liveInsight:
          routeData?.intelligenceSummary?.summary,

        reasoning:
          `Buffer dinâmico de ${dynamicBuffer} minutos aplicado à deslocação.`,

        source: "Route intelligence",

        buffer: `+${dynamicBuffer}m`,

        operationalSignals: [
          {
            label: "Margem dinâmica",
            severity: "medium",
          },

          {
            label: "Trânsito monitorizado",
            severity: "medium",
          },
        ],

        lastUpdatedMinutesAgo: 1,
      },

      {
        id: 4,

        time: buildRelativeTime(departureTime, dynamicBuffer),

        status:
          airportRisk === "high"
            ? "risk"
            : "buffer",

        recalculationStatus:
          airportRisk === "high"
            ? "risk_adjusted"
            : "recalculated",

        title: "Chegar ao aeroporto",

        category: "Airport",

        confidenceScore:
          airportData?.reliability?.confidenceScore || 65,

        trustLevel:
          airportData?.reliability?.trustLevel || "medium",

        liveInsight:
          airportData?.intelligenceSummary?.summary,

        reasoning:
          "Chegada antecipada considerando segurança, terminal e variabilidade operacional.",

        source: "Airport intelligence",

        buffer: `+${dynamicBuffer}m`,

        operationalSignals: [
          {
            label: "Segurança aeroportuária",
            severity:
              airportRisk === "high"
                ? "high"
                : "medium",
          },

          {
            label: "Walking time",
            severity: "medium",
          },
        ],

        lastUpdatedMinutesAgo: 1,
      },

      {
        id: 5,

        time:
          extractFlightTime(
            flightData?.flight?.departure?.scheduled
          ) || "18:50",

        status:
          flightStatus === "active"
            ? "ready"
            : "buffer",

        recalculationStatus:
          flightStatus === "active"
            ? "monitoring"
            : "stable",

        title: "Partida do voo",

        category: "Flight",

        confidenceScore:
          flightData?.reliability?.score || 75,

        trustLevel:
          flightData?.reliability?.trustLevel || "medium",

        liveInsight:
          flightData?.intelligenceSummary?.summary,

        reasoning:
          "Estado atual monitorizado pela camada de voo.",

        source: "Flight intelligence",

        operationalSignals: [
          {
            label: "Estado do voo",
            severity:
              flightStatus === "cancelled"
                ? "high"
                : "low",
          },
        ],

        lastUpdatedMinutesAgo: 1,
      },
    ];

    // =========================
    // RESPONSE
    // =========================

    return res.status(200).json({
      success: true,

      generatedAt: new Date().toISOString(),

      engine: "Home2Flight Timeline Generation Engine",

      version: "0.1.0",

      request: {
        flight,
        origin,
        airport,
        mode,
      },

      decision: decisionData?.decision,

      timeline,

      diagnostics: {
        flightStatus,
        airportRisk,
        routeRisk,
        dynamicBuffer,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,

      engine: "Home2Flight Timeline Generation Engine",

      error: error.message,
    });
  }
}

// =====================================
// HELPERS
// =====================================

function buildRelativeTime(baseTime, offsetMinutes) {
  const [hours, minutes] = baseTime.split(":").map(Number);

  const date = new Date();

  date.setHours(hours);
  date.setMinutes(minutes + offsetMinutes);

  return date.toISOString();
}

function extractFlightTime(dateString) {
  if (!dateString) return null;

  const date = new Date(dateString);

  return date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
