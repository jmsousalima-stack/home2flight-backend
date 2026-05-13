// /api/home2flight.js

import { getAirportOperationalIntelligence } from "./engines/airport-intelligence-engine";

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return String(value).toLowerCase() === "true";
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

function subtractMinutes(date, minutes) {
  return new Date(date.getTime() - minutes * 60000);
}

function getRiskFromScore(score) {
  if (score >= 80) return "high";
  if (score >= 55) return "medium";
  return "low";
}

function getUiStatus(reliabilityScore) {
  if (reliabilityScore >= 70) return "good";
  if (reliabilityScore < 45) return "critical";
  return "warning";
}

function getConfidenceLabel(level) {
  if (level === "high") return "Confiança elevada";
  if (level === "medium") return "Confiança moderada";
  return "Confiança reduzida";
}

function getReliabilityLabel(score) {
  if (score >= 70) return "Fiável";
  if (score >= 45) return "Sensível";
  return "Frágil";
}

function getHeadline(uiStatus) {
  if (uiStatus === "good") {
    return {
      headline: "Plano estável e dentro da margem recomendada",
      shortMessage: "O plano apresenta boa margem operacional.",
    };
  }

  if (uiStatus === "critical") {
    return {
      headline: "Plano operacionalmente frágil",
      shortMessage: "Existem vários fatores de risco ativos neste trajeto.",
    };
  }

  return {
    headline: "Plano com margem operacional sensível",
    shortMessage: "Recomendada atenção adicional ao trajeto e aeroporto.",
  };
}

export default async function handler(req, res) {
  try {
    const {
      flight = "AF1195",
      airport = "LIS",
      airline = "AF",
      terminal = "1",
      bags = "true",
      kids = "true",
      checkedIn = "false",
      flightType = "passport",
      transport = "public",
    } = req.query;

    const hasBags = toBoolean(bags, true);
    const hasKids = toBoolean(kids, true);
    const isCheckedIn = toBoolean(checkedIn, false);

    // =========================
    // TEMP FLIGHT DATA
    // =========================

    const flightData = {
      number: flight,
      airline: "Air France",
      airlineCode: airline,
      route: {
        from: {
          code: airport,
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
      status: "monitoring",
    };

    const departureDate = new Date(flightData.departure);

    // =========================
    // USER CONTEXT
    // =========================

    const userContext = {
      bags: hasBags,
      kids: hasKids,
      checkedIn: isCheckedIn,
      flightType,
      transport,
    };

    // =========================
    // AIRPORT INTELLIGENCE ENGINE v2
    // =========================

    const airportIntel = await getAirportOperationalIntelligence({
      airport,
      airline,
      terminal,
      departureTime: departureDate.toISOString(),
      passengerProfile: {
        travellingWithKids: hasKids,
        checkedInOnline: isCheckedIn,
      },
      baggageProfile: {
        checkedBags: hasBags ? 1 : 0,
      },
    });

    const airportOperational =
      airportIntel.operationalIntelligence;

    const airportArrivalMinutesBeforeDeparture =
      airportOperational.recommendedAirportBuffer +
      (flightType === "passport" ? 12 : 0) +
      (hasKids ? 10 : 0) +
      (!isCheckedIn ? 8 : 0);

    // =========================
    // TRANSPORT
    // =========================

    const baseTravelMinutes = transport === "public" ? 40 : 25;
    const transportBuffer = transport === "public" ? 25 : 12;

    const leaveHomeMinutesBeforeDeparture =
      airportArrivalMinutesBeforeDeparture +
      baseTravelMinutes +
      transportBuffer;

    const leaveHomeTime = subtractMinutes(
      departureDate,
      leaveHomeMinutesBeforeDeparture
    );

    const airportArrivalTime = subtractMinutes(
      departureDate,
      airportArrivalMinutesBeforeDeparture
    );

    // =========================
    // RELIABILITY
    // =========================

    let reliabilityScore = 100;
    const reliabilityAdjustments = [];

    reliabilityScore -= Math.round(
      airportOperational.airportRiskScore * 0.35
    );

    reliabilityAdjustments.push({
      factor: "airport_intelligence",
      impact: -Math.round(airportOperational.airportRiskScore * 0.35),
      reason: `Aeroporto avaliado com risco ${airportOperational.airportRisk}.`,
    });

    if (!airportOperational.liveDataActive) {
      reliabilityScore -= 10;
      reliabilityAdjustments.push({
        factor: "live_data",
        impact: -10,
        reason: "Ainda sem dados aeroportuários live oficiais.",
      });
    }

    if (hasKids) {
      reliabilityScore -= 4;
      reliabilityAdjustments.push({
        factor: "kids",
        impact: -4,
        reason: "Viagem com crianças aumenta variabilidade.",
      });
    }

    if (transport === "public") {
      reliabilityScore -= 6;
      reliabilityAdjustments.push({
        factor: "transport",
        impact: -6,
        reason: "Dependência de transportes públicos.",
      });
    }

    if (!isCheckedIn) {
      reliabilityScore -= 5;
      reliabilityAdjustments.push({
        factor: "check_in",
        impact: -5,
        reason: "Check-in online ainda não confirmado.",
      });
    }

    reliabilityScore = Math.max(0, Math.min(100, reliabilityScore));

    // =========================
    // CONFIDENCE
    // =========================

    const confidenceScore = airportOperational.confidenceScore;

    const confidenceLevel = airportOperational.confidenceLevel;

    const confidenceStrengths = [
      "Motor aeroportuário estruturado por camadas.",
      "Decisão considera terminal, companhia, segurança, bagagem e perfil do passageiro.",
    ];

    const confidenceWeaknesses = airportIntel.limitations;

    // =========================
    // READINESS
    // =========================

    const readinessScore = Math.max(
      0,
      Math.min(100, reliabilityScore + 10)
    );

    let readinessLabel = "Estável";

    if (readinessScore < 45) {
      readinessLabel = "Crítica";
    } else if (readinessScore < 70) {
      readinessLabel = "Sensível";
    }

    // =========================
    // RECOMMENDATIONS
    // =========================

    const recommendations = [];

    if (!isCheckedIn) {
      recommendations.push({
        type: "check_in",
        priority: "high",
        title: "Faz o check-in online antes de sair",
      });
    }

    if (transport === "public") {
      recommendations.push({
        type: "transport",
        priority: "high",
        title: "Confirma horários dos transportes antes de sair",
      });
    }

    if (airportOperational.airportRisk !== "low") {
      recommendations.push({
        type: "airport_margin",
        priority: "critical",
        title: "Mantém margem adicional neste aeroporto",
      });
    }

    // =========================
    // TIMELINE
    // =========================

    const timeline = [
      {
        step: "prepare_documents",
        title: "Preparar documentos e essenciais",
        recommendedTime: subtractMinutes(leaveHomeTime, 90),
        category: "preparation",
        confidenceScore: 88,
        source: "User checklist",
      },
      {
        step: "online_checkin",
        title: "Confirmar check-in online",
        recommendedTime: subtractMinutes(leaveHomeTime, 60),
        category: "flight",
        confidenceScore: 82,
        source: "Flight preparation model",
      },
      {
        step: "leave_home",
        title: "Sair de casa",
        recommendedTime: leaveHomeTime,
        category: "transport",
        confidenceScore: transport === "public" ? 70 : 82,
        source: "Transport profile",
      },
      {
        step: "arrive_airport",
        title: "Chegar ao aeroporto",
        recommendedTime: airportArrivalTime,
        category: "airport",
        confidenceScore: airportOperational.confidenceScore,
        source: airportOperational.sourceType,
        operationalInsight: airportIntel.reasoning,
        intelligenceFlags: airportIntel.intelligenceFlags,
      },
      {
        step: "departure",
        title: "Partida do voo",
        recommendedTime: departureDate,
        category: "flight",
        confidenceScore: 80,
        source: "Flight schedule",
      },
    ];

    // =========================
    // UI SUMMARY
    // =========================

    const uiStatus = getUiStatus(reliabilityScore);
    const { headline, shortMessage } = getHeadline(uiStatus);

    const mainRiskFactors = reliabilityAdjustments
      .filter((item) => item.impact <= -8)
      .map((item) => item.reason);

    const keyActions = recommendations.map((item) => item.title);

    // =========================
    // FINAL RESPONSE
    // =========================

    return res.status(200).json({
      success: true,

      uiSummary: {
        status: uiStatus,
        headline,
        shortMessage,
        confidenceLabel: getConfidenceLabel(confidenceLevel),
        reliabilityLabel: getReliabilityLabel(reliabilityScore),
        readinessLabel,
        mainRiskFactors,
        keyActions,
      },

      decision: {
        headline,
        leaveHomeTime,
        airportArrivalTime,
        departureTime: departureDate,
      },

      flight: flightData,

      userContext,

      airportIntelligence: airportIntel,

      timingBreakdown: {
        airportRecommendedBuffer:
          airportOperational.recommendedAirportBuffer,
        airportArrivalMinutesBeforeDeparture,
        baseTravelMinutes,
        transportBuffer,
        leaveHomeMinutesBeforeDeparture,
      },

      reliability: {
        score: reliabilityScore,
        confidence: getConfidenceLabel(confidenceLevel),
        riskLevel: getRiskFromScore(100 - reliabilityScore + 15),
        explanation: {
          summary:
            "Pontuação calculada com base no novo Airport Intelligence Engine, transporte e contexto do utilizador.",
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

      alerts: airportIntel.intelligenceFlags,

      communityReports: [],

      timeline,

      metadata: {
        engine: "Home2Flight Unified Decision Engine",
        version: "0.5.0-airport-intelligence-v2",
        airportEngine: "Airport Intelligence Engine v2",
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Home2Flight API error:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
}