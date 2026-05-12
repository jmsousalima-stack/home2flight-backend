export default async function handler(req, res) {
  const flight = String(req.query.flight || "AF1195").toUpperCase();
  const airport = String(req.query.airport || "LIS").toUpperCase();
  const mode = String(req.query.mode || "car").toLowerCase();

  return res.status(200).json({
    success: true,
    generatedAt: new Date().toISOString(),
    engine: "Home2Flight Source Arbitration Engine",
    version: "0.1.0",
    request: { flight, airport, mode },
    arbitration: {
      overallSourceConfidence: 72,
      trustLevel: "medium",
      operationalDecision: "use_live_flight_plus_conservative_ground_buffers",
      summary:
        "Dados reais de voo disponíveis. Dados de aeroporto, rota e meteorologia ainda usam perfis conservadores até existirem fontes live confirmadas.",
    },
    sourceWeights: {
      liveFlightData: 0.42,
      airportOperationalProfile: 0.24,
      routeIntelligence: 0.2,
      weatherProfile: 0.09,
      communitySignals: 0.05,
    },
    sources: [
      {
        id: "aviationstack",
        label: "AviationStack live flight data",
        category: "flight",
        status: "active",
        trustLevel: "high",
        confidenceScore: 88,
        freshness: "live",
        role: "primary",
        limitations: [
          "Dependente da disponibilidade do fornecedor.",
          "Gate/terminal podem mudar perto da partida.",
        ],
      },
      {
        id: "airport_internal_profile",
        label: `Home2Flight airport profile — ${airport}`,
        category: "airport",
        status: "estimated",
        trustLevel: "medium",
        confidenceScore: 66,
        freshness: "static-profile",
        role: "conservative fallback",
        limitations: [
          "Ainda sem tempos oficiais de segurança em tempo real.",
          "Ainda sem granularidade por terminal/companhia aérea.",
        ],
      },
      {
        id: "route_internal_profile",
        label: `Home2Flight route profile — ${mode}`,
        category: "route",
        status: "estimated",
        trustLevel: "medium",
        confidenceScore: 71,
        freshness: "static-profile",
        role: "conservative fallback",
        limitations: [
          "Ainda sem Google Maps/Apple Maps/Waze em tempo real.",
          "Ainda sem incidentes urbanos automáticos.",
        ],
      },
      {
        id: "weather_internal_profile",
        label: "Home2Flight weather profile",
        category: "weather",
        status: "estimated",
        trustLevel: "medium",
        confidenceScore: 84,
        freshness: "static-profile",
        role: "risk modifier",
        limitations: [
          "Ainda sem meteorologia live.",
          "Ainda sem radar operacional aeroportuário.",
        ],
      },
      {
        id: "community_layer",
        label: "Community operational reports",
        category: "community",
        status: "inactive",
        trustLevel: "low",
        confidenceScore: 0,
        freshness: "unavailable",
        role: "future signal layer",
        limitations: [
          "Ainda sem reports de utilizadores.",
          "Ainda sem validação cruzada comunitária.",
        ],
      },
    ],
    conflicts: [],
    recommendations: [
      {
        priority: "high",
        action: "keep_conservative_buffers",
        reason:
          "Fontes de rota e aeroporto ainda não são live; manter margem dinâmica conservadora.",
      },
      {
        priority: "high",
        action: "prioritize_live_flight_status",
        reason:
          "O estado do voo é atualmente a fonte mais fidedigna do sistema.",
      },
      {
        priority: "medium",
        action: "increase_confidence_when_route_api_is_added",
        reason:
          "A próxima grande melhoria de fiabilidade virá da integração real de tráfego/rota.",
      },
    ],
    diagnostics: {
      liveSources: 1,
      estimatedSources: 3,
      inactiveSources: 1,
      criticalMissingSources: [
        "live_route_data",
        "live_airport_security_waits",
        "live_airport_disruptions",
        "community_reports",
      ],
    },
  });
}