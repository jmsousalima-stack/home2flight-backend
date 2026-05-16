// /api/home2flight.js

import { getAirportOperationalIntelligence } from "./engines/airport-intelligence-engine";
import { getFlightStatusIntelligence } from "./engines/flight-status-engine";

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return String(value).toLowerCase() === "true";
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

function getDepartureDateFromFlight(flightIntel, fallbackDate) {
  const estimated = flightIntel?.flight?.departure?.estimated;
  const scheduled = flightIntel?.flight?.departure?.scheduled;

  const selected = estimated || scheduled || fallbackDate;
  const date = new Date(selected);

  if (Number.isNaN(date.getTime())) {
    return new Date(fallbackDate);
  }

  return date;
}

function getFlightDataFromIntel(
  flightIntel,
  fallbackFlight,
  fallbackAirport,
  fallbackAirline
) {
  const liveFlight = flightIntel?.flight || {};

  return {
    number: liveFlight.number || fallbackFlight,
    airline: liveFlight.airline?.name || fallbackAirline,
    airlineCode: liveFlight.airline?.code || fallbackAirline,
    status: liveFlight.status || "monitoring",
    route: {
      from: {
        code: liveFlight.route?.from?.code || fallbackAirport,
        name: liveFlight.route?.from?.name || "Origem",
        country: null,
      },
      to: {
        code: liveFlight.route?.to?.code || null,
        name: liveFlight.route?.to?.name || "Destino",
        country: null,
      },
    },
    departure: {
      scheduled: liveFlight.departure?.scheduled || null,
      estimated: liveFlight.departure?.estimated || null,
      actual: liveFlight.departure?.actual || null,
      delayMinutes: liveFlight.departure?.delayMinutes ?? null,
      terminal: liveFlight.departure?.terminal || null,
      gate: liveFlight.departure?.gate || null,
    },
    arrival: {
      scheduled: liveFlight.arrival?.scheduled || null,
      estimated: liveFlight.arrival?.estimated || null,
      actual: liveFlight.arrival?.actual || null,
      delayMinutes: liveFlight.arrival?.delayMinutes ?? null,
      terminal: liveFlight.arrival?.terminal || null,
      gate: liveFlight.arrival?.gate || null,
    },
  };
}

function isFlightFinished(status) {
  return ["landed", "cancelled", "incident", "diverted"].includes(
    String(status || "").toLowerCase()
  );
}

function buildFinishedFlightResponse({
  flightIntel,
  flightData,
  departureDate,
  userContext,
}) {
  const isCancelled = String(flightData.status).toLowerCase() === "cancelled";

  return {
    success: true,

    uiSummary: {
      status: isCancelled ? "critical" : "good",
      headline: isCancelled
        ? "Voo cancelado — validação necessária"
        : "Voo já concluído",
      shortMessage: isCancelled
        ? "A Home2Flight não deve gerar uma timeline normal para este voo."
        : "Este voo já terminou. A timeline operacional pré-voo deixa de ser necessária.",
      confidenceLabel: getConfidenceLabel(
        flightIntel?.reliability?.trustLevel || "medium"
      ),
      reliabilityLabel: isCancelled ? "Frágil" : "Concluído",
      readinessLabel: isCancelled ? "Crítica" : "Concluída",
      mainRiskFactors: isCancelled
        ? ["O voo surge como cancelado no fornecedor externo."]
        : ["O voo já terminou segundo o fornecedor externo."],
      keyActions: isCancelled
        ? ["Confirma diretamente com a companhia aérea."]
        : ["Usa um voo futuro para gerar uma timeline operacional."],
    },

    decision: {
      headline: isCancelled
        ? "Voo cancelado — validação necessária"
        : "Voo já concluído",
      leaveHomeTime: null,
      airportArrivalTime: null,
      departureTime: departureDate,
    },

    flight: flightData,
    flightIntelligence: flightIntel,
    userContext,

    airportIntelligence: null,

    timingBreakdown: {
      airportRecommendedBuffer: 0,
      airportArrivalMinutesBeforeDeparture: 0,
      baseTravelMinutes: 0,
      transportBuffer: 0,
      leaveHomeMinutesBeforeDeparture: 0,
    },

    reliability: {
      score: isCancelled ? 15 : 95,
      confidence: getConfidenceLabel(
        flightIntel?.reliability?.trustLevel || "medium"
      ),
      riskLevel: isCancelled ? "high" : "low",
      explanation: {
        summary: isCancelled
          ? "O voo está cancelado. O motor bloqueou a timeline operacional automática."
          : "O voo já terminou. O motor não gera recomendação pré-voo para voos concluídos.",
      },
      adjustments: [
        {
          factor: "flight_status",
          impact: isCancelled ? -85 : 0,
          reason: isCancelled
            ? "Voo cancelado segundo o fornecedor externo."
            : "Voo já concluído segundo o fornecedor externo.",
        },
      ],
    },

    confidence: {
      level: flightIntel?.reliability?.trustLevel || "medium",
      score: flightIntel?.reliability?.confidenceScore || 70,
      strengths: ["Dados reais de voo integrados através de fornecedor externo."],
      weaknesses: flightIntel?.reliability?.limitations || [],
    },

    readiness: {
      score: isCancelled ? 0 : 100,
      label: isCancelled ? "Crítica" : "Concluída",
    },

    recommendations: isCancelled
      ? [
          {
            type: "airline_validation",
            priority: "critical",
            title: "Confirma o estado do voo com a companhia aérea",
          },
        ]
      : [
          {
            type: "future_flight",
            priority: "medium",
            title: "Pesquisa um voo futuro para gerar nova timeline",
          },
        ],

    alerts: flightIntel?.operationalSignals || [],

    communityReports: [],

    timeline: [
      {
        step: "flight_finished",
        title: isCancelled ? "Voo cancelado" : "Voo concluído",
        recommendedTime: departureDate,
        category: "flight",
        confidenceScore: flightIntel?.reliability?.confidenceScore || 70,
        trustLevel: flightIntel?.reliability?.trustLevel || "medium",
        status: isCancelled ? "risk" : "ready",
        dynamicStatus: isCancelled ? "blocked" : "completed",
        source: flightIntel?.provider?.liveDataActive
          ? "AviationStack live flight data"
          : "Flight fallback model",
        liveInsight:
          flightIntel?.intelligenceSummary?.summary ||
          "O voo já não está em fase operacional pré-partida.",
        reasoning: isCancelled
          ? "A Home2Flight bloqueia a recomendação automática quando o voo surge cancelado."
          : "A Home2Flight só deve gerar timeline operacional para voos futuros ou ainda em curso pré-partida.",
        operationalSignals: flightIntel?.operationalSignals || [],
      },
    ],

    metadata: {
      engine: "Home2Flight Unified Decision Engine",
      version: "0.8.0-flight-status-guard",
      flightEngine: flightIntel?.engine || "Flight Status Engine",
      generatedAt: new Date().toISOString(),
    },
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

    const flightIntel = await getFlightStatusIntelligence({
      flightNumber: flight,
    });

    const fallbackDeparture = "2026-05-08T16:40:00+01:00";

    const departureDate = getDepartureDateFromFlight(
      flightIntel,
      fallbackDeparture
    );

    const liveTerminal = flightIntel?.flight?.departure?.terminal || terminal;
    const liveAirport = flightIntel?.flight?.route?.from?.code || airport;
    const liveAirline = flightIntel?.flight?.airline?.code || airline;

    const flightData = getFlightDataFromIntel(
      flightIntel,
      flight,
      liveAirport,
      liveAirline
    );

    const userContext = {
      bags: hasBags,
      kids: hasKids,
      checkedIn: isCheckedIn,
      flightType,
      transport,
    };

    if (isFlightFinished(flightData.status)) {
      return res.status(200).json(
        buildFinishedFlightResponse({
          flightIntel,
          flightData,
          departureDate,
          userContext,
        })
      );
    }

    const airportIntel = await getAirportOperationalIntelligence({
      airport: liveAirport,
      airline: liveAirline,
      terminal: liveTerminal,
      departureTime: departureDate.toISOString(),
      passengerProfile: {
        travellingWithKids: hasKids,
        checkedInOnline: isCheckedIn,
      },
      baggageProfile: {
        checkedBags: hasBags ? 1 : 0,
      },
    });

    const airportOperational = airportIntel.operationalIntelligence;

    const airportArrivalMinutesBeforeDeparture =
      airportOperational.recommendedAirportBuffer +
      (flightType === "passport" ? 12 : 0) +
      (hasKids ? 10 : 0) +
      (!isCheckedIn ? 8 : 0);

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

    let reliabilityScore = 100;
    const reliabilityAdjustments = [];

    const flightImpact = flightIntel?.success
      ? Math.round((100 - flightIntel.reliability.score) * 0.25)
      : 18;

    reliabilityScore -= flightImpact;

    reliabilityAdjustments.push({
      factor: "flight_status",
      impact: -flightImpact,
      reason: flightIntel?.success
        ? "Dados reais de voo integrados no cálculo."
        : "Dados reais de voo indisponíveis. Aplicado fallback conservador.",
    });

    const airportImpact = Math.round(airportOperational.airportRiskScore * 0.35);

    reliabilityScore -= airportImpact;

    reliabilityAdjustments.push({
      factor: "airport_intelligence",
      impact: -airportImpact,
      reason: `Aeroporto avaliado com risco ${airportOperational.airportRisk}.`,
    });

    if (!airportOperational.liveDataActive) {
      reliabilityScore -= 10;
      reliabilityAdjustments.push({
        factor: "live_airport_data",
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

    const confidenceScore = Math.round(
      airportOperational.confidenceScore * 0.55 +
        (flightIntel?.reliability?.confidenceScore || 35) * 0.45
    );

    const confidenceLevel =
      confidenceScore >= 80 ? "high" : confidenceScore >= 55 ? "medium" : "low";

    const confidenceStrengths = [
      "Motor aeroportuário estruturado por camadas.",
      "Dados reais de voo integrados através de fornecedor externo.",
      "Decisão considera terminal, companhia, segurança, bagagem e perfil do passageiro.",
    ];

    const confidenceWeaknesses = [
      ...(airportIntel.limitations || []),
      ...(flightIntel?.reliability?.limitations || []),
    ];

    const readinessScore = Math.max(0, Math.min(100, reliabilityScore + 10));

    let readinessLabel = "Estável";

    if (readinessScore < 45) {
      readinessLabel = "Crítica";
    } else if (readinessScore < 70) {
      readinessLabel = "Sensível";
    }

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

    const timeline = [
      {
        step: "prepare_documents",
        title: "Preparar documentos e essenciais",
        recommendedTime: subtractMinutes(leaveHomeTime, 90),
        category: "preparation",
        confidenceScore: 88,
        trustLevel: "high",
        status: "ready",
        dynamicStatus: "stable",
        source: "User checklist",
        liveInsight:
          "Preparação antecipada recomendada para reduzir fricção antes da saída.",
        reasoning:
          "Documentos, cartões, bagagem essencial e itens das crianças devem estar prontos antes da decisão de saída.",
        operationalSignals: [],
      },
      {
        step: "online_checkin",
        title: "Confirmar check-in online",
        recommendedTime: subtractMinutes(leaveHomeTime, 60),
        category: "flight",
        confidenceScore: 82,
        trustLevel: isCheckedIn ? "high" : "medium",
        status: isCheckedIn ? "ready" : "buffer",
        dynamicStatus: isCheckedIn ? "stable" : "attention",
        source: "Flight preparation model",
        liveInsight: isCheckedIn
          ? "Check-in online confirmado."
          : "Check-in online ainda não confirmado. A timeline adiciona margem operacional.",
        reasoning: isCheckedIn
          ? "Passageiro já preparado para entrada direta na jornada aeroportuária."
          : "A confirmação antecipada do check-in reduz dependência de balcões e filas no aeroporto.",
        operationalSignals: isCheckedIn
          ? []
          : [
              {
                type: "checkin_pending",
                label: "Check-in online por confirmar",
                severity: "medium",
              },
            ],
      },
      {
        step: "leave_home",
        title: "Sair de casa",
        recommendedTime: leaveHomeTime,
        category: "transport",
        confidenceScore: transport === "public" ? 70 : 82,
        trustLevel: transport === "public" ? "medium" : "high",
        status: transport === "public" ? "buffer" : "ready",
        dynamicStatus:
          transport === "public" ? "transport_monitoring" : "stable",
        source: "Transport profile",
        liveInsight:
          transport === "public"
            ? "Transporte público exige margem adicional por depender de horários e possíveis esperas."
            : "Trajeto privado apresenta variabilidade reduzida.",
        reasoning:
          transport === "public"
            ? `Saída calculada com ${baseTravelMinutes} min de trajeto e ${transportBuffer} min de buffer de transporte.`
            : "Saída otimizada para trajeto privado com menor variabilidade operacional.",
        operationalSignals:
          transport === "public"
            ? [
                {
                  type: "public_transport",
                  label: "Dependência de transporte público",
                  severity: "medium",
                },
              ]
            : [],
        buffer: transport === "public" ? `+${transportBuffer} min` : undefined,
      },
      {
        step: "arrive_airport",
        title: "Chegar ao aeroporto",
        recommendedTime: airportArrivalTime,
        category: "airport",
        confidenceScore: airportOperational.confidenceScore,
        trustLevel:
          airportOperational.confidenceLevel === "low" ? "low" : "medium",
        status: airportOperational.airportRisk === "high" ? "risk" : "buffer",
        dynamicStatus: "airport_monitoring",
        source: airportOperational.sourceType,
        liveInsight:
          airportIntel.reasoning?.[0] ||
          "Chegada ao aeroporto calculada pelo Airport Intelligence Engine.",
        reasoning: `Chegada recomendada com ${airportOperational.recommendedAirportBuffer} min de buffer aeroportuário, incluindo segurança, deslocação interna e variabilidade operacional.`,
        operationalSignals: airportIntel.intelligenceFlags || [],
        buffer: `+${airportOperational.recommendedAirportBuffer} min`,
      },
      {
        step: "departure",
        title: "Partida do voo",
        recommendedTime: departureDate,
        category: "flight",
        confidenceScore: flightIntel?.reliability?.confidenceScore || 80,
        trustLevel: flightIntel?.reliability?.trustLevel || "medium",
        status: "ready",
        dynamicStatus: "flight_tracking",
        source: flightIntel?.provider?.liveDataActive
          ? "AviationStack live flight data"
          : "Flight fallback model",
        liveInsight:
          flightIntel?.intelligenceSummary?.summary ||
          "Hora de partida usada como âncora principal para calcular toda a timeline.",
        reasoning:
          "Todos os passos anteriores são calculados de trás para a frente a partir da hora prevista/estimada de partida.",
        operationalSignals: flightIntel?.operationalSignals || [],
      },
    ];

    const uiStatus = getUiStatus(reliabilityScore);
    const { headline, shortMessage } = getHeadline(uiStatus);

    const mainRiskFactors = reliabilityAdjustments
      .filter((item) => item.impact <= -8)
      .map((item) => item.reason);

    const keyActions = recommendations.map((item) => item.title);

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
      flightIntelligence: flightIntel,

      userContext,

      airportIntelligence: airportIntel,

      timingBreakdown: {
        airportRecommendedBuffer: airportOperational.recommendedAirportBuffer,
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
            "Pontuação calculada com base em voo real, Airport Intelligence Engine, transporte e contexto do utilizador.",
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

      alerts: [
        ...(airportIntel.intelligenceFlags || []),
        ...(flightIntel?.operationalSignals || []),
      ],

      communityReports: [],

      timeline,

      metadata: {
        engine: "Home2Flight Unified Decision Engine",
        version: "0.8.0-flight-status-guard",
        airportEngine: "Airport Intelligence Engine v2",
        flightEngine: flightIntel?.engine || "Flight Status Engine",
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