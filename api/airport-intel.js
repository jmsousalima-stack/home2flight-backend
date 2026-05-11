export default function handler(req, res) {
  const airportCode = String(req.query.airport || "LIS").toUpperCase();

  const profiles = {
    LIS: {
      code: "LIS",
      name: "Lisboa Humberto Delgado",
      city: "Lisbon",
      country: "Portugal",
      sourceProfile: "Home2Flight Internal Airport Profile — LIS",
      sourceType: "internal_profile",
      confidenceScore: 66,
      trustLevel: "medium",
      liveDataActive: false,
      riskLevel: "medium",
      baseScore: 68,
      operationalComplexity: "medium",
      congestionLevel: "medium",
      terminalComplexity: "medium",
      securityVariability: "medium",
      security: 22,
      bagDrop: 14,
      passportControl: 12,
      gateWalk: 16,
      recommendedAirportBuffer: 25,
      peakRiskWindows: ["06:00-09:00", "17:00-20:00"],
      intelligenceFlags: [
        {
          type: "security_variability",
          label: "Variabilidade em segurança",
          severity: "medium",
        },
        {
          type: "terminal_pressure",
          label: "Aeroporto com pressão operacional",
          severity: "medium",
        },
      ],
    },

    OPO: {
      code: "OPO",
      name: "Porto Francisco Sá Carneiro",
      city: "Porto",
      country: "Portugal",
      sourceProfile: "Home2Flight Internal Airport Profile — OPO",
      sourceType: "internal_profile",
      confidenceScore: 68,
      trustLevel: "medium",
      liveDataActive: false,
      riskLevel: "low",
      baseScore: 74,
      operationalComplexity: "low",
      congestionLevel: "low",
      terminalComplexity: "low",
      securityVariability: "low",
      security: 16,
      bagDrop: 12,
      passportControl: 8,
      gateWalk: 12,
      recommendedAirportBuffer: 15,
      peakRiskWindows: ["06:00-08:30"],
      intelligenceFlags: [
        {
          type: "stable_airport",
          label: "Perfil operacional estável",
          severity: "low",
        },
      ],
    },

    AMS: {
      code: "AMS",
      name: "Amsterdam Schiphol",
      city: "Amsterdam",
      country: "Netherlands",
      sourceProfile: "Home2Flight Internal Airport Profile — AMS",
      sourceType: "internal_profile",
      confidenceScore: 70,
      trustLevel: "medium",
      liveDataActive: false,
      riskLevel: "medium",
      baseScore: 70,
      operationalComplexity: "high",
      congestionLevel: "medium",
      terminalComplexity: "high",
      securityVariability: "medium",
      security: 24,
      bagDrop: 16,
      passportControl: 14,
      gateWalk: 22,
      recommendedAirportBuffer: 30,
      peakRiskWindows: ["07:00-10:00", "16:00-19:00"],
      intelligenceFlags: [
        {
          type: "large_hub",
          label: "Hub internacional complexo",
          severity: "medium",
        },
        {
          type: "walking_distance",
          label: "Deslocações internas relevantes",
          severity: "medium",
        },
      ],
    },

    LHR: {
      code: "LHR",
      name: "London Heathrow",
      city: "London",
      country: "United Kingdom",
      sourceProfile: "Home2Flight Internal Airport Profile — LHR",
      sourceType: "internal_profile",
      confidenceScore: 69,
      trustLevel: "medium",
      liveDataActive: false,
      riskLevel: "high",
      baseScore: 64,
      operationalComplexity: "high",
      congestionLevel: "high",
      terminalComplexity: "high",
      securityVariability: "medium",
      security: 30,
      bagDrop: 18,
      passportControl: 22,
      gateWalk: 26,
      recommendedAirportBuffer: 40,
      peakRiskWindows: ["06:00-10:00", "16:00-20:00"],
      intelligenceFlags: [
        {
          type: "high_complexity",
          label: "Aeroporto de elevada complexidade",
          severity: "high",
        },
        {
          type: "border_control",
          label: "Controlo fronteiriço relevante",
          severity: "medium",
        },
      ],
    },

    MAD: {
      code: "MAD",
      name: "Madrid-Barajas",
      city: "Madrid",
      country: "Spain",
      sourceProfile: "Home2Flight Internal Airport Profile — MAD",
      sourceType: "internal_profile",
      confidenceScore: 62,
      trustLevel: "medium",
      liveDataActive: false,
      riskLevel: "medium",
      baseScore: 66,
      operationalComplexity: "medium",
      congestionLevel: "medium",
      terminalComplexity: "high",
      securityVariability: "medium",
      security: 24,
      bagDrop: 15,
      passportControl: 16,
      gateWalk: 24,
      recommendedAirportBuffer: 30,
      peakRiskWindows: ["07:00-10:00", "17:00-20:00"],
      intelligenceFlags: [
        {
          type: "terminal_complexity",
          label: "Terminal com elevada variabilidade",
          severity: "medium",
        },
      ],
    },

    BCN: {
      code: "BCN",
      name: "Barcelona El Prat",
      city: "Barcelona",
      country: "Spain",
      sourceProfile: "Home2Flight Internal Airport Profile — BCN",
      sourceType: "internal_profile",
      confidenceScore: 61,
      trustLevel: "medium",
      liveDataActive: false,
      riskLevel: "medium",
      baseScore: 65,
      operationalComplexity: "medium",
      congestionLevel: "medium",
      terminalComplexity: "medium",
      securityVariability: "medium",
      security: 23,
      bagDrop: 14,
      passportControl: 15,
      gateWalk: 20,
      recommendedAirportBuffer: 30,
      peakRiskWindows: ["07:00-10:00", "16:00-20:00"],
      intelligenceFlags: [
        {
          type: "tourism_pressure",
          label: "Pressão turística sazonal",
          severity: "medium",
        },
      ],
    },

    CDG: {
      code: "CDG",
      name: "Paris Charles de Gaulle",
      city: "Paris",
      country: "France",
      sourceProfile: "Home2Flight Internal Airport Profile — CDG",
      sourceType: "internal_profile",
      confidenceScore: 64,
      trustLevel: "medium",
      liveDataActive: false,
      riskLevel: "high",
      baseScore: 58,
      operationalComplexity: "high",
      congestionLevel: "high",
      terminalComplexity: "high",
      securityVariability: "high",
      security: 34,
      bagDrop: 20,
      passportControl: 22,
      gateWalk: 30,
      recommendedAirportBuffer: 45,
      peakRiskWindows: ["06:00-10:00", "16:00-21:00"],
      intelligenceFlags: [
        {
          type: "security_queue",
          label: "Fila de segurança longa",
          severity: "high",
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
    },

    DXB: {
      code: "DXB",
      name: "Dubai International",
      city: "Dubai",
      country: "United Arab Emirates",
      sourceProfile: "Home2Flight Internal Airport Profile — DXB",
      sourceType: "internal_profile",
      confidenceScore: 67,
      trustLevel: "medium",
      liveDataActive: false,
      riskLevel: "medium",
      baseScore: 70,
      operationalComplexity: "high",
      congestionLevel: "medium",
      terminalComplexity: "high",
      securityVariability: "medium",
      security: 26,
      bagDrop: 18,
      passportControl: 18,
      gateWalk: 28,
      recommendedAirportBuffer: 35,
      peakRiskWindows: ["00:00-03:00", "20:00-23:30"],
      intelligenceFlags: [
        {
          type: "large_hub",
          label: "Hub internacional de grande escala",
          severity: "medium",
        },
        {
          type: "walking_distance",
          label: "Deslocações internas prolongadas",
          severity: "medium",
        },
      ],
    },
  };

  const profile = profiles[airportCode] || buildFallbackProfile(airportCode);

  const risk = calculateAirportRisk(profile);
  const intelligenceSummary = buildIntelligenceSummary(profile, risk);

  return res.status(200).json({
    success: true,
    generatedAt: new Date().toISOString(),
    engine: "Home2Flight Airport Intelligence Engine",
    version: "0.5.0",

    airport: {
      code: profile.code,
      name: profile.name,
      city: profile.city,
      country: profile.country,
    },

    operationalProfile: {
      riskLevel: profile.riskLevel,
      operationalComplexity: profile.operationalComplexity,
      congestionLevel: profile.congestionLevel,
      terminalComplexity: profile.terminalComplexity,
      securityVariability: profile.securityVariability,
      peakRiskWindows: profile.peakRiskWindows,
    },

    recommendedBuffers: {
      airportBufferMinutes: profile.recommendedAirportBuffer,
      securityMinutes: profile.security,
      bagDropMinutes: profile.bagDrop,
      passportControlMinutes: profile.passportControl,
      gateWalkMinutes: profile.gateWalk,
      totalAirportProcessMinutes:
        profile.security +
        profile.bagDrop +
        profile.passportControl +
        profile.gateWalk,
    },

    reliability: {
      score: risk.reliabilityScore,
      confidenceScore: profile.confidenceScore,
      trustLevel: profile.trustLevel,
      sourceType: profile.sourceType,
      source: profile.sourceProfile,
      liveDataActive: profile.liveDataActive,
      dataFreshness: profile.liveDataActive ? "live" : "static-profile",
      limitations: [
        "Ainda sem integração direta com tempos oficiais de segurança em tempo real.",
        "Ainda sem dados específicos por companhia aérea para bag drop.",
        "Ainda sem reports comunitários validados.",
        "Perfil interno usado como camada conservadora até existir fonte live confirmada.",
      ],
    },

    intelligenceSummary,

    intelligenceFlags: profile.intelligenceFlags,

    sourceBreakdown: {
      airportProfile: profile.sourceProfile,
      securityWaitTimes: profile.liveDataActive ? "live-provider" : "internal-profile",
      airlineBagDrop: "future-airline-layer",
      borderControl: "future-border-control-layer",
      gateWalkingTime: "internal-profile",
      alerts: "future-alerts-engine",
      communityReports: "future-community-layer",
    },

    officialSources: {
      airportLiveData: profile.liveDataActive,
      securityWaitTimes: false,
      airlineBagDrop: false,
      borderControl: false,
      gateWalkingTime: false,
    },

    diagnostics: {
      requestedAirport: airportCode,
      matchedProfile: Boolean(profiles[airportCode]),
      fallbackUsed: !profiles[airportCode],
    },
  });
}

function buildFallbackProfile(airportCode) {
  return {
    code: airportCode,
    name: "Unknown airport",
    city: null,
    country: null,
    sourceProfile: "Home2Flight Conservative Fallback Airport Profile",
    sourceType: "fallback_profile",
    confidenceScore: 35,
    trustLevel: "low",
    liveDataActive: false,
    riskLevel: "medium",
    baseScore: 45,
    operationalComplexity: "unknown",
    congestionLevel: "unknown",
    terminalComplexity: "unknown",
    securityVariability: "unknown",
    security: 30,
    bagDrop: 20,
    passportControl: 20,
    gateWalk: 25,
    recommendedAirportBuffer: 45,
    peakRiskWindows: [],
    intelligenceFlags: [
      {
        type: "unknown_airport",
        label: "Aeroporto sem perfil validado",
        severity: "medium",
      },
      {
        type: "manual_validation",
        label: "Validação manual recomendada",
        severity: "medium",
      },
    ],
  };
}

function calculateAirportRisk(profile) {
  let reliabilityScore = profile.baseScore;

  if (profile.riskLevel === "high") reliabilityScore -= 8;
  if (profile.riskLevel === "medium") reliabilityScore -= 4;

  if (profile.operationalComplexity === "high") reliabilityScore -= 5;
  if (profile.congestionLevel === "high") reliabilityScore -= 5;
  if (profile.securityVariability === "high") reliabilityScore -= 6;

  if (profile.liveDataActive) reliabilityScore += 10;
  if (profile.sourceType === "fallback_profile") reliabilityScore -= 15;

  reliabilityScore = Math.max(10, Math.min(95, reliabilityScore));

  return {
    reliabilityScore,
  };
}

function buildIntelligenceSummary(profile, risk) {
  if (profile.sourceType === "fallback_profile") {
    return {
      operationalStatus: "manual_validation_required",
      airportRisk: "unknown",
      recommendationImpact: "conservative_buffer_required",
      summary:
        "Aeroporto sem perfil interno validado. A Home2Flight deve aplicar margem conservadora e pedir validação manual ao utilizador.",
    };
  }

  if (profile.riskLevel === "high") {
    return {
      operationalStatus: "risk_adjusted",
      airportRisk: "high",
      recommendationImpact: "airport_buffer_required",
      summary: `${profile.code} apresenta elevada complexidade operacional. A timeline deve aplicar buffer reforçado para segurança, deslocações internas e variabilidade aeroportuária.`,
    };
  }

  if (profile.riskLevel === "medium") {
    return {
      operationalStatus: "monitoring",
      airportRisk: "medium",
      recommendationImpact: "dynamic_buffer_recommended",
      summary: `${profile.code} apresenta risco operacional moderado. A timeline deve aplicar margem dinâmica e manter monitorização até à partida.`,
    };
  }

  return {
    operationalStatus: "stable",
    airportRisk: "low",
    recommendationImpact: "standard_airport_buffer",
    summary: `${profile.code} apresenta perfil operacional estável. A timeline pode usar buffer normal com monitorização de rotina.`,
  };
}
