export default async function handler(req, res) {
  const flight = String(req.query.flight || "AF1195").toUpperCase();
  const origin = String(req.query.origin || "Lisboa");
  const airport = String(req.query.airport || "LIS").toUpperCase();
  const mode = String(req.query.mode || "car");

  try {
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const host = req.headers.host || "localhost:3000";
    const baseUrl = `${protocol}://${host}`;

    const flightUrl = `${baseUrl}/api/flight-intelligence?flight=${encodeURIComponent(
      flight
    )}`;

    const airportUrl = `${baseUrl}/api/airport-intel?airport=${encodeURIComponent(
      airport
    )}`;

    const routeUrl = `${baseUrl}/api/route-intelligence?origin=${encodeURIComponent(
      origin
    )}&airport=${encodeURIComponent(airport)}&mode=${encodeURIComponent(mode)}`;

    const decisionUrl = `${baseUrl}/api/reliability-engine?flight=${encodeURIComponent(
      flight
    )}&origin=${encodeURIComponent(origin)}&airport=${encodeURIComponent(
      airport
    )}&mode=${encodeURIComponent(mode)}`;

    const [flightData, airportData, routeData, decisionData] =
      await Promise.all([
        fetchJson(flightUrl, "flight-intelligence"),
        fetchJson(airportUrl, "airport-intel"),
        fetchJson(routeUrl, "route-intelligence"),
        fetchJson(decisionUrl, "reliability-engine"),
      ]);

    const departureTime =
      decisionData?.decision?.recommendedDepartureLocal || "17:42";

    const flightStatus = flightData?.flight?.status || "unknown";
    const airportRisk =
      airportData?.operationalProfile?.riskLevel ||
      airportData?.intelligenceSummary?.airportRisk ||
      "medium";

    const routeRisk =
      routeData?.operationalProfile?.routeRiskLevel ||
      routeData?.intelligenceSummary?.routeRisk ||
      "medium";

    const dynamicBuffer =
      decisionData?.decision?.dynamicBufferMinutes ||
      routeData?.route?.dynamicBufferMinutes ||
      25;

    const flightDepartureTime =
      extractFlightTime(flightData?.flight?.departure?.scheduled) || "18:50";

    const timeline = [
      {
        id: 1,
        time: buildRelativeTime(departureTime, -70),
        title: "Preparar documentos e essenciais",
        category: "Preparation",
        status: "ready",
        confidence: "Preparation",
        confidenceScore: 88,
        trustLevel: "high",
        source: "User checklist",
        sourceType: "user_context",
        buffer: "Prep",
        lastUpdatedMinutesAgo: 1,
        recalculationStatus: "stable",
        liveInsight: "Preparação inicial validada com margem confortável.",
        reasoning:
          "Tempo recomendado para preparação inicial antes da saída.",
        intelligenceFlags: [
          {
            type: "user_readiness",
            label: "Checklist pessoal",
            severity: "low",
          },
        ],
        operationalSignals: [],
      },

      {
        id: 2,
        time: buildRelativeTime(departureTime, -40),
        title: "Confirmar estado do voo",
        category: "Flight",
        status: flightStatus === "delayed" ? "buffer" : "ready",
        confidence: "Flight",
        confidenceScore: flightData?.reliability?.score || 70,
        trustLevel: flightData?.reliability?.trustLevel || "medium",
        source: "Flight data",
        sourceType: "flight_engine",
        buffer: flightStatus === "delayed" ? "+10m" : "Pending",
        lastUpdatedMinutesAgo: 1,
        recalculationStatus:
          flightStatus === "delayed" ? "monitoring" : "stable",
        liveInsight:
          flightData?.intelligenceSummary?.summary ||
          "Estado do voo em monitorização.",
        reasoning:
          "Verificação final do estado do voo e documentação digital.",
        intelligenceFlags: [
          {
            type: "flight_status",
            label:
              flightStatus === "delayed"
                ? "Atraso operacional detetado"
                : "Estado do voo em monitorização",
            severity: flightStatus === "delayed" ? "medium" : "low",
          },
        ],
        operationalSignals: [
          {
            type: "flight_status",
            label:
              flightStatus === "delayed"
                ? "Atraso operacional detetado"
                : "Voo monitorizado",
            severity: flightStatus === "delayed" ? "medium" : "low",
          },
        ],
      },

      {
        id: 3,
        time: buildRelativeTime(departureTime, 0),
        title: "Sair de casa",
        category: "Transport",
        status: routeRisk === "medium" ? "buffer" : "ready",
        confidence: "Transport",
        confidenceScore: routeData?.reliability?.confidenceScore || 70,
        trustLevel: routeData?.reliability?.trustLevel || "medium",
        source: "Route engine",
        sourceType: "route_engine",
        buffer: `+${dynamicBuffer}m`,
        lastUpdatedMinutesAgo: 1,
        recalculationStatus:
          dynamicBuffer >= 25 ? "recalculated" : "stable",
        liveInsight:
          routeData?.intelligenceSummary?.summary ||
          "Hora recalculada com margem dinâmica para deslocação.",
        reasoning:
          "Hora calculada considerando transporte, buffers dinâmicos e margem operacional.",
        intelligenceFlags: [
          {
            type: "traffic",
            label: "Margem dinâmica aplicada",
            severity: "medium",
          },
          {
            type: "route",
            label: "Trajeto em monitorização",
            severity: "medium",
          },
        ],
        operationalSignals: [
          {
            type: "traffic",
            label: "Margem dinâmica aplicada",
            severity: "medium",
          },
        ],
      },

      {
        id: 4,
        time: buildRelativeTime(departureTime, dynamicBuffer),
        title: "Chegar ao aeroporto",
        category: "Airport",
        status: airportRisk === "high" ? "risk" : "buffer",
        confidence: "Airport intel",
        confidenceScore: airportData?.reliability?.confidenceScore || 65,
        trustLevel: airportData?.reliability?.trustLevel || "medium",
        source: "Operational profile",
        sourceType: "airport_profile",
        buffer: `+${dynamicBuffer}m`,
        lastUpdatedMinutesAgo: 1,
        recalculationStatus:
          airportRisk === "high" ? "risk_adjusted" : "recalculated",
        liveInsight:
          airportData?.intelligenceSummary?.summary ||
          "Chegada antecipada por variabilidade operacional.",
        reasoning:
          "Chegada recomendada baseada em filas, deslocações internas, segurança e risco operacional.",
        intelligenceFlags: [
          {
            type: "security_queue",
            label: "Fila de segurança longa",
            severity: airportRisk === "high" ? "high" : "medium",
          },
          {
            type: "airport_complexity",
            label: "Terminal com elevada variabilidade",
            severity: "medium",
          },
          {
            type: "gate_walk",
            label: "Deslocação interna prolongada",
            severity: "medium",
          },
        ],
        operationalSignals: [
          {
            type: "security_queue",
            label: "Fila de segurança longa",
            severity: airportRisk === "high" ? "high" : "medium",
          },
          {
            type: "airport_complexity",
            label: "Terminal com elevada variabilidade",
            severity: "medium",
          },
        ],
      },

      {
        id: 5,
        time: buildAbsoluteTime(flightDepartureTime),
        title: "Partida do voo",
        category: "Flight",
        status: flightStatus === "cancelled" ? "risk" : "ready",
        confidence: "Flight",
        confidenceScore: flightData?.reliability?.score || 75,
        trustLevel: flightData?.reliability?.trustLevel || "medium",
        source: "Flight data",
        sourceType: "flight_engine",
        buffer: "Pending",
        lastUpdatedMinutesAgo: 1,
        recalculationStatus:
          flightStatus === "active" ? "monitoring" : "stable",
        liveInsight:
          flightData?.intelligenceSummary?.summary ||
          "Hora programada pela companhia ainda sujeita a validação.",
        reasoning:
          "Hora programada atualmente pela companhia aérea.",
        intelligenceFlags: [
          {
            type: "flight_monitoring",
            label: "Estado do voo em monitorização",
            severity: flightStatus === "cancelled" ? "high" : "low",
          },
        ],
        operationalSignals: [],
      },
    ];

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      engine: "Home2Flight Timeline Generation Engine",
      version: "0.2.0",
      request: {
        flight,
        origin,
        airport,
        mode,
      },
      decision: decisionData?.decision || null,
      timeline,
      diagnostics: {
        baseUrl,
        flightStatus,
        airportRisk,
        routeRisk,
        dynamicBuffer,
        engines: {
          flight: flightData?.success ?? null,
          airport: airportData?.success ?? null,
          route: routeData?.success ?? null,
          decision: decisionData?.success ?? null,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      generatedAt: new Date().toISOString(),
      engine: "Home2Flight Timeline Generation Engine",
      version: "0.2.0",
      error: error.message,
    });
  }
}

