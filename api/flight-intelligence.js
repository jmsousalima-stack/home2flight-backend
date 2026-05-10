export default function handler(req, res) {
  const flightNumber = String(req.query.flight || "AF1195").toUpperCase();

  const flightIntelligence = {
    success: true,
    generatedAt: new Date().toISOString(),
    engine: "Home2Flight Unified Flight Intelligence Layer",
    version: "0.1.0",
    flight: {
      number: flightNumber,
      airline: {
        name: "Air France",
        code: "AF",
      },
      status: "delayed",
      route: {
        from: {
          code: "LIS",
          name: "Lisboa Humberto Delgado",
          city: "Lisbon",
          country: "Portugal",
        },
        to: {
          code: "CDG",
          name: "Paris Charles de Gaulle",
          city: "Paris",
          country: "France",
        },
      },
      departure: {
        scheduled: "2026-05-08T16:40:00.000Z",
        estimated: "2026-05-08T17:05:00.000Z",
        delayMinutes: 25,
        terminal: "1",
        gate: null,
      },
      arrival: {
        scheduled: "2026-05-08T20:10:00.000Z",
        estimated: "2026-05-08T20:35:00.000Z",
        delayMinutes: 25,
        terminal: null,
        gate: null,
      },
    },
    reliability: {
      score: 72,
      trustLevel: "medium",
      sourceType: "mock_structured_layer",
      liveDataActive: false,
      limitations: [
        "Dados estruturados para preparar integração real.",
        "Ainda não ligado a fornecedor externo de voos.",
        "Terminal e gate ainda sujeitos a validação.",
      ],
    },
    intelligenceSummary: {
      operationalStatus: "monitoring",
      delayRisk: "medium",
      recommendationImpact: "departure_buffer_required",
      summary:
        "Voo com atraso operacional detetado. A timeline deve aplicar margem adicional e manter o estado do voo em monitorização.",
    },
  };

  res.status(200).json(flightIntelligence);
}
