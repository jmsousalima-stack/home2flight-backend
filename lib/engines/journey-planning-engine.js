// /lib/engines/journey-planning-engine.js

import { getFlightStatusIntelligence } from "./flight-status-engine.js";
import { getAirportOperationalIntelligence } from "./airport-intelligence-engine.js";
import { getRouteOperationalIntelligence } from "./route-intelligence-engine.js";
import { getEventDisruptionIntelligence } from "./event-disruption-engine.js";
import { runExternalOperationalSignals } from "./external-operational-signals-engine.js";
import { getWeatherIntelligence } from "./weather-intelligence-engine.js";
import { buildWeatherOperationalSignals } from "./weather-operational-signals-engine.js";
import { runReliabilityArbitration } from "./reliability-arbitration-engine.js";
import { runBufferGovernance } from "./buffer-governance-engine.js";
import { runSignalPriorityEngine } from "./signal-priority-engine.js";

const ENGINE_VERSION = "2.0.0-flight-rules-integrated-lib";

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
}

function subtractMinutes(date, minutes) {
  return new Date(date.getTime() - minutes * 60000);
}

function normalizeFlightOperationalStatus(status) {
  const value = String(status || "unknown").toLowerCase();

  if (["landed", "arrived", "completed", "finished"].includes(value)) {
    return "landed";
  }

  if (["departed", "airborne", "enroute", "in_air"].includes(value)) {
    return "departed";
  }

  if (["cancelled", "canceled"].includes(value)) {
    return "cancelled";
  }

  if (["delayed"].includes(value)) {
    return "delayed";
  }

  if (["scheduled", "expected", "active"].includes(value)) {
    return "scheduled";
  }

  return value || "unknown";
}

function runFlightRulesEngine({
  flightEngine,
  departureResolution,
  normalizedFlightDate,
  parsedForceManualTime,
}) {
  const rawStatus =
    flightEngine?.flightDecision?.status ||
    flightEngine?.flight?.status ||
    flightEngine?.flight?.providerStatusRaw ||
    "unknown";

  const status = normalizeFlightOperationalStatus(rawStatus);

  const now = new Date();
  const departureDate = departureResolution?.departureTime
    ? new Date(departureResolution.departureTime)
    : null;

  const departureValid =
    departureDate instanceof Date && !Number.isNaN(departureDate.getTime());

  const minutesUntilDeparture = departureValid
    ? Math.round((departureDate.getTime() - now.getTime()) / 60000)
    : null;

  const rules = [];
  let journeyStatus = "preflight_ready";
  let shouldBlockTimeline = false;
  let blockReason = null;
  let recommendationImpact = "generate_preflight_timeline";

  if (["landed", "departed"].includes(status)) {
    shouldBlockTimeline = true;
    journeyStatus = "flight_already_finished";
    blockReason =
      "Este voo já partiu ou já terminou. A Home2Flight não deve gerar uma timeline pré-voo normal.";
    recommendationImpact = "do_not_generate_preflight_timeline";

    rules.push({
      id: "block_finished_flight",
      severity: "high",
      passed: false,
      reasoning:
        "O estado operacional do voo indica que já partiu ou já terminou.",
    });
  } else {
    rules.push({
      id: "block_finished_flight",
      severity: "high",
      passed: true,
      reasoning: "O voo ainda não está marcado como terminado.",
    });
  }

  if (status === "cancelled") {
    shouldBlockTimeline = true;
    journeyStatus = "flight_cancelled";
    blockReason =
      "Este voo surge como cancelado. A Home2Flight deve bloquear a recomendação automática e pedir validação ao utilizador.";
    recommendationImpact = "block_automatic_recommendation";

    rules.push({
      id: "block_cancelled_flight",
      severity: "critical",
      passed: false,
      reasoning: "O fornecedor/arbitragem indica voo cancelado.",
    });
  } else {
    rules.push({
      id: "block_cancelled_flight",
      severity: "critical",
      passed: true,
      reasoning: "O voo não está marcado como cancelado.",
    });
  }

  if (!departureResolution?.departureTime) {
    shouldBlockTimeline = true;
    journeyStatus = "departure_time_unavailable";
    blockReason =
      "A hora de partida do voo não está disponível. A Home2Flight precisa de dados de voo ou fallback manual.";
    recommendationImpact = "request_departure_time";

    rules.push({
      id: "require_departure_time",
      severity: "critical",
      passed: false,
      reasoning: "Sem hora de partida não é possível calcular a timeline.",
    });
  } else {
    rules.push({
      id: "require_departure_time",
      severity: "critical",
      passed: true,
      reasoning: "Hora de partida disponível para ancorar a timeline.",
    });
  }

  if (departureValid && minutesUntilDeparture < -30) {
    shouldBlockTimeline = true;
    journeyStatus = "flight_time_in_past";
    blockReason =
      "A hora de partida usada já está no passado. A Home2Flight não deve gerar timeline pré-voo normal.";
    recommendationImpact = "do_not_generate_preflight_timeline";

    rules.push({
      id: "block_departure_time_in_past",
      severity: "high",
      passed: false,
      reasoning:
        "A hora de partida resolvida já passou há mais de 30 minutos.",
    });
  } else {
    rules.push({
      id: "block_departure_time_in_past",
      severity: "high",
      passed: true,
      reasoning:
        "A hora de partida ainda é compatível com uma timeline pré-voo.",
    });
  }

  if (!normalizedFlightDate && !parsedForceManualTime) {
    rules.push({
      id: "date_first_preferred",
      severity: "medium",
      passed: false,
      reasoning:
        "Sem flightDate explícito, o motor depende mais da resposta do provider.",
    });
  } else {
    rules.push({
      id: "date_first_preferred",
      severity: "medium",
      passed: true,
      reasoning:
        "flightDate ou fallback manual presentes; risco de apanhar voo do dia errado reduzido.",
    });
  }

  return {
    success: true,
    engine: "Home2Flight Flight Rules Engine",
    version: "1.0.0-internal-journey-layer",
    generatedAt: new Date().toISOString(),
    status,
    rawStatus,
    journeyStatus,
    shouldBlockTimeline,
    blockReason,
    recommendationImpact,
    minutesUntilDeparture,
    departureTime: departureResolution?.departureTime || null,
    departureSource: departureResolution?.source || "unavailable",
    liveFlightUsed: Boolean(departureResolution?.liveFlightUsed),
    rules,
  };
}

function getFlightDepartureTime({ flightEngine, manualDepartureTime }) {
  const flightDecision = flightEngine?.flightDecision;
  const flightData = flightEngine?.flight;

  const decisionDeparture =
    flightDecision?.estimatedDeparture || flightDecision?.scheduledDeparture;

  const selectedSourceType =
    flightDecision?.selectedSourceType || flightDecision?.sourceType || null;

  if (decisionDeparture && selectedSourceType !== "manual_fallback_time") {
    return {
      departureTime: decisionDeparture,
      source: selectedSourceType || "flight_source_arbitration",
      liveFlightUsed: Boolean(flightDecision?.liveDataActive),
    };
  }

  const liveDeparture =
    flightData?.departure?.estimated || flightData?.departure?.scheduled;

  if (liveDeparture && flightEngine?.success) {
    return {
      departureTime: liveDeparture,
      source: "live_flight_data",
      liveFlightUsed: true,
    };
  }

  if (decisionDeparture) {
    return {
      departureTime: decisionDeparture,
      source: selectedSourceType || "manual_fallback_time",
      liveFlightUsed: Boolean(flightDecision?.liveDataActive),
    };
  }

  if (manualDepartureTime) {
    return {
      departureTime: manualDepartureTime,
      source: "manual_fallback_time",
      liveFlightUsed: false,
    };
  }

  return {
    departureTime: null,
    source: "unavailable",
    liveFlightUsed: false,
  };
}

function severityFromRisk(risk) {
  if (risk === "high") return "high";
  if (risk === "medium") return "medium";
  if (risk === "low") return "low";
  return "medium";
}

function buildFallbackFlight({
  flight,
  airport,
  airline,
  terminal,
  departureTime,
}) {
  return {
    number: flight,
    icao: null,
    airline: {
      name: airline,
      code: airline,
    },
    status: "scheduled_fallback",
    providerStatusRaw: "fallback",
    route: {
      from: {
        code: airport,
        icao: null,
        name: "Origem",
        timezone: null,
      },
      to: {
        code: null,
        icao: null,
        name: "Destino",
        timezone: null,
      },
    },
    departure: {
      scheduled: departureTime,
      estimated: departureTime,
      actual: null,
      delayMinutes: null,
      terminal,
      gate: null,
    },
    arrival: {
      scheduled: null,
      estimated: null,
      actual: null,
      delayMinutes: null,
      terminal: null,
      gate: null,
    },
  };
}

