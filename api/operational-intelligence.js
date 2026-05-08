export default function handler(req, res) {
  const airport = (req.query.airport || "LIS").toUpperCase();

  const signalsByAirport = {
    LIS: {
      disruptionScore: 18,
      riskLevel: "low",
      signals: [],
    },

    AMS: {
      disruptionScore: 32,
      riskLevel: "medium",
      signals: [
        {
          type: "congestion",
          severity: "medium",
          title: "Possível congestionamento operacional",
          impactMinutes: 10,
          source: "Home2Flight Operational Profile",
          verified: false,
        },
      ],
    },

    CDG: {
      disruptionScore: 58,
      riskLevel: "high",
      signals: [
        {
          type: "airport_complexity",
          severity: "high",
          title: "Aeroporto complexo com maior variabilidade operacional",
          impactMinutes: 20,
          source: "Home2Flight Operational Profile",
          verified: true,
        },
        {
          type: "connection_pressure",
          severity: "medium",
          title: "Maior risco de filas e deslocações internas longas",
          impactMinutes: 12,
          source: "Home2Flight Airport Profile",
          verified: true,
        },
      ],
    },

    DXB: {
      disruptionScore: 40,
      riskLevel: "medium",
      signals: [
        {
          type: "large_airport",
          severity: "medium",
          title: "Aeroporto de grande dimensão com deslocações internas longas",
          impactMinutes: 15,
          source: "Home2Flight Operational Profile",
          verified: true,
        },
      ],
    },
  };

  const operational = signalsByAirport[airport] || signalsByAirport.LIS;

  res.status(200).json({
    airport,

    operationalIntelligence: {
      disruptionScore: operational.disruptionScore,
      riskLevel: operational.riskLevel,
      hasActiveSignals: operational.signals.length > 0,
      totalImpactMinutes: operational.signals.reduce(
        (sum, signal) => sum + signal.impactMinutes,
        0
      ),
    },

    signals: operational.signals,

    sourceBreakdown: {
      airportProfile: "Home2Flight Airport Profile",
      liveNews: "future-news-engine",
      weather: "future-weather-engine",
      strikes: "future-strike-engine",
      community: "future-community-layer",
    },

    limitations: [
      "Ainda sem leitura automática de notícias reais.",
      "Ainda sem integração meteorológica live.",
      "Ainda sem integração oficial de greves ou incidentes.",
      "Ainda sem reports da comunidade.",
    ],

    metadata: {
      engine: "Home2Flight Operational Intelligence Engine",
      version: "0.1.0",
    },
  });
}
