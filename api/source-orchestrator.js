export default function handler(req, res) {

  const airport = (req.query.airport || "CDG").toUpperCase();

  const sources = [
    {
      id: "airport_profile",
      type: "internal_profile",
      provider: "Home2Flight Airport Intelligence",
      active: true,
      trustLevel: "high",
      freshness: "static-profile",
      liveData: false,
      verified: true,
      impactOnReliability: {
        positive: 18,
        negative: 0
      },
      coverage: [
        "airport_complexity",
        "gate_distance",
        "terminal_pressure",
        "historical_variability"
      ]
    },

    {
      id: "flight_status",
      type: "flight_data",
      provider: "Home2Flight Flight Engine",
      active: true,
      trustLevel: "medium",
      freshness: "recent-flight-state",
      liveData: false,
      verified: false,
      impactOnReliability: {
        positive: 8,
        negative: -12
      },
      coverage: [
        "delays",
        "gate_changes",
        "operational_status"
      ]
    },

    {
      id: "community_reports",
      type: "community",
      provider: "Home2Flight Community Intelligence",
      active: true,
      trustLevel: "medium",
      freshness: "recent-community-signals",
      liveData: false,
      verified: false,
      impactOnReliability: {
        positive: 6,
        negative: -10
      },
      coverage: [
        "security_queues",
        "terminal_movements",
        "boarding_delays",
        "crowding"
      ]
    },

    {
      id: "operational_intelligence",
      type: "operational_signals",
      provider: "Home2Flight Operational Intelligence",
      active: true,
      trustLevel: "high",
      freshness: "semi-live-operational-analysis",
      liveData: false,
      verified: true,
      impactOnReliability: {
        positive: 10,
        negative: -15
      },
      coverage: [
        "airport_pressure",
        "connection_risk",
        "operational_instability",
        "passenger_flow"
      ]
    },

    {
      id: "official_live_data",
      type: "official_api",
      provider: "Future Official Airport APIs",
      active: false,
      trustLevel: "very_high",
      freshness: "real-time",
      liveData: false,
      verified: true,
      impactOnReliability: {
        positive: 30,
        negative: 0
      },
      coverage: [
        "security_wait_times",
        "live_queue_status",
        "terminal_density",
        "live_gate_updates"
      ]
    },

    {
      id: "weather_engine",
      type: "weather",
      provider: "Future Weather Engine",
      active: false,
      trustLevel: "high",
      freshness: "future-live-weather",
      liveData: false,
      verified: true,
      impactOnReliability: {
        positive: 4,
        negative: -18
      },
      coverage: [
        "storms",
        "wind",
        "fog",
        "weather_disruptions"
      ]
    },

    {
      id: "strike_engine",
      type: "disruption_monitoring",
      provider: "Future Strike & Incident Engine",
      active: false,
      trustLevel: "high",
      freshness: "future-live-monitoring",
      liveData: false,
      verified: true,
      impactOnReliability: {
        positive: 2,
        negative: -30
      },
      coverage: [
        "airport_strikes",
        "border_control_disruptions",
        "transport_disruptions",
        "incidents"
      ]
    }
  ];

  const activeSources = sources.filter(source => source.active);
  const inactiveSources = sources.filter(source => !source.active);

  const trustDistribution = {
    very_high: sources.filter(s => s.trustLevel === "very_high").length,
    high: sources.filter(s => s.trustLevel === "high").length,
    medium: sources.filter(s => s.trustLevel === "medium").length,
    low: sources.filter(s => s.trustLevel === "low").length
  };

  res.status(200).json({
    airport,

    orchestration: {
      totalSources: sources.length,
      activeSources: activeSources.length,
      inactiveSources: inactiveSources.length,
      liveSources: sources.filter(s => s.liveData).length
    },

    trustDistribution,

    activeSourceSummary: activeSources.map(source => ({
      id: source.id,
      provider: source.provider,
      trustLevel: source.trustLevel,
      freshness: source.freshness
    })),

    sources,

    limitations: [
      "Ainda sem integrações oficiais live.",
      "Ainda sem weather engine real.",
      "Ainda sem monitorização automática de greves/incidentes.",
      "Ainda sem validação cruzada multi-source.",
      "Ainda sem weighted reliability arbitration entre fontes."
    ],

    roadmap: {
      nextLayer: [
        "official_airport_apis",
        "live_security_wait_times",
        "weather_disruption_engine",
        "strike_detection_engine",
        "multi-source_conflict_resolution",
        "real_time_confidence_recalculation"
      ]
    },

    metadata: {
      engine: "Home2Flight Source Orchestrator",
      version: "0.1.0"
    }
  });
}