async function fetchJson(url, engineName) {
  const response = await fetch(url);
  const contentType = response.headers.get("content-type") || "";
  const text = await response.text();

  if (!contentType.includes("application/json")) {
    throw new Error(
      `${engineName} returned non-JSON response. Status: ${response.status}. Preview: ${text.slice(
        0,
        120
      )}`
    );
  }

  const data = JSON.parse(text);

  if (!response.ok) {
    throw new Error(
      `${engineName} failed with status ${response.status}: ${
        data?.error || data?.message || "unknown error"
      }`
    );
  }

  return data;
}

function buildRelativeTime(baseTime, offsetMinutes) {
  const [hours, minutes] = String(baseTime).split(":").map(Number);

  const date = new Date();

  date.setHours(Number.isFinite(hours) ? hours : 17);
  date.setMinutes((Number.isFinite(minutes) ? minutes : 42) + offsetMinutes);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date.toISOString();
}

function buildAbsoluteTime(timeString) {
  const [hours, minutes] = String(timeString).split(":").map(Number);

  const date = new Date();

  date.setHours(Number.isFinite(hours) ? hours : 18);
  date.setMinutes(Number.isFinite(minutes) ? minutes : 50);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date.toISOString();
}

function extractFlightTime(dateString) {
  if (!dateString) return null;

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
