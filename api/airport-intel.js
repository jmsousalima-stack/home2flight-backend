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
    },

    OPO: {
      name: "Porto Francisco Sá Carneiro",
      country: "Portugal",
      sourceProfile: "Home2Flight Internal Profile — OPO",
      confidence: "Média",
      score: 70,
      security: 16,
      bagDrop: 10,
      passportControl: 8,
      gateWalk: 12,
      riskLevel: "normal"
    },

    AMS: {
      name: "Amsterdam Schiphol",
      country: "Netherlands",
      sourceProfile: "Home2Flight Official-ready Profile — AMS",
      confidence: "Média-alta",
      score: 82,
      security: 22,
      bagDrop: 14,
      passportControl: 12,
      gateWalk: 18,
      riskLevel: "normal"
    },

    LHR: {
      name: "London Heathrow",
      country: "United Kingdom",
      sourceProfile: "Home2Flight Official-ready Profile — LHR",
      confidence: "Média",
      score: 78,
      security: 28,
      bagDrop: 16,
      passportControl: 18,
      gateWalk: 22,
      riskLevel: "medium"
    },

    MAD: {
      name: "Madrid-Barajas",
      country: "Spain",
      sourceProfile: "Home2Flight Internal Profile — MAD",
      confidence: "Média-baixa",
      score: 68,
      security: 24,
      bagDrop: 14,
      passportControl: 16,
      gateWalk: 20,
      riskLevel: "medium"
    },

    BCN: {
      name: "Barcelona El Prat",
      country: "Spain",
      sourceProfile: "Home2Flight Internal Profile — BCN",
      confidence: "Média-baixa",
      score: 67,
      security: 22,
      bagDrop: 14,
      passportControl: 15,
      gateWalk: 18,
      riskLevel: "medium"
    },

    CDG: {
      name: "Paris Charles de Gaulle",
      country: "France",
      sourceProfile: "Home2Flight Internal Profile — CDG",
      confidence: "Média-baixa",
      score: 64,
      security: 32,
      bagDrop: 18,
      passportControl: 20,
      gateWalk: 28,
      riskLevel: "high"
    },

    DXB: {
      name: "Dubai International",
      country: "United Arab Emirates",
      sourceProfile: "Home2Flight Internal Profile — DXB",
      confidence: "Média",
      score: 74,
      security: 26,
      bagDrop: 18,
      passportControl: 18,
      gateWalk: 26,
      riskLevel: "medium"
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
      version: "0.4.0"
    }
  });
}
