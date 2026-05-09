import { calculateReliability } from "./reliability-engine.js";

function getOperationalSignals(airportCode) {
  const signalsByAirport = {
    LIS: [],
    AMS: [
      {
        type: "congestion",
        severity: "medium",
        title: "Possível congestionamento operacional",
        impactMinutes: 10,
        source: "Home2Flight Operational Profile",
        verified: false,
      },
    ],
    CDG: [
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
    DXB: [
      {
        type: "large_airport",
        severity: "medium",
        title: "Aeroporto de grande dimensão com deslocações internas longas",
        impactMinutes: 15,
        source: "Home2Flight Operational Profile",
        verified: true,
      },
    ],
  };

  return signalsByAirport[airportCode] || [];
}

function getCommunityReports(airportCode) {
  const reportsByAirport = {
    LIS: [
      {
        type: "security_queue",
        severity: "low",
        title: "Fila de segurança dentro do normal",
        reportedMinutesAgo: 18,
        confidence: "medium",
        impactMinutes: 0,
        source: "community_report",
        verified: false,
      },
    ],
    AMS: [
      {
        type: "security_queue",
        severity: "medium",
        title: "Fila de segurança acima do normal",
        reportedMinutesAgo: 22,
        confidence: "medium",
        impactMinutes: 10,
        source: "community_report",
        verified: false,
      },
    ],
    CDG: [
      {
        type: "terminal_movement",
        severity: "medium",
        title: "Deslocações internas demoradas reportadas",
        reportedMinutesAgo: 35,
        confidence: "medium",
        impactMinutes: 12,
        source: "community_report",
        verified: false,
      },
      {
        type: "security_queue",
        severity: "high",
        title: "Fila de segurança longa reportada",
        reportedMinutesAgo: 14,
        confidence: "medium",
        impactMinutes: 18,
        source: "community_report",
        verified: false,
      },
    ],
    DXB: [
      {
        type: "gate_walk",
        severity: "medium",
        title: "Portas distantes reportadas por utilizadores",
        reportedMinutesAgo: 41,
        confidence: "medium",
        impactMinutes: 12,
        source: "community_report",
        verified: false,
      },
    ],
  };

  return reportsByAirport[airportCode] || [];
}

export default function handler(req, res) {
  const {
    flight = "TP1365",
    bags = "false",
    kids = "false",
    flightType = "schengen",
    transport = "car",
  } = req.query;

  const flights = {
    TP1365: {
      airline: "TAP Air Portugal",
      from: {
        code: "LIS",
        name: "Lisboa Humberto Delgado",
        country: "Portugal",
      },
      to: {
        code: "AMS",
        name: "Amsterdam Schiphol",
        country: "Netherlands",
      },
      departure: "2026-05-08T14:20:00",
      status: "scheduled",
    },

    AF1195: {
      airline: "Air France",
      from: {
        code: "LIS",
        name: "Lisboa Humberto Delgado",
        country: "Portugal",
      },
      to: {
        code: "CDG",
        name: "Paris Charles de Gaulle",
        country: "France",
      },
      departure: "2026-05-08T16:40:00",
      status: "delayed",
    },

    EK192: {
      airline: "Emirates",
      from: {
        code: "LIS",
        name: "Lisboa Humberto Delgado",
        country: "Portugal",
      },
      to: {
        code: "DXB",
        name: "Dubai International",
        country: "United Arab Emirates",
      },
      departure: "2026-05-08T21:15:00",
      status: "scheduled",
    },
  };

  const flightNumber = flight.toUpperCase();
  const flightData = flights[flightNumber] || flights.TP1365;

  const departureAirportCode = flightData.from.code;
  const destinationAirportCode = flightData.to.code;

  const hasBags = bags === "true";
  const withKids = kids === "true";

  const operationalSignals = getOperationalSignals(destinationAirportCode);
  const communityReports = getCommunityReports(destinationAirportCode);

  let airportRisk = "normal";

  if (destinationAirportCode === "CDG") {
    airportRisk = "high";
  }

  if (destinationAirportCode === "AMS" || destinationAirportCode === "DXB") {
    airportRisk = "medium";
  }

  let securityMinutes = 18;
  let bagDropMinutes = 12;
  let passportMinutes = 10;
  let gateWalkMinutes = 14;

  if (destinationAirportCode === "AMS") {
    securityMinutes = 22;
    bagDropMinutes = 14;
    passportMinutes = 12;
    gateWalkMinutes = 18;
  }

  if (destinationAirportCode === "CDG") {
    securityMinutes = 32;
    bagDropMinutes = 18;
    passportMinutes = 20;
    gateWalkMinutes = 28;
  }

  if (destinationAirportCode === "DXB") {
    securityMinutes = 26;
    bagDropMinutes = 18;
    passportMinutes = 18;
    gateWalkMinutes = 26;
  }

  const adjustments = [];

  if (hasBags) {
    bagDropMinutes += 8;

    adjustments.push({
      type: "bags",
      area: "airport",
      impactMinutes: 8,
      reason: "Mala de porão aumenta margem de check-in/bag drop.",
    });
  }

  if (withKids) {
    securityMinutes += 4;
    gateWalkMinutes += 7;

    adjustments.push({
      type: "kids",
      area: "airport",
      impactMinutes: 11,
      reason: "Crianças aumentam margem de deslocação e controlo.",
    });
  }

  if (flightType === "passport") {
    passportMinutes += 10;

    adjustments.push({
      type: "passport",
      area: "airport",
      impactMinutes: 10,
      reason: "Voo com controlo de passaporte/fronteira.",
    });
  }

  let transportMinutes = 0;

  if (transport === "public") {
    transportMinutes = 25;

    adjustments.push({
      type: "transport",
      area: "transport",
      impactMinutes: 25,
      reason: "Margem dinâmica associada a transporte público.",
    });
  }

  if (transport === "uber") {
    transportMinutes = 18;

    adjustments.push({
      type: "transport",
      area: "transport",
      impactMinutes: 18,
      reason: "Margem dinâmica associada a Uber/táxi.",
    });
  }

  if (transport === "car") {
    transportMinutes = 15;

    adjustments.push({
      type: "transport",
      area: "transport",
      impactMinutes: 15,
      reason: "Margem dinâmica associada a carro.",
    });
  }

  if (flightData.status === "delayed") {
    adjustments.push({
      type: "flight_status",
      area: "flight",
      impactMinutes: -15,
      reason: "Voo atrasado reduz ligeiramente antecedência recomendada.",
    });
  }

  const operationalImpactMinutes = operationalSignals.reduce(
    (sum, signal) => sum + (signal.impactMinutes || 0),
    0
  );

  const communityImpactMinutes = communityReports.reduce(
    (sum, report) => sum + (report.impactMinutes || 0),
    0
  );

  const alertSignals = operationalSignals.map((signal) => ({
    type: signal.type,
    severity: signal.severity,
    title: signal.title,
    impactMinutes: signal.impactMinutes,
    source: signal.source,
    verified: signal.verified,
  }));

  const airportProcessMinutes =
    securityMinutes +
    bagDropMinutes +
    passportMinutes +
    gateWalkMinutes;

  const baseTravelMinutes = 40;
  const safetyBufferMinutes = 25;

  const totalMinutes =
    airportProcessMinutes +
    baseTravelMinutes +
    safetyBufferMinutes +
    transportMinutes +
    operationalImpactMinutes +
    communityImpactMinutes;

  const reliability = calculateReliability({
    airportRisk,
    flightStatus: flightData.status,
    hasLiveData: false,
    alerts: alertSignals,
    operationalSignals,
    userContext: {
      kids: withKids,
      transport,
    },
  });

  return res.status(200).json({
    flight: {
      number: flightNumber,
      airline: flightData.airline,
      status: flightData.status,

      route: {
        from: flightData.from,
        to: flightData.to,
      },

      userContext: {
        bags: hasBags,
        kids: withKids,
        flightType,
        transport,
      },

      departure: {
        scheduled: flightData.departure,
      },
    },

    airportContext: {
      departureAirportCode,
      destinationAirportCode,
      airportRisk,
    },

    timingBreakdown: {
      airportProcess: {
        totalMinutes: airportProcessMinutes,
        securityMinutes,
        bagDropMinutes,
        passportMinutes,
        gateWalkMinutes,
      },

      transport: {
        mode: transport,
        baseTravelMinutes,
        bufferMinutes: transportMinutes,
      },

      operationalImpact: {
        totalMinutes: operationalImpactMinutes,
        signals: operationalSignals,
      },

      communityImpact: {
        totalMinutes: communityImpactMinutes,
        reports: communityReports,
      },

      safetyBuffer: {
        minutes: safetyBufferMinutes,
      },

      totalMinutes,
    },

    recommendation: {
      airportArrivalRecommendedMinutesBeforeDeparture:
        airportProcessMinutes +
        safetyBufferMinutes +
        operationalImpactMinutes +
        communityImpactMinutes,

      leaveHomeRecommendedMinutesBeforeDeparture: totalMinutes,

      recommendationReason:
        "Estimativa calculada por voo, contexto do utilizador, perfil aeroportuário, sinais operacionais e reports comunitários.",
    },

    reliability,

    alerts: alertSignals,

    communityReports,

    adjustments,

    limitations: [
      "Live security queue integration pending.",
      "Airline-specific bag drop intelligence pending.",
      "Real-time disruption monitoring expanding.",
      "Community operational signals still in beta.",
    ],

    metadata: {
      engine: "Home2Flight Timeline Engine",
      version: "0.6.1",
    },
  });
}
