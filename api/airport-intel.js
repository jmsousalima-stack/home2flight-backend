export default function handler(req, res) {
  const airport = req.query.airport || "LIS";

  const profiles = {
    LIS: {
      name: "Lisboa Humberto Delgado",
      country: "Portugal",
      sourceProfile: "Home2Flight Internal Profile — LIS",
      confidence: "Média",
      score: 72,
      security: 18,
      bagDrop: 12,
      passportControl: 10,
      gateWalk: 14,
      riskLevel: "normal"
    }
  };

  const profile = profiles[airport] || profiles.LIS;

  const estimatedQuality = {
    level: "estimated",
    confidence: "medium",
    live: false,
    official: false,
    community: false
  };

  res.status(200).json({
    airport: {
      code: airport,
      name: profile.name,
      country: profile.country
    },

    reliability: {
      score: profile.score,
      confidence: profile.confidence,
      riskLevel: profile.riskLevel,
      confidenceReason:
        "Tempo estimado por perfil interno Home2Flight. Ainda sem integração direta com dados oficiais em tempo real.",
      source: profile.sourceProfile,
      freshness: "static-profile"
    },

    timings: {
      security: {
        dataQuality: estimatedQuality,
        minutes: profile.security,
        source: profile.sourceProfile
      },

      bagDrop: {
        dataQuality: estimatedQuality,
        minutes: profile.bagDrop,
        source: profile.sourceProfile
      },

      passportControl: {
        dataQuality: estimatedQuality,
        minutes: profile.passportControl,
        source: profile.sourceProfile
      },

      gateWalk: {
        dataQuality: estimatedQuality,
        minutes: profile.gateWalk,
        source: profile.sourceProfile
      }
    },

    officialSources: {
      airportLiveData: false,
      securityWaitTimes: false,
      airlineBagDrop: false,
      borderControl: false,
      gateWalkingTime: false
    },

    sourceBreakdown: {
      flightData: "future-flight-api",
      routeData: "future-maps-api",
      airportProfile: profile.sourceProfile,
      alerts: "future-alerts-engine",
      communityReports: "future-community-layer"
    },

    alerts: [],

    limitations: [
      "Ainda sem dados oficiais em tempo real deste aeroporto",
      "Ainda sem tempos por companhia aérea",
      "Ainda sem leitura automática de greves, notícias ou incidentes",
      "Ainda sem reports da comunidade"
    ],

    metadata: {
      engine: "Home2Flight Airport Intelligence Engine",
      version: "0.3.0"
    }
  });
}
