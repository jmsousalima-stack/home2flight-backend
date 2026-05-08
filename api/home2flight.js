import { calculateReliability } from "./reliability-engine.js";

function toBoolean(value) {
  return value === true || value === "true";
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function subtractMinutes(date, minutes) {
  return new Date(date.getTime() - minutes * 60000);
}

export default function handler(req, res) {
  const {
    flight = "AF1195",
    bags = "false",
    kids = "false",
    checkedIn = "false",
    flightType = "passport",
    transport = "public",
  } = req.query;

  const flightNumber = flight.toUpperCase();

  const flights = {
    TP1365: {
      airline: "TAP Air Portugal",
      from: { code: "LIS", name: "Lisboa Humberto Delgado", country: "Portugal" },
      to: { code: "AMS", name: "Amsterdam Schiphol", country: "Netherlands" },
      departure: "2026-05-08T14:20:00",
      status: "scheduled",
    },

    AF1195: {
      airline: "Air France",
      from: { code: "LIS", name: "Lisboa Humberto Delgado", country: "Portugal" },
      to: { code: "CDG", name: "Paris Charles de Gaulle", country: "France" },
      departure: "2026-05-08T16:40:00",
      status: "delayed",
    },

    EK192: {
      airline: "Emirates",
      from: { code: "LIS", name: "Lisboa Humberto Delgado", country: "Portugal" },
      to: { code: "DXB", name: "Dubai International", country: "United Arab Emirates" },
      departure: "2026-05-08T21:15:00",
      status: "scheduled",
    },
  };

  const profiles = {
    LIS: { security: 18, bagDrop: 12, passport: 10, gateWalk: 14, risk: "normal" },
    AMS: { security: 22, bagDrop: 14, passport: 12, gateWalk: 18, risk: "medium" },
    CDG: { security: 32, bagDrop: 18, passport: 20, gateWalk: 28, risk: "high" },
    DXB: { security: 26, bagDrop: 18, passport: 18, gateWalk: 26, risk: "medium" },
  };

  const operationalSignalsByAirport = {
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

  const communityReportsByAirport = {
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
  };

  const flightData = flights[flightNumber] || flights.AF1195;
  const departureDate = new Date(flightData.departure);

  const hasBags = toBoolean(bags);
  const hasKids = toBoolean(kids);
  const isCheckedIn = toBoolean(checkedIn);

  const destinationCode = flightData.to.code;
  const profile = profiles[destinationCode] || profiles.LIS;

  const operationalSignals = operationalSignalsByAirport[destinationCode] || [];
  const communityReports = communityReportsByAirport[destinationCode] || [];

  let securityMinutes = profile.security;
  let bagDropMinutes = hasBags ? profile.bagDrop + 8 : 0;
  let passportMinutes = flightType === "passport" ? profile.passport + 10 : 0;
  let gateWalkMinutes = profile.gateWalk;

  if (hasKids) {
    securityMinutes += 4;
    gateWalkMinutes += 7;
  }

  const operationalImpactMinutes = operationalSignals.reduce(
    (sum, signal) => sum + (signal.impactMinutes || 0),
    0
  );

  const communityImpactMinutes = communityReports.reduce(
    (sum, report) => sum + (report.impactMinutes || 0),
    0
  );

  const transportBuffer =
    transport === "public" ? 25 : transport === "uber" ? 18 : 15;

  const baseTravelMinutes =
    transport === "public" ? 40 : transport === "uber" ? 28 : 30;

  const safetyBufferMinutes = 25;

  const airportProcessMinutes =
    securityMinutes + bagDropMinutes + passportMinutes + gateWalkMinutes;

  const airportArrivalMinutesBeforeDeparture =
    airportProcessMinutes +
    operationalImpactMinutes +
    communityImpactMinutes +
    safetyBufferMinutes;

  const leaveHomeMinutesBeforeDeparture =
    airportArrivalMinutesBeforeDeparture + baseTravelMinutes + transportBuffer;

  const leaveHomeTime = subtractMinutes(
    departureDate,
    leaveHomeMinutesBeforeDeparture
  );

  const airportArrivalTime = subtractMinutes(
    departureDate,
    airportArrivalMinutesBeforeDeparture
  );

  const reliability = calculateReliability({
    airportRisk: profile.risk,
    flightStatus: flightData.status,
    hasLiveData: false,
    alerts: operationalSignals,
    operationalSignals,
    userContext: {
      kids: hasKids,
      transport,
    },
  });

  let readinessScore = 85;

  if (!isCheckedIn) readinessScore -= 15;
  if (hasBags) readinessScore -= 8;
  if (hasKids) readinessScore -= 5;
  if (reliability.riskLevel === "high") readinessScore -= 18;

  if (readinessScore < 10) readinessScore = 10;

  const timeline = [
    {
      step: "prepare_documents",
      title: "Preparar documentos e essenciais",
      recommendedTime: subtractMinutes(leaveHomeTime, 90).toISOString(),
      category: "preparation",
    },
    {
      step: "online_checkin",
      title: "Confirmar check-in online",
      recommendedTime: subtractMinutes(leaveHomeTime, 60).toISOString(),
      category: "flight",
    },
    {
      step: "leave_home",
      title: "Sair de casa",
      recommendedTime: leaveHomeTime.toISOString(),
      category: "transport",
    },
    {
      step: "arrive_airport",
      title: "Chegar ao aeroporto",
      recommendedTime: airportArrivalTime.toISOString(),
      category: "airport",
    },
    {
      step: "departure",
      title: "Partida do voo",
      recommendedTime: departureDate.toISOString(),
      category: "flight",
    },
  ];

  return res.status(200).json({
    decision: {
      headline:
        reliability.riskLevel === "high"
          ? "Plano com margem operacional sensível"
          : "Plano dentro da margem operacional",
      leaveHomeTime: leaveHomeTime.toISOString(),
      airportArrivalTime: airportArrivalTime.toISOString(),
      departureTime: departureDate.toISOString(),
    },

    flight: {
      number: flightNumber,
      airline: flightData.airline,
      status: flightData.status,
      route: flightData,
    },

    userContext: {
      bags: hasBags,
      kids: hasKids,
      checkedIn: isCheckedIn,
      flightType,
      transport,
    },

    timingBreakdown: {
      airportProcessMinutes,
      operationalImpactMinutes,
      communityImpactMinutes,
      baseTravelMinutes,
      transportBuffer,
      safetyBufferMinutes,
      airportArrivalMinutesBeforeDeparture,
      leaveHomeMinutesBeforeDeparture,
    },

    reliability,

    readiness: {
      score: readinessScore,
      label:
        readinessScore < 50
          ? "Crítica"
          : readinessScore < 70
          ? "Atenção"
          : "Boa",
    },

    alerts: operationalSignals,
    communityReports,
    timeline,

    metadata: {
      engine: "Home2Flight Unified Decision Engine",
      version: "0.1.0",
    },
  });
}
