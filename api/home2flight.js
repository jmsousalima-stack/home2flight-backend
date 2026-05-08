export default async function handler(req, res) {
  const {
    flight = "AF1195",
    bags = "true",
    kids = "true",
    checkedIn = "false",
    flightType = "passport",
    transport = "public",
  } = req.query;

  // =========================
  // MOCK FLIGHT DATA
  // =========================

  const flightData = {
    number: flight,
    airline: "Air France",
    route: {
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
    },

    departure: "2026-05-08T16:40:00",

    status: "delayed",
  };

  // =========================
  // USER CONTEXT
  // =========================

  const userContext = {
    bags: bags === "true",
    kids: kids === "true",
    checkedIn: checkedIn === "true",
    flightType,
    transport,
  };

  // =========================
  // AIRPORT PROFILE
  // =========================

  const airportRisk = "high";

  const airportProcessMinutes = {
    security: 36,
    bagDrop: 26,
    passport: 30,
    gateWalk: 35,
  };

  const airportTotal =
    airportProcessMinutes.security +
    airportProcessMinutes.bagDrop +
    airportProcessMinutes.passport +
    airportProcessMinutes.gateWalk;

  // =========================
  // OPERATIONAL SIGNALS
  // =========================

  const operationalSignals = [
    {
      type: "airport_complexity",
      severity: "high",
      title:
        "Aeroporto complexo com maior variabilidade operacional",
      impactMinutes: 20,
      source: "Home2Flight Operational Profile",
      verified: true,
    },

    {
      type: "connection_pressure",
      severity: "medium",
      title:
        "Maior risco de filas e deslocações internas longas",
      impactMinutes: 12,
      source: "Home2Flight Airport Profile",
      verified: true,
    },
  ];

  const operationalImpactMinutes = operationalSignals.reduce(
    (acc, item) => acc + item.impactMinutes,
    0
  );

  // =========================
  // COMMUNITY SIGNALS
  // =========================

  const communityReports = [
    {
      type: "terminal_movement",
      severity: "medium",
      title:
        "Deslocações internas demoradas reportadas",
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
  ];

  const communityImpactMinutes = communityReports.reduce(
    (acc, item) => acc + item.impactMinutes,
    0
  );

  // =========================
  // TRANSPORT
  // =========================

  const baseTravelMinutes = 40;

  let transportBuffer = 10;

  if (transport === "public") {
    transportBuffer = 25;
  }

  // =========================
  // SAFETY BUFFER
  // =========================

  const safetyBufferMinutes = 25;

  // =========================
  // TOTALS
  // =========================

  const airportArrivalMinutesBeforeDeparture =
    airportTotal +
    operationalImpactMinutes +
    communityImpactMinutes +
    safetyBufferMinutes;

  const leaveHomeMinutesBeforeDeparture =
    airportArrivalMinutesBeforeDeparture +
    baseTravelMinutes +
    transportBuffer;

  // =========================
  // RELIABILITY ENGINE
  // =========================

  let reliabilityScore = 100;

  const reliabilityAdjustments = [];

  reliabilityScore -= 15;

  reliabilityAdjustments.push({
    factor: "airport_risk",
    impact: -15,
    reason:
      "Aeroporto com maior complexidade operacional",
  });

  reliabilityScore -= 5;

  reliabilityAdjustments.push({
    factor: "flight_status",
    impact: -5,
    reason: "Voo com atraso operacional",
  });

  reliabilityScore -= 10;

  reliabilityAdjustments.push({
    factor: "live_data",
    impact: -10,
    reason:
      "Ainda sem integrações oficiais live",
  });

  reliabilityScore -= 10;

  reliabilityAdjustments.push({
    factor: "alerts",
    impact: -10,
    reason:
      "Alertas operacionais relevantes ativos",
  });

  reliabilityScore -= 12;

  reliabilityAdjustments.push({
    factor: "operational_intelligence",
    impact: -12,
    reason:
      "Sinais operacionais relevantes aumentam a incerteza",
  });

  if (userContext.kids) {
    reliabilityScore -= 3;

    reliabilityAdjustments.push({
      factor: "kids",
      impact: -3,
      reason:
        "Viagem com crianças aumenta variabilidade",
    });
  }

  if (userContext.transport === "public") {
    reliabilityScore -= 4;

    reliabilityAdjustments.push({
      factor: "transport",
      impact: -4,
      reason:
        "Dependência de transportes públicos",
    });
  }

  reliabilityScore = Math.max(
    0,
    Math.min(100, reliabilityScore)
  );

  // =========================
  // CONFIDENCE ENGINE
  // =========================

  let confidenceScore = 60;

  const confidenceStrengths = [];

  const confidenceWeaknesses = [];

  confidenceScore += 8;

  confidenceStrengths.push(
    "Reports comunitários ajudam a detetar fricções recentes."
  );

  confidenceScore += 10;

  confidenceStrengths.push(
    "Sinais operacionais ajudam a antecipar instabilidade."
  );

  confidenceWeaknesses.push(
    "Ainda sem integrações oficiais live."
  );

  confidenceScore -= 12;

  confidenceWeaknesses.push(
    "Aeroporto com elevada variabilidade operacional."
  );

  if (reliabilityScore < 40) {
    confidenceScore -= 10;

    confidenceWeaknesses.push(
      "Plano geral apresenta baixa robustez operacional."
    );
  }

  confidenceScore = Math.max(
    0,
    Math.min(100, confidenceScore)
  );

  let confidenceLevel = "medium";

  if (confidenceScore >= 80) {
    confidenceLevel = "high";
  } else if (confidenceScore < 55) {
    confidenceLevel = "low";
  }

  // =========================
  // READINESS ENGINE
  // =========================

  const readinessScore = reliabilityScore + 12;

  let readinessLabel = "Estável";

  if (readinessScore < 45) {
    readinessLabel = "Crítica";
  } else if (readinessScore < 70) {
    readinessLabel = "Sensível";
  }

  // =========================
  // SMART RECOMMENDATIONS
  // =========================

  const recommendations = [];

  recommendations.push({
    type: "check_in",
    priority: "high",
    title:
      "Faz o check-in online antes de sair",
  });

  recommendations.push({
    type: "transport",
    priority: "high",
    title:
      "Evita dependência excessiva de transportes públicos",
  });

  recommendations.push({
    type: "airport_margin",
    priority: "critical",
    title:
      "Mantém margem adicional neste aeroporto",
  });

  // =========================
  // TIMELINE
  // =========================

  const departureDate = new Date(
    flightData.departure
  );

  const leaveHomeTime = new Date(
    departureDate.getTime() -
      leaveHomeMinutesBeforeDeparture * 60000
  );

  const airportArrivalTime = new Date(
    departureDate.getTime() -
      airportArrivalMinutesBeforeDeparture * 60000
  );

  const timeline = [
    {
      step: "prepare_documents",
      title:
        "Preparar documentos e essenciais",
      recommendedTime: new Date(
        leaveHomeTime.getTime() - 90 * 60000
      ),
      category: "preparation",
    },

    {
      step: "online_checkin",
      title:
        "Confirmar check-in online",
      recommendedTime: new Date(
        leaveHomeTime.getTime() - 60 * 60000
      ),
      category: "flight",
    },

    {
      step: "leave_home",
      title: "Sair de casa",
      recommendedTime: leaveHomeTime,
      category: "transport",
    },

    {
      step: "arrive_airport",
      title: "Chegar ao aeroporto",
      recommendedTime: airportArrivalTime,
      category: "airport",
    },

    {
      step: "departure",
      title: "Partida do voo",
      recommendedTime: departureDate,
      category: "flight",
    },
  ];

  // =========================
  // FINAL RESPONSE
  // =========================

  res.status(200).json({
    decision: {
      headline:
        "Plano com margem operacional sensível",

      leaveHomeTime,

      airportArrivalTime,

      departureTime: departureDate,
    },

    flight: flightData,

    userContext,

    timingBreakdown: {
      airportProcessMinutes: airportTotal,

      operationalImpactMinutes,

      communityImpactMinutes,

      baseTravelMinutes,

      transportBuffer,

      safetyBufferMinutes,

      airportArrivalMinutesBeforeDeparture,

      leaveHomeMinutesBeforeDeparture,
    },

    reliability: {
      score: reliabilityScore,

      confidence: "Baixa",

      riskLevel: "high",

      explanation: {
        summary:
          "Pontuação calculada com base em aeroporto, voo, alertas, sinais operacionais e contexto do utilizador.",
      },

      adjustments: reliabilityAdjustments,
    },

    confidence: {
      level: confidenceLevel,

      score: confidenceScore,

      strengths: confidenceStrengths,

      weaknesses: confidenceWeaknesses,
    },

    readiness: {
      score: readinessScore,

      label: readinessLabel,
    },

    recommendations,

    alerts: operationalSignals,

    communityReports,

    timeline,

    metadata: {
      engine:
        "Home2Flight Unified Decision Engine",

      version: "0.3.0",
    },
  });
}