function buildInternalOperationalSignals({
  departureResolution,
  flightEngine,
  airportEngine,
  routeEngine,
  eventEngine,
  checkedIn,
  kids,
  bags,
  fastTrack,
  priorityBoarding,
  transport,
  flightType,
}) {
  const signals = [];

  if (departureResolution.liveFlightUsed) {
    signals.push({
      id: "flight_status_live",
      type: "flight_status",
      title: "Dados reais/arbitrados de voo disponíveis",
      severity: "low",
      confidenceScore:
        flightEngine?.flightDecision?.confidenceScore ||
        flightEngine?.reliability?.confidenceScore ||
        flightEngine?.reliability?.score ||
        82,
      sourceType:
        flightEngine?.flightDecision?.selectedSourceType ||
        flightEngine?.reliability?.sourceType ||
        "flight_source_arbitration",
      freshness: "live",
      affects: ["flight", "departure_time"],
      extraBufferMinutes: 0,
      reasoning:
        flightEngine?.intelligenceSummary?.summary ||
        "O motor recebeu dados externos/arbitrados de voo para calcular a timeline.",
    });
  } else {
    signals.push({
      id: "flight_manual_fallback",
      type: "flight_status",
      title: "Hora de voo por fallback manual",
      severity: "medium",
      confidenceScore: flightEngine?.flightDecision?.confidenceScore || 55,
      sourceType: "manual_fallback_time",
      freshness: "fallback",
      affects: ["flight", "departure_time", "overall_reliability"],
      extraBufferMinutes: 5,
      reasoning:
        "A hora de partida foi obtida por fallback manual. A timeline mantém postura conservadora.",
    });
  }

  const airportRisk =
    airportEngine?.operationalIntelligence?.airportRisk || "medium";

  signals.push({
    id: "airport_operational_risk",
    type: "airport_pressure",
    title:
      airportRisk === "high"
        ? "Aeroporto com pressão operacional elevada"
        : airportRisk === "medium"
        ? "Aeroporto com variabilidade moderada"
        : "Aeroporto operacionalmente estável",
    severity: severityFromRisk(airportRisk),
    confidenceScore:
      airportEngine?.operationalIntelligence?.confidenceScore || 55,
    sourceType:
      airportEngine?.operationalIntelligence?.sourceType ||
      "structured_internal_operational_model",
    freshness: airportEngine?.operationalIntelligence?.liveDataActive
      ? "live"
      : "profile",
    affects: ["airport", "security", "terminal_access"],
    extraBufferMinutes:
      airportRisk === "high" ? 20 : airportRisk === "medium" ? 10 : 0,
    reasoning:
      airportEngine?.reasoning?.[0] ||
      "Perfil aeroportuário considerado no cálculo operacional.",
    limitations: airportEngine?.limitations || [],
  });

  const routeRisk = routeEngine?.operationalProfile?.routeRiskLevel || "low";

  signals.push({
    id: "route_operational_status",
    type: "route_status",
    title:
      routeRisk === "high"
        ? "Rota com risco elevado"
        : routeRisk === "medium"
        ? "Rota sob monitorização"
        : "Rota dentro do esperado",
    severity: severityFromRisk(routeRisk),
    confidenceScore:
      routeEngine?.reliability?.confidenceScore ||
      routeEngine?.reliability?.score ||
      70,
    sourceType:
      routeEngine?.reliability?.sourceType || "google_maps_route_estimate",
    freshness: routeEngine?.reliability?.liveDataActive ? "live" : "cached",
    affects: ["route", "airport_access"],
    extraBufferMinutes:
      routeEngine?.route?.dynamicBufferMinutes ||
      (transport === "public" ? 25 : transport === "uber" ? 18 : 15),
    reasoning:
      routeEngine?.intelligenceSummary?.summary ||
      "Estimativa de trajeto considerada no cálculo.",
    limitations: routeEngine?.reliability?.limitations || [],
  });

  const eventRisk = eventEngine?.eventIntelligence?.eventRisk || "medium";

  signals.push({
    id: "event_disruption_watch",
    type: "event_disruption",
    title:
      eventRisk === "high"
        ? "Disrupções/eventos com impacto elevado"
        : eventRisk === "medium"
        ? "Eventos/disrupções sob monitorização"
        : "Sem disrupção relevante detetada",
    severity: severityFromRisk(eventRisk),
    confidenceScore: eventEngine?.eventIntelligence?.confidenceScore || 50,
    sourceType:
      eventEngine?.eventIntelligence?.sourceType || "internal_event_profile",
    freshness: eventEngine?.eventIntelligence?.liveDataActive
      ? "live"
      : "profile",
    affects: ["route", "airport_access", "overall_reliability"],
    extraBufferMinutes:
      eventEngine?.eventIntelligence?.totalExtraBufferMinutes || 0,
    reasoning:
      eventEngine?.intelligenceSummary?.summary ||
      "Camada de eventos e disrupções considerada.",
    limitations: eventEngine?.limitations || [],
  });

  if (!checkedIn) {
    signals.push({
      id: "checkin_pending",
      type: "passenger_readiness",
      title: "Check-in online ainda por confirmar",
      severity: "medium",
      confidenceScore: 88,
      sourceType: "user_profile",
      freshness: "profile",
      affects: ["check_in", "bag_drop", "airport_arrival"],
      extraBufferMinutes: bags ? 10 : 5,
      reasoning:
        "Sem check-in online confirmado, a timeline mantém margem para balcão/check-in.",
    });
  }

  if (bags) {
    signals.push({
      id: "checked_bags",
      type: "baggage",
      title: "Bagagem de porão",
      severity: "medium",
      confidenceScore: 90,
      sourceType: "user_profile",
      freshness: "profile",
      affects: ["bag_drop", "airport_arrival"],
      extraBufferMinutes: 8,
      reasoning:
        "Bagagem de porão aumenta dependência de bag drop e variabilidade no aeroporto.",
    });
  }

  if (kids) {
    signals.push({
      id: "travel_with_children",
      type: "passenger_profile",
      title: "Viagem com crianças",
      severity: "medium",
      confidenceScore: 90,
      sourceType: "user_profile",
      freshness: "profile",
      affects: ["leave_home_time", "airport_arrival", "overall_reliability"],
      extraBufferMinutes: 12,
      reasoning:
        "Viajar com crianças aumenta fricção operacional e justifica margem adicional.",
    });
  }

  if (fastTrack) {
    signals.push({
      id: "fast_track_enabled",
      type: "security_fast_track",
      title: "Fast track ativo",
      severity: "low",
      confidenceScore: 80,
      sourceType: "user_profile",
      freshness: "profile",
      affects: ["security"],
      extraBufferMinutes: 0,
      reasoning: "Fast track reduz variabilidade no controlo de segurança.",
    });
  }

  if (priorityBoarding) {
    signals.push({
      id: "priority_boarding_enabled",
      type: "boarding_profile",
      title: "Embarque prioritário ativo",
      severity: "low",
      confidenceScore: 75,
      sourceType: "user_profile",
      freshness: "profile",
      affects: ["boarding", "gate_timing"],
      extraBufferMinutes: 0,
      reasoning:
        "Embarque prioritário reduz a margem necessária antes da abertura provável do embarque.",
    });
  }

  if (flightType === "passport") {
    signals.push({
      id: "passport_control_required",
      type: "passport_control",
      title: "Controlo de passaporte necessário",
      severity: "medium",
      confidenceScore: 85,
      sourceType: "user_profile",
      freshness: "profile",
      affects: ["passport_control", "gate_timing"],
      extraBufferMinutes: 8,
      reasoning:
        "Voo com controlo documental/fronteiriço exige tempo adicional antes da porta.",
    });
  }

  return signals;
}

function buildReliabilityFromEngines({
  arbitration,
  bufferGovernance,
  signalPriority,
  usedLiveFlightData,
}) {
  if (!arbitration?.success || !arbitration?.aggregation) {
    return {
      score: 50,
      trustLevel: "medium",
      readiness: "sensitive",
      adjustments: [
        {
          factor: "arbitration_unavailable",
          impact: 0,
          reason:
            "Motor de arbitragem indisponível. Aplicada fiabilidade neutra.",
        },
      ],
    };
  }

  const riskScore = arbitration.aggregation.operationalRiskScore || 50;
  const confidenceScore = arbitration.aggregation.confidenceScore || 50;
  const governedBuffer = bufferGovernance?.summary?.totalBufferMinutes || 0;
  const dominantCount = signalPriority?.metadata?.dominantSignalCount || 0;
  const contradictionCount = signalPriority?.metadata?.contradictionCount || 0;

  let score = Math.round(82 - riskScore * 0.45 + confidenceScore * 0.22);

  if (!usedLiveFlightData) score -= 12;
  if (governedBuffer > 70) score -= 8;
  if (governedBuffer > 95) score -= 14;
  if (dominantCount >= 3) score -= 6;
  if (contradictionCount > 0) score -= 3;

  score = Math.max(0, Math.min(95, score));

  return {
    score,
    trustLevel: score >= 75 ? "high" : score >= 50 ? "medium" : "low",
    readiness: score >= 75 ? "ready" : score >= 50 ? "sensitive" : "fragile",
    arbitration: arbitration.aggregation,
    bufferGovernance: bufferGovernance?.summary || null,
    signalPriority: {
      dominantSignalCount: dominantCount,
      supportingSignalCount:
        signalPriority?.metadata?.supportingSignalCount || 0,
      contradictionCount,
      confidenceSupportSignalCount:
        signalPriority?.metadata?.confidenceSupportSignalCount || 0,
      dominantSignals:
        signalPriority?.dominantRiskSignals?.slice(0, 3).map((signal) => ({
          id: signal.id,
          title: signal.title,
          priority: signal.priority,
          priorityScore: signal.priorityScore,
        })) || [],
      supportingSignals:
        signalPriority?.supportingRiskSignals?.slice(0, 3).map((signal) => ({
          id: signal.id,
          title: signal.title,
          priority: signal.priority,
          priorityScore: signal.priorityScore,
        })) || [],
      confidenceSupportSignals:
        signalPriority?.confidenceSupportSignals?.slice(0, 2).map((signal) => ({
          id: signal.id,
          title: signal.title,
          priority: signal.priority,
          priorityScore: signal.priorityScore,
        })) || [],
    },
    adjustments:
      arbitration.recommendations?.map((item) => ({
        factor: item.type,
        impact: 0,
        reason: item.reasoning,
      })) || [],
  };
}

function buildLeaveHomeReasoning(signalPriority) {
  const dominantRiskSignals = signalPriority?.dominantRiskSignals || [];
  const supportingRiskSignals = signalPriority?.supportingRiskSignals || [];
  const confidenceSupportSignals =
    signalPriority?.confidenceSupportSignals || [];

  const dominantText = dominantRiskSignals
    .slice(0, 2)
    .map((signal) => signal.title)
    .join(", ");

  const supportingText = supportingRiskSignals
    .slice(0, 3)
    .map((signal) => signal.title)
    .join(", ");

  const confidenceText = confidenceSupportSignals
    .slice(0, 2)
    .map((signal) => signal.title)
    .join(", ");

  if (dominantRiskSignals.length > 0 && supportingRiskSignals.length > 0) {
    return `A decisão foi principalmente influenciada por: ${dominantText}. Também foram considerados: ${supportingText}.`;
  }

  if (dominantRiskSignals.length > 0) {
    return `A decisão foi principalmente influenciada por: ${dominantText}.`;
  }

  if (supportingRiskSignals.length > 0 && confidenceSupportSignals.length > 0) {
    return `A timeline foi suportada por fatores moderados: ${supportingText}. Sinais positivos de confiança: ${confidenceText}.`;
  }

  if (supportingRiskSignals.length > 0) {
    return `A timeline foi suportada por fatores moderados: ${supportingText}.`;
  }

  if (confidenceSupportSignals.length > 0) {
    return `Não existem riscos dominantes. A decisão é suportada por sinais positivos de confiança: ${confidenceText}.`;
  }

  return "A timeline foi calculada a partir do perfil operacional e sinais disponíveis.";
}

export async function runJourneyPlanningEngine({
  flight = "KL1578",
  flightDate = null,
  origin = "Lisboa",
  airport = "LIS",
  airline = null,
  terminal = "1",
  transport = "public",
  weather = "normal",
  bags = true,
  kids = false,
  checkedIn = false,
  fastTrack = false,
  priorityBoarding = false,
  flightType = "passport",
  forceManualTime = false,
  departureTime = "",
} = {}) {
  const normalizedFlight = String(flight || "KL1578").toUpperCase();
  const normalizedFlightDate = flightDate ? String(flightDate) : null;
  const normalizedOrigin = String(origin || "Lisboa");
  const normalizedAirport = String(airport || "LIS").toUpperCase();
  const normalizedAirline = String(
    airline || normalizedFlight.slice(0, 2)
  ).toUpperCase();
  const normalizedTerminal = String(terminal || "1");
  const normalizedTransport = String(transport || "public").toLowerCase();
  const normalizedWeather = String(weather || "normal").toLowerCase();

  const parsedBags = parseBoolean(bags, true);
  const parsedKids = parseBoolean(kids, false);
  const parsedCheckedIn = parseBoolean(checkedIn, false);
  const parsedFastTrack = parseBoolean(fastTrack, false);
  const parsedPriorityBoarding = parseBoolean(priorityBoarding, false);
  const normalizedFlightType = String(flightType || "passport");
  const parsedForceManualTime = parseBoolean(forceManualTime, false);

  const manualDepartureTime = parsedForceManualTime
    ? String(departureTime || "")
    : null;

  const [flightEngine, routeEngine, eventEngine, externalSignalsEngine] =
    await Promise.all([
      getFlightStatusIntelligence({
        flightNumber: normalizedFlight,
        flight: normalizedFlight,
        flightDate: normalizedFlightDate,
        airline: normalizedAirline,
        airport: normalizedAirport,
        terminal: normalizedTerminal,
        manualDepartureTime,
        departureTime: manualDepartureTime,
        forceManualTime: parsedForceManualTime,
      }),
      getRouteOperationalIntelligence({
        origin: normalizedOrigin,
        airport: normalizedAirport,
        mode: normalizedTransport,
      }),
      getEventDisruptionIntelligence({
        origin: normalizedOrigin,
        airport: normalizedAirport,
        mode: normalizedTransport,
        flightDate: normalizedFlightDate,
      }),
      runExternalOperationalSignals({
        airport: normalizedAirport,
        mode: normalizedTransport,
        weather: normalizedWeather,
      }),
    ]);

  const departureResolution = getFlightDepartureTime({
    flightEngine,
    manualDepartureTime,
  });

  const flightRules = runFlightRulesEngine({
    flightEngine,
    departureResolution,
    normalizedFlightDate,
    parsedForceManualTime,
  });

  const flightOperationalStatus = flightRules.status;

  if (flightRules.shouldBlockTimeline) {
    return {
      success: true,
      engine: "Home2Flight Journey Planning Engine",
      version: ENGINE_VERSION,
      generatedAt: new Date().toISOString(),
      journeyStatus: flightRules.journeyStatus,
      decision: null,
      message: flightRules.blockReason,
      flightRules,
      flightIntelligence: flightEngine,
      diagnostics: {
        blockedByFlightStatus: true,
        flightOperationalStatus,
        selectedFlightProvider:
          flightEngine?.flightDecision?.selectedProvider || null,
        selectedFlightSourceType:
          flightEngine?.flightDecision?.selectedSourceType || null,
      },
      requestMode: parsedForceManualTime
        ? "manual_time_fallback"
        : "date_first_no_manual_time",
      wrapperInput: {
        flight: normalizedFlight,
        flightDate: normalizedFlightDate,
        origin: normalizedOrigin,
        airport: normalizedAirport,
        airline: normalizedAirline,
        terminal: normalizedTerminal,
        transport: normalizedTransport,
        bags: parsedBags,
        kids: parsedKids,
        checkedIn: parsedCheckedIn,
        fastTrack: parsedFastTrack,
        priorityBoarding: parsedPriorityBoarding,
        flightType: normalizedFlightType,
      },
    };
  }

  if (!departureResolution.departureTime) {
    return {
      success: false,
      engine: "Home2Flight Journey Planning Engine",
      version: ENGINE_VERSION,
      error:
        "Flight departure time unavailable. Enable manual time or use a flight with available live data.",
      flightRules,
    };
  }

  const departureDate = new Date(departureResolution.departureTime);

  if (Number.isNaN(departureDate.getTime())) {
    return {
      success: false,
      engine: "Home2Flight Journey Planning Engine",
      version: ENGINE_VERSION,
      error: "Invalid departure time.",
      flightRules,
    };
  }

  const [airportEngine, weatherEngine] = await Promise.all([
    getAirportOperationalIntelligence({
      airport: normalizedAirport,
      airline: normalizedAirline,
      terminal: normalizedTerminal,
      departureTime: departureDate.toISOString(),
      passengerProfile: {
        travellingWithKids: parsedKids,
        checkedInOnline: parsedCheckedIn,
      },
      baggageProfile: {
        checkedBags: parsedBags ? 1 : 0,
      },
    }),
    getWeatherIntelligence({
      airport: normalizedAirport,
      departureTime: departureDate.toISOString(),
    }),
  ]);

  const weatherSignals = buildWeatherOperationalSignals({ weatherEngine });

  const flightData =
    flightEngine?.flightDecision?.estimatedDeparture ||
    flightEngine?.flight?.departure
      ? {
          ...(flightEngine?.flight || {}),
          number: normalizedFlight,
          airline: {
            name: normalizedAirline,
            code: normalizedAirline,
          },
          status:
            flightEngine?.flightDecision?.status ||
            flightEngine?.flight?.status ||
            "scheduled_fallback",
          providerStatusRaw:
            flightEngine?.flight?.providerStatusRaw ||
            flightEngine?.flightDecision?.status ||
            "fallback",
          departure: {
            scheduled:
              flightEngine?.flightDecision?.scheduledDeparture ||
              flightEngine?.flight?.departure?.scheduled ||
              departureResolution.departureTime,
            estimated:
              flightEngine?.flightDecision?.estimatedDeparture ||
              flightEngine?.flight?.departure?.estimated ||
              departureResolution.departureTime,
            actual: flightEngine?.flight?.departure?.actual || null,
            delayMinutes:
              flightEngine?.flightDecision?.delayMinutes ??
              flightEngine?.flight?.departure?.delayMinutes ??
              null,
            terminal:
              flightEngine?.flightDecision?.terminal ||
              flightEngine?.flight?.departure?.terminal ||
              normalizedTerminal,
            gate:
              flightEngine?.flightDecision?.gate ||
              flightEngine?.flight?.departure?.gate ||
              null,
          },
          arrival: flightEngine?.flight?.arrival || {
            scheduled: null,
            estimated: null,
            actual: null,
            delayMinutes: null,
            terminal: null,
            gate: null,
          },
        }
      : buildFallbackFlight({
          flight: normalizedFlight,
          airport: normalizedAirport,
          airline: normalizedAirline,
          terminal: normalizedTerminal,
          departureTime: departureResolution.departureTime,
        });

  const airportInfo = airportEngine?.operationalIntelligence || {};
  const routeInfo = routeEngine?.route || {};
  const eventInfo = eventEngine?.eventIntelligence || {};
  const weatherInfo = weatherEngine?.weatherIntelligence || {};

  const internalSignals = buildInternalOperationalSignals({
    departureResolution,
    flightEngine,
    airportEngine,
    routeEngine,
    eventEngine,
    checkedIn: parsedCheckedIn,
    kids: parsedKids,
    bags: parsedBags,
    fastTrack: parsedFastTrack,
    priorityBoarding: parsedPriorityBoarding,
    transport: normalizedTransport,
    flightType: normalizedFlightType,
  });

  const externalSignals = externalSignalsEngine?.signals || [];

  const operationalSignals = [
    ...internalSignals,
    ...externalSignals,
    ...weatherSignals,
  ];

  const [arbitration, bufferGovernance, signalPriority] = await Promise.all([
    runReliabilityArbitration({ signals: operationalSignals }),
    runBufferGovernance({
      signals: operationalSignals,
      profile: {
        bags: parsedBags,
        kids: parsedKids,
        checkedIn: parsedCheckedIn,
        fastTrack: parsedFastTrack,
        priorityBoarding: parsedPriorityBoarding,
        flightType: normalizedFlightType,
        transport: normalizedTransport,
      },
    }),
    runSignalPriorityEngine({ signals: operationalSignals }),
  ]);

  const reliability = buildReliabilityFromEngines({
    arbitration,
    bufferGovernance,
    signalPriority,
    usedLiveFlightData: departureResolution.liveFlightUsed,
  });

  const baseRouteMinutes =
    routeInfo.liveTrafficDurationMinutes || routeInfo.baseDurationMinutes || 30;

  const baseRouteBuffer =
    routeInfo.dynamicBufferMinutes ??
    (normalizedTransport === "public"
      ? 25
      : normalizedTransport === "uber"
      ? 18
      : 15);

  const governedRouteBuffer =
    bufferGovernance?.domains?.route?.bufferMinutes || 0;

  const governedAirportBuffer =
    bufferGovernance?.domains?.airport?.bufferMinutes || 0;

  const governedGateBuffer =
    bufferGovernance?.domains?.gate?.bufferMinutes || 0;

  const governedGeneralBuffer =
    bufferGovernance?.domains?.general?.bufferMinutes || 0;

  const eventBuffer = Math.min(
    70,
    governedRouteBuffer + governedGeneralBuffer
  );

  const routeBuffer = Math.max(baseRouteBuffer, governedRouteBuffer);

  const securityMinutes = parsedFastTrack
    ? 10
    : airportInfo.estimatedSecurityMinutes || 20;

  const walkingMinutes = airportInfo.estimatedWalkingMinutes || 12;
  const passportMinutes = normalizedFlightType === "passport" ? 12 : 0;

  const checkInMinutes = parsedCheckedIn
    ? parsedBags
      ? 12
      : 0
    : parsedBags
    ? 25
    : 15;

  const kidsExtraMinutes = parsedKids ? 12 : 0;

  const airportEntryBuffer =
    10 + kidsExtraMinutes + Math.min(governedAirportBuffer, 25);

  const boardingBeforeDepartureMinutes = parsedPriorityBoarding ? 22 : 28;

  const gateReadyBuffer =
    (parsedPriorityBoarding ? 6 : 12) + Math.min(governedGateBuffer, 10);

  const boardingDate = subtractMinutes(
    departureDate,
    boardingBeforeDepartureMinutes
  );

  const gateArrivalDate = subtractMinutes(boardingDate, gateReadyBuffer);

  const passportDate = subtractMinutes(
    gateArrivalDate,
    walkingMinutes + passportMinutes
  );

  const securityDate = subtractMinutes(passportDate, securityMinutes);
  const checkInDate = subtractMinutes(securityDate, checkInMinutes);
  const airportArrivalDate = subtractMinutes(checkInDate, airportEntryBuffer);

  const leaveHomeDate = subtractMinutes(
    airportArrivalDate,
    baseRouteMinutes + routeBuffer + eventBuffer
  );

  const totalAirportFlow =
    airportEntryBuffer +
    checkInMinutes +
    securityMinutes +
    passportMinutes +
    walkingMinutes +
    gateReadyBuffer +
    boardingBeforeDepartureMinutes;

  const totalBeforeDeparture =
    totalAirportFlow + baseRouteMinutes + routeBuffer + eventBuffer;

  const operationalStatus =
    reliability.score >= 70
      ? "stable"
      : reliability.score >= 45
      ? "sensitive"
      : "fragile";

  return {
    success: true,
    engine: "Home2Flight Journey Planning Engine",
    version: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),

    journeyStatus: flightRules.journeyStatus,
    flightRules,

    journey: {
      origin: normalizedOrigin,
      airport: normalizedAirport,
      flight: normalizedFlight,
      flightDate: normalizedFlightDate,
      airline: normalizedAirline,
      terminal: normalizedTerminal,
      transport: normalizedTransport,
      weather: normalizedWeather,
      profile: {
        bags: parsedBags,
        kids: parsedKids,
        checkedIn: parsedCheckedIn,
        fastTrack: parsedFastTrack,
        priorityBoarding: parsedPriorityBoarding,
        flightType: normalizedFlightType,
        forceManualTime: parsedForceManualTime,
      },
    },

    decision: {
      leaveHomeTime: leaveHomeDate.toISOString(),
      airportArrivalTime: airportArrivalDate.toISOString(),
      checkInTime: checkInDate.toISOString(),
      securityTime: securityDate.toISOString(),
      passportControlTime: passportDate.toISOString(),
      gateArrivalTime: gateArrivalDate.toISOString(),
      boardingTime: boardingDate.toISOString(),
      departureTime: departureDate.toISOString(),
      operationalStatus,
    },

    operationalFlow: {
      transport: {
        routeMinutes: baseRouteMinutes,
        routeBuffer,
        eventBuffer,
      },
      airportArrival: {
        recommendedTime: airportArrivalDate.toISOString(),
        airportEntryBuffer,
      },
      checkIn: {
        required: !parsedCheckedIn || parsedBags,
        checkedInOnline: parsedCheckedIn,
        bags: parsedBags,
        recommendedTime: checkInDate.toISOString(),
        estimatedMinutes: checkInMinutes,
      },
      security: {
        fastTrack: parsedFastTrack,
        recommendedTime: securityDate.toISOString(),
        estimatedMinutes: securityMinutes,
      },
      passportControl: {
        required: normalizedFlightType === "passport",
        recommendedTime: passportDate.toISOString(),
        estimatedMinutes: passportMinutes,
      },
      gateArrival: {
        recommendedTime: gateArrivalDate.toISOString(),
        walkingMinutes,
        gateReadyBuffer,
      },
      boarding: {
        priorityBoarding: parsedPriorityBoarding,
        recommendedTime: boardingDate.toISOString(),
        boardingBeforeDepartureMinutes,
      },
    },

    buffers: {
      airportEntryBuffer,
      routeBuffer,
      eventBuffer,
      governedRouteBuffer,
      governedAirportBuffer,
      governedGateBuffer,
      governedGeneralBuffer,
      totalAirportFlow,
      totalBeforeDeparture,
      gateReadyBuffer,
      boardingBeforeDepartureMinutes,
      bufferGovernanceTotal:
        bufferGovernance?.summary?.totalBufferMinutes || null,
    },

    reliability,

    reliabilityArbitration: arbitration,
    bufferGovernance,
    signalPriority,

    operationalSignals,
    externalOperationalSignals: externalSignalsEngine,
    weatherOperationalSignals: weatherSignals,

    flight: flightData,
    flightIntelligence: flightEngine,
    airportIntelligence: airportEngine,
    routeIntelligence: routeEngine,
    eventDisruptionIntelligence: eventEngine,
    weatherIntelligence: weatherEngine,

    sources: {
      flight: {
        sourceType: departureResolution.source,
        liveDataActive: departureResolution.liveFlightUsed,
        decision: flightEngine?.flightDecision || null,
        sourceArbitration: flightEngine?.sourceArbitration || null,
      },
      airport: airportInfo,
      route: routeEngine?.reliability || null,
      events: eventInfo,
      weather: weatherInfo,
      externalSignals: externalSignalsEngine?.summary || null,
      arbitration: arbitration?.aggregation || null,
      bufferGovernance: bufferGovernance?.summary || null,
      signalPriority: signalPriority?.metadata || null,
      flightRules,
    },

    timeline: [
      {
        step: "leave_home",
        title: "Sair de casa",
        recommendedTime: leaveHomeDate.toISOString(),
        category: "transport",
        confidenceScore: reliability.score,
        trustLevel: reliability.trustLevel,
        status: "buffer",
        source:
          "Journey Planning Engine + Flight Rules Engine + Flight Source Arbitration + Weather Intelligence + Reliability Arbitration + Buffer Governance + Signal Priority",
        buffer: `+${routeBuffer + eventBuffer} min`,
        liveInsight:
          "Hora recomendada para iniciar a jornada até ao aeroporto.",
        reasoning: buildLeaveHomeReasoning(signalPriority),
        operationalSignals,
        dominantSignals: signalPriority?.dominantRiskSignals?.slice(0, 3) || [],
        supportingSignals:
          signalPriority?.supportingRiskSignals?.slice(0, 3) || [],
        confidenceSupportSignals:
          signalPriority?.confidenceSupportSignals?.slice(0, 2) || [],
      },
      {
        step: "arrive_airport",
        title: "Chegar ao aeroporto",
        recommendedTime: airportArrivalDate.toISOString(),
        category: "airport",
        confidenceScore: airportInfo.confidenceScore || 55,
        trustLevel: "medium",
        status: "buffer",
        source:
          "Airport Intelligence Engine + Weather Intelligence + Buffer Governance",
        liveInsight:
          airportEngine?.layers?.airportProfile?.reasoning?.[0] ||
          "Chegada ao aeroporto calculada com margem governada.",
        reasoning:
          "Inclui margem antes dos passos críticos: check-in, segurança, controlo documental e porta.",
        operationalSignals: operationalSignals.filter((signal) =>
          signal.affects?.some((item) =>
            [
              "airport",
              "security",
              "terminal_access",
              "airport_access",
            ].includes(item)
          )
        ),
      },
      {
        step: parsedCheckedIn ? "bagdrop" : "checkin_bagdrop",
        title: parsedCheckedIn
          ? "Bag drop"
          : parsedBags
          ? "Check-in / Bag drop"
          : "Check-in",
        recommendedTime: checkInDate.toISOString(),
        category: "check-in",
        confidenceScore: 62,
        trustLevel: "medium",
        status: "buffer",
        source: "Passenger profile model",
        buffer: `${checkInMinutes} min`,
        liveInsight: parsedCheckedIn
          ? parsedBags
            ? "Check-in online confirmado. Mantida margem para bag drop."
            : "Check-in online confirmado. Passo reduzido."
          : "Check-in/bag drop ainda exige margem operacional.",
        reasoning:
          "Tempo ajustado em função de check-in online e bagagem de porão.",
        operationalSignals: operationalSignals.filter((signal) =>
          signal.affects?.some((item) => ["check_in", "bag_drop"].includes(item))
        ),
      },
      {
        step: "security",
        title: "Segurança",
        recommendedTime: securityDate.toISOString(),
        category: "security",
        confidenceScore: 60,
        trustLevel: "medium",
        status: "buffer",
        source: "Airport Intelligence Engine + Weather Intelligence",
        buffer: `${securityMinutes} min`,
        liveInsight: parsedFastTrack
          ? "Fast track ativo. Tempo de segurança reduzido."
          : "Segurança é uma das maiores fontes de variabilidade aeroportuária.",
        reasoning:
          "Tempo estimado com base no perfil do aeroporto, terminal, meteorologia e opção fast track.",
        operationalSignals: operationalSignals.filter((signal) =>
          signal.affects?.includes("security")
        ),
      },
      {
        step: "passport_control",
        title: "Controlo de passaporte",
        recommendedTime: passportDate.toISOString(),
        category: "passport",
        confidenceScore: 58,
        trustLevel: "medium",
        status: normalizedFlightType === "passport" ? "buffer" : "skipped",
        source: "Flight type model",
        buffer: `${passportMinutes} min`,
        liveInsight:
          normalizedFlightType === "passport"
            ? "Voo com controlo de fronteira/passaporte considerado."
            : "Sem controlo de passaporte adicional nesta jornada.",
        reasoning: "Tempo ajustado ao tipo de voo selecionado.",
        operationalSignals: operationalSignals.filter((signal) =>
          signal.affects?.includes("passport_control")
        ),
      },
      {
        step: "gate_arrival",
        title: "Chegar à porta de embarque",
        recommendedTime: gateArrivalDate.toISOString(),
        category: "gate",
        confidenceScore: 65,
        trustLevel: "medium",
        status: "ready",
        source: "Gate timing model",
        buffer: `${gateReadyBuffer} min antes do embarque`,
        liveInsight:
          "Chegada à porta recomendada antes da abertura provável do embarque.",
        reasoning:
          "Inclui deslocação interna e margem para estar pronto antes do embarque.",
        operationalSignals: operationalSignals.filter((signal) =>
          signal.affects?.some((item) =>
            ["gate_timing", "boarding"].includes(item)
          )
        ),
      },
      {
        step: "boarding",
        title: "Hora prevista de embarque",
        recommendedTime: boardingDate.toISOString(),
        category: "boarding",
        confidenceScore: 60,
        trustLevel: "medium",
        status: "ready",
        source: "Boarding buffer model",
        buffer: `${boardingBeforeDepartureMinutes} min antes da partida`,
        liveInsight: parsedPriorityBoarding
          ? "Embarque prioritário ativo. Margem de embarque reduzida."
          : "Hora operacional alvo para início provável de embarque.",
        reasoning:
          "Estimativa baseada em prioridade de embarque, companhia e margem antes da partida.",
        operationalSignals: operationalSignals.filter((signal) =>
          signal.affects?.includes("boarding")
        ),
      },
      {
        step: "departure",
        title: "Partida do voo",
        recommendedTime: departureDate.toISOString(),
        category: "flight",
        confidenceScore:
          flightEngine?.flightDecision?.confidenceScore ||
          (departureResolution.liveFlightUsed ? 82 : 55),
        trustLevel: departureResolution.liveFlightUsed ? "high" : "medium",
        status: "ready",
        source: departureResolution.liveFlightUsed
          ? "Flight Source Arbitration"
          : "Manual fallback",
        liveInsight: "Hora usada como âncora da timeline operacional.",
        reasoning:
          "Todos os passos são calculados de trás para a frente a partir da hora prevista/estimada de partida.",
        operationalSignals: operationalSignals.filter((signal) =>
          signal.affects?.includes("flight")
        ),
      },
    ],

    diagnostics: {
      architecture: "lib_orchestrated_no_internal_fetch",
      flightRulesActive: true,
      flightRulesSuccess: Boolean(flightRules?.success),
      flightRulesJourneyStatus: flightRules?.journeyStatus || null,
      flightSourceArbitrationAware: true,
      dateFirstMode: true,
      weatherIntegrated: true,
      usedLiveFlightData: departureResolution.liveFlightUsed,
      departureSource: departureResolution.source,
      flightDecisionConfidence:
        flightEngine?.flightDecision?.confidenceScore || null,
      selectedFlightProvider:
        flightEngine?.flightDecision?.selectedProvider || null,
      selectedFlightSourceType:
        flightEngine?.flightDecision?.selectedSourceType || null,
      flightSourcesUsed: flightEngine?.flightDecision?.sourcesUsed || 0,
      flightConflictsDetected:
        flightEngine?.flightDecision?.conflictsDetected || 0,
      flightOperationalStatus,
      arbitrationSuccess: Boolean(arbitration?.success),
      bufferGovernanceSuccess: Boolean(bufferGovernance?.success),
      signalPrioritySuccess: Boolean(signalPriority?.success),
      externalSignalsSuccess: Boolean(externalSignalsEngine?.success),
      weatherEngineSuccess: Boolean(weatherEngine?.success),
      weatherSignalsCount: weatherSignals.length,
      airportEngineSuccess: Boolean(airportEngine?.success),
      routeEngineSuccess: Boolean(routeEngine?.success),
      eventEngineSuccess: Boolean(eventEngine?.success),
      internalFetchRemoved: true,
    },

    requestMode: parsedForceManualTime
      ? "manual_time_fallback"
      : "date_first_no_manual_time",

    wrapperInput: {
      flight: normalizedFlight,
      flightDate: normalizedFlightDate,
      origin: normalizedOrigin,
      airport: normalizedAirport,
      airline: normalizedAirline,
      terminal: normalizedTerminal,
      transport: normalizedTransport,
      bags: parsedBags,
      kids: parsedKids,
      checkedIn: parsedCheckedIn,
      fastTrack: parsedFastTrack,
      priorityBoarding: parsedPriorityBoarding,
      flightType: normalizedFlightType,
    },
  };
}

export function parseJourneyPlanningRequest(query = {}) {
  const flight = String(query.flight || "KL1578").toUpperCase();
  const flightDate = query.flightDate ? String(query.flightDate) : null;
  const origin = String(query.origin || "Lisboa");
  const airport = String(query.airport || "LIS").toUpperCase();
  const airline = String(query.airline || flight.slice(0, 2)).toUpperCase();
  const terminal = String(query.terminal || "1");
  const transport = String(
    query.transport || query.mode || "public"
  ).toLowerCase();
  const weather = String(query.weather || "normal").toLowerCase();

  const forceManualTime = parseBoolean(query.forceManualTime, false);

  return {
    flight,
    flightDate,
    origin,
    airport,
    airline,
    terminal,
    transport,
    weather,
    bags: parseBoolean(query.bags, true),
    kids: parseBoolean(query.kids, false),
    checkedIn: parseBoolean(query.checkedIn, false),
    fastTrack: parseBoolean(query.fastTrack, false),
    priorityBoarding: parseBoolean(query.priorityBoarding, false),
    flightType: String(query.flightType || "passport"),
    forceManualTime,
    departureTime: forceManualTime ? String(query.departureTime || "") : "",
  };
}

export default runJourneyPlanningEngine;