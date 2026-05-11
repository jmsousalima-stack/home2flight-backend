export default async function handler(req, res) {
  const origin = String(req.query.origin || "Lisboa").trim();
  const airport = String(req.query.airport || "LIS").toUpperCase();
  const transportMode = String(req.query.mode || "car").toLowerCase();

  const routeProfile = buildRouteProfile({
    origin,
    airport,
    transportMode,
  });

  return res.status(200).json(routeProfile);
}

function buildRouteProfile({ origin, airport, transportMode }) {
  const airportProfiles = getAirportProfiles();
  const airportProfile = airportProfiles[airport] || airportProfiles.LIS;

  const baseRouteMinutes = estimateBaseRouteMinutes({
    origin,
    airport,
    transportMode,
  });

  const trafficRisk = estimateTrafficRisk({
    airport,
    transportMode,
  });

  const disruptionRisk = estimateDisruptionRisk({
    transportMode,
  });

  const bufferMinutes = calculateRouteBuffer({
    baseRouteMinutes,
    trafficRisk,
    disruptionRisk,
    airportRiskLevel: airportProfile.riskLevel,
    transportMode,
  });

  const totalRouteMinutes = baseRouteMinutes + bufferMinutes;

  const reliabilityScore = calculateRouteReliability({
    transportMode,
    trafficRisk,
    disruptionRisk,
    airportProfile,
  });

  const riskLevel = calculateRouteRiskLevel({
    trafficRisk,
    disruptionRisk,
    bufferMinutes,
    airportRiskLevel: airportProfile.riskLevel,
  });

  return {
    success: true,
    generatedAt: new Date().toISOString(),
    engine: "Home2Flight Route Intelligence Engine",
    version: "0.1.0",

    route: {
      origin,
      destinationAirport: {
        code: airport,
        name: airportProfile.name,
        city: airportProfile.city,
        country: airportProfile.country,
      },
      transportMode,
      estimatedRouteMinutes: baseRouteMinutes,
      dynamicBufferMinutes: bufferMinutes,
      totalRecommendedRouteMinutes: totalRouteMinutes,
    },

    operationalProfile: {
      trafficRisk,
      disruptionRisk,
      airportAccessRisk: airportProfile.accessRisk,
      airportRiskLevel: airportProfile.riskLevel,
      routeRiskLevel: riskLevel,
    },

    reliability: {
      score: reliabilityScore,
      confidenceScore: Math.min(95, reliabilityScore + 6),
      trustLevel: getTrustLevel(reliabilityScore),
      sourceType: "internal_route_profile",
      source: "Home2Flight Internal Route Intelligence",
      liveDataActive: false,
      dataFreshness: "static-route-profile",
      limitations: [
        "Ainda sem integração direta com Google Maps, Apple Maps ou transportes públicos em tempo real.",
        "Ainda sem deteção automática de acidentes, greves, obras ou incidentes urbanos.",
        "Tempo de rota calculado por perfil interno conservador.",
        "A recomendação deve ser tratada como estimativa operacional até existir fonte live confirmada.",
      ],
    },

    intelligenceSummary: {
      operationalStatus: riskLevel === "high" ? "buffer_required" : "monitoring",
      recommendationImpact:
        riskLevel === "high"
          ? "strong_route_buffer_recommended"
          : riskLevel === "medium"
          ? "dynamic_route_buffer_recommended"
          : "standard_route_monitoring",
      summary: buildSummary({
        origin,
        airport,
        transportMode,
        baseRouteMinutes,
        bufferMinutes,
        totalRouteMinutes,
        riskLevel,
      }),
    },

    intelligenceFlags: buildFlags({
      trafficRisk,
      disruptionRisk,
      transportMode,
      bufferMinutes,
      airportProfile,
    }),

    sourceBreakdown: {
      routeData: "internal-route-profile",
      trafficData: "future-maps-api",
      publicTransportData: "future-transit-api",
      disruptionData: "future-alerts-engine",
      airportAccessProfile: airportProfile.source,
      communityReports: "future-community-layer",
    },

    officialSources: {
      liveTraffic: false,
      publicTransport: false,
      rideHailing: false,
      disruptions: false,
      communityReports: false,
    },

    diagnostics: {
      requestedOrigin: origin,
      requestedAirport: airport,
      matchedAirportProfile: Boolean(airportProfile),
      fallbackUsed: !getAirportProfiles()[airport],
    },
  };
}

function getAirportProfiles() {
  return {
    LIS: {
      name: "Lisboa Humberto Delgado",
      city: "Lisbon",
      country: "Portugal",
      riskLevel: "medium",
      accessRisk: "medium",
      source: "Home2Flight Internal Airport Access Profile — LIS",
    },
    OPO: {
      name: "Porto Francisco Sá Carneiro",
      city: "Porto",
      country: "Portugal",
      riskLevel: "low",
      accessRisk: "low",
      source: "Home2Flight Internal Airport Access Profile — OPO",
    },
    MAD: {
      name: "Madrid-Barajas",
      city: "Madrid",
      country: "Spain",
      riskLevel: "medium",
      accessRisk: "medium",
      source: "Home2Flight Internal Airport Access Profile — MAD",
    },
    BCN: {
      name: "Barcelona El Prat",
      city: "Barcelona",
      country: "Spain",
      riskLevel: "medium",
      accessRisk: "medium",
      source: "Home2Flight Internal Airport Access Profile — BCN",
    },
    CDG: {
      name: "Paris Charles de Gaulle",
      city: "Paris",
      country: "France",
      riskLevel: "high",
      accessRisk: "high",
      source: "Home2Flight Internal Airport Access Profile — CDG",
    },
    AMS: {
      name: "Amsterdam Schiphol",
      city: "Amsterdam",
      country: "Netherlands",
      riskLevel: "medium",
      accessRisk: "medium",
      source: "Home2Flight Internal Airport Access Profile — AMS",
    },
    LHR: {
      name: "London Heathrow",
      city: "London",
      country: "United Kingdom",
      riskLevel: "high",
      accessRisk: "high",
      source: "Home2Flight Internal Airport Access Profile — LHR",
    },
    DXB: {
      name: "Dubai International",
      city: "Dubai",
      country: "United Arab Emirates",
      riskLevel: "medium",
      accessRisk: "medium",
      source: "Home2Flight Internal Airport Access Profile — DXB",
    },
  };
}

function estimateBaseRouteMinutes({ origin, airport, transportMode }) {
  const normalizedOrigin = origin.toLowerCase();

  if (airport === "LIS") {
    if (normalizedOrigin.includes("lisboa")) {
      if (transportMode === "public_transport") return 38;
      if (transportMode === "walking") return 95;
      return 28;
    }

    if (normalizedOrigin.includes("almada")) {
      if (transportMode === "public_transport") return 62;
      return 42;
    }

    if (normalizedOrigin.includes("cascais")) {
      if (transportMode === "public_transport") return 78;
      return 48;
    }

    if (normalizedOrigin.includes("sintra")) {
      if (transportMode === "public_transport") return 82;
      return 52;
    }

    if (normalizedOrigin.includes("odivelas")) {
      if (transportMode === "public_transport") return 42;
      return 26;
    }

    return transportMode === "public_transport" ? 55 : 35;
  }

  if (airport === "OPO") {
    if (transportMode === "public_transport") return 42;
    return 30;
  }

  if (airport === "CDG") {
    if (transportMode === "public_transport") return 65;
    return 48;
  }

  if (airport === "LHR") {
    if (transportMode === "public_transport") return 72;
    return 60;
  }

  if (airport === "AMS") {
    if (transportMode === "public_transport") return 38;
    return 32;
  }

  return transportMode === "public_transport" ? 55 : 40;
}

function estimateTrafficRisk({ airport, transportMode }) {
  if (transportMode === "walking") return "low";

  if (transportMode === "public_transport") {
    if (airport === "LIS" || airport === "LHR" || airport === "CDG") {
      return "medium";
    }

    return "low";
  }

  if (airport === "LIS" || airport === "CDG" || airport === "LHR") {
    return "medium";
  }

  return "low";
}

function estimateDisruptionRisk({ transportMode }) {
  if (transportMode === "public_transport") return "medium";
  if (transportMode === "ride_hailing") return "medium";
  if (transportMode === "walking") return "low";
  return "low";
}

function calculateRouteBuffer({
  baseRouteMinutes,
  trafficRisk,
  disruptionRisk,
  airportRiskLevel,
  transportMode,
}) {
  let buffer = 10;

  if (baseRouteMinutes >= 60) buffer += 10;
  if (baseRouteMinutes >= 90) buffer += 10;

  if (trafficRisk === "medium") buffer += 10;
  if (trafficRisk === "high") buffer += 20;

  if (disruptionRisk === "medium") buffer += 8;
  if (disruptionRisk === "high") buffer += 15;

  if (airportRiskLevel === "medium") buffer += 5;
  if (airportRiskLevel === "high") buffer += 12;

  if (transportMode === "public_transport") buffer += 7;
  if (transportMode === "ride_hailing") buffer += 5;

  return Math.min(buffer, 60);
}

function calculateRouteReliability({
  transportMode,
  trafficRisk,
  disruptionRisk,
  airportProfile,
}) {
  let score = 78;

  if (trafficRisk === "medium") score -= 8;
  if (trafficRisk === "high") score -= 18;

  if (disruptionRisk === "medium") score -= 7;
  if (disruptionRisk === "high") score -= 16;

  if (airportProfile.riskLevel === "medium") score -= 5;
  if (airportProfile.riskLevel === "high") score -= 12;

  if (transportMode === "public_transport") score -= 5;
  if (transportMode === "ride_hailing") score -= 4;

  return Math.max(25, Math.min(92, score));
}

function calculateRouteRiskLevel({
  trafficRisk,
  disruptionRisk,
  bufferMinutes,
  airportRiskLevel,
}) {
  if (
    trafficRisk === "high" ||
    disruptionRisk === "high" ||
    airportRiskLevel === "high" ||
    bufferMinutes >= 45
  ) {
    return "high";
  }

  if (
    trafficRisk === "medium" ||
    disruptionRisk === "medium" ||
    airportRiskLevel === "medium" ||
    bufferMinutes >= 25
  ) {
    return "medium";
  }

  return "low";
}

function getTrustLevel(score) {
  if (score >= 78) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function buildFlags({
  trafficRisk,
  disruptionRisk,
  transportMode,
  bufferMinutes,
  airportProfile,
}) {
  const flags = [];

  if (trafficRisk === "medium" || trafficRisk === "high") {
    flags.push({
      type: "traffic",
      label: "Margem de trânsito aplicada",
      severity: trafficRisk,
    });
  }

  if (transportMode === "public_transport") {
    flags.push({
      type: "public_transport",
      label: "Dependência de transporte público",
      severity: disruptionRisk,
    });
  }

  if (transportMode === "ride_hailing") {
    flags.push({
      type: "ride_hailing",
      label: "Disponibilidade sujeita a procura",
      severity: "medium",
    });
  }

  if (airportProfile.accessRisk === "medium" || airportProfile.accessRisk === "high") {
    flags.push({
      type: "airport_access",
      label: "Acesso ao aeroporto com variabilidade",
      severity: airportProfile.accessRisk,
    });
  }

  if (bufferMinutes >= 30) {
    flags.push({
      type: "route_buffer",
      label: `Buffer de rota +${bufferMinutes} min`,
      severity: bufferMinutes >= 45 ? "high" : "medium",
    });
  }

  if (flags.length === 0) {
    flags.push({
      type: "standard_route",
      label: "Rota sem risco relevante detetado",
      severity: "low",
    });
  }

  return flags;
}

function buildSummary({
  origin,
  airport,
  transportMode,
  baseRouteMinutes,
  bufferMinutes,
  totalRouteMinutes,
  riskLevel,
}) {
  const modeLabel = getTransportModeLabel(transportMode);

  if (riskLevel === "high") {
    return `Trajeto ${origin} → ${airport} por ${modeLabel} exige margem reforçada. Estimativa base de ${baseRouteMinutes} min, com buffer dinâmico de ${bufferMinutes} min. Recomendação total: ${totalRouteMinutes} min.`;
  }

  if (riskLevel === "medium") {
    return `Trajeto ${origin} → ${airport} por ${modeLabel} tem variabilidade moderada. A timeline deve aplicar buffer dinâmico de ${bufferMinutes} min. Recomendação total: ${totalRouteMinutes} min.`;
  }

  return `Trajeto ${origin} → ${airport} por ${modeLabel} sem risco relevante detetado. Recomendação total: ${totalRouteMinutes} min, incluindo margem operacional conservadora.`;
}

function getTransportModeLabel(mode) {
  switch (mode) {
    case "public_transport":
      return "transporte público";
    case "ride_hailing":
      return "TVDE";
    case "walking":
      return "a pé";
    case "car":
      return "carro";
    default:
      return mode;
  }
}
