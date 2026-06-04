// /lib/engines/operational-memory-engine.js

const ENGINE_VERSION = "1.0.0-foundation";

function clamp(number, min, max) {
  return Math.max(min, Math.min(max, number));
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function average(values = []) {
  const cleanValues = values.filter((value) => Number.isFinite(value));

  if (cleanValues.length === 0) return 0;

  return (
    cleanValues.reduce((total, value) => total + value, 0) / cleanValues.length
  );
}

function round(value) {
  return Math.round(value);
}

function normalizeCode(value, fallback = "UNKNOWN") {
  return String(value || fallback).trim().toUpperCase();
}

function calculateDelta(predicted, actual) {
  if (!Number.isFinite(predicted) || !Number.isFinite(actual)) return null;
  return actual - predicted;
}

function getConfidenceFromSampleSize(sampleSize) {
  if (sampleSize >= 100) return 90;
  if (sampleSize >= 50) return 80;
  if (sampleSize >= 25) return 68;
  if (sampleSize >= 10) return 55;
  if (sampleSize >= 5) return 42;
  if (sampleSize >= 1) return 28;
  return 15;
}

function getLearningStrength(sampleSize) {
  if (sampleSize >= 100) return "strong";
  if (sampleSize >= 50) return "good";
  if (sampleSize >= 25) return "emerging";
  if (sampleSize >= 10) return "early";
  if (sampleSize >= 1) return "weak";
  return "none";
}

function buildEmptyLearning({ airport, airline, flightNumber }) {
  return {
    success: true,
    engine: "Home2Flight Operational Memory Engine",
    version: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),

    memoryStatus: "no_memory_available",

    scope: {
      airport,
      airline,
      flightNumber,
    },

    sampleSize: 0,
    confidenceScore: 15,
    learningStrength: "none",

    adjustments: {
      routeMinutes: 0,
      checkInMinutes: 0,
      securityMinutes: 0,
      passportControlMinutes: 0,
      walkingMinutes: 0,
      airportTotalMinutes: 0,
    },

    learning: {
      route: null,
      checkIn: null,
      security: null,
      passportControl: null,
      walking: null,
      airportTotal: null,
    },

    recommendations: [
      {
        type: "collect_operational_feedback",
        priority: "high",
        title: "Começar a recolher tempos reais",
        reasoning:
          "Ainda não existe histórico operacional suficiente para ajustar previsões com memória real.",
      },
    ],

    limitations: [
      "Primeira versão sem base de dados ligada.",
      "A memória depende de journeys históricas fornecidas ao motor.",
      "Ainda sem aprendizagem automática persistente.",
    ],
  };
}

function extractDelta(journey, key) {
  const predicted = safeNumber(journey?.predicted?.[key], NaN);
  const actual = safeNumber(journey?.actual?.[key], NaN);

  return calculateDelta(predicted, actual);
}

function buildMetricLearning({ metric, label, deltas }) {
  const cleanDeltas = deltas.filter((value) => Number.isFinite(value));

  if (cleanDeltas.length === 0) {
    return {
      metric,
      label,
      sampleSize: 0,
      averageDeltaMinutes: 0,
      recommendedAdjustmentMinutes: 0,
      confidenceScore: 15,
      learningStrength: "none",
      direction: "neutral",
    };
  }

  const avgDelta = average(cleanDeltas);
  const sampleSize = cleanDeltas.length;
  const confidenceScore = getConfidenceFromSampleSize(sampleSize);

  const cappedAdjustment = clamp(round(avgDelta), -20, 35);

  return {
    metric,
    label,
    sampleSize,
    averageDeltaMinutes: round(avgDelta),
    recommendedAdjustmentMinutes: cappedAdjustment,
    confidenceScore,
    learningStrength: getLearningStrength(sampleSize),
    direction:
      cappedAdjustment > 0
        ? "underestimated"
        : cappedAdjustment < 0
        ? "overestimated"
        : "accurate",
  };
}

export function runOperationalMemoryEngine({
  airport = "LIS",
  airline = null,
  flightNumber = null,
  historicalJourneys = [],
} = {}) {
  const normalizedAirport = normalizeCode(airport, "LIS");
  const normalizedAirline = airline ? normalizeCode(airline) : null;
  const normalizedFlightNumber = flightNumber
    ? normalizeCode(flightNumber)
    : null;

  const relevantJourneys = historicalJourneys.filter((journey) => {
    const journeyAirport = normalizeCode(journey?.airport, null);
    const journeyAirline = journey?.airline
      ? normalizeCode(journey.airline)
      : null;
    const journeyFlightNumber = journey?.flightNumber
      ? normalizeCode(journey.flightNumber)
      : null;

    const airportMatches = journeyAirport === normalizedAirport;

    const airlineMatches =
      !normalizedAirline || !journeyAirline || journeyAirline === normalizedAirline;

    const flightMatches =
      !normalizedFlightNumber ||
      !journeyFlightNumber ||
      journeyFlightNumber === normalizedFlightNumber;

    return airportMatches && airlineMatches && flightMatches;
  });

  if (relevantJourneys.length === 0) {
    return buildEmptyLearning({
      airport: normalizedAirport,
      airline: normalizedAirline,
      flightNumber: normalizedFlightNumber,
    });
  }

  const routeLearning = buildMetricLearning({
    metric: "routeMinutes",
    label: "Trajeto até ao aeroporto",
    deltas: relevantJourneys.map((journey) => extractDelta(journey, "routeMinutes")),
  });

  const checkInLearning = buildMetricLearning({
    metric: "checkInMinutes",
    label: "Check-in / Bag drop",
    deltas: relevantJourneys.map((journey) =>
      extractDelta(journey, "checkInMinutes")
    ),
  });

  const securityLearning = buildMetricLearning({
    metric: "securityMinutes",
    label: "Segurança",
    deltas: relevantJourneys.map((journey) =>
      extractDelta(journey, "securityMinutes")
    ),
  });

  const passportLearning = buildMetricLearning({
    metric: "passportControlMinutes",
    label: "Controlo de passaporte",
    deltas: relevantJourneys.map((journey) =>
      extractDelta(journey, "passportControlMinutes")
    ),
  });

  const walkingLearning = buildMetricLearning({
    metric: "walkingMinutes",
    label: "Deslocação interna até à porta",
    deltas: relevantJourneys.map((journey) =>
      extractDelta(journey, "walkingMinutes")
    ),
  });

  const airportTotalLearning = buildMetricLearning({
    metric: "airportTotalMinutes",
    label: "Fluxo total dentro do aeroporto",
    deltas: relevantJourneys.map((journey) =>
      extractDelta(journey, "airportTotalMinutes")
    ),
  });

  const learningItems = [
    routeLearning,
    checkInLearning,
    securityLearning,
    passportLearning,
    walkingLearning,
    airportTotalLearning,
  ];

  const confidenceScore = clamp(
    round(average(learningItems.map((item) => item.confidenceScore))),
    0,
    100
  );

  const strongestFindings = learningItems
    .filter((item) => Math.abs(item.recommendedAdjustmentMinutes) >= 5)
    .sort(
      (a, b) =>
        Math.abs(b.recommendedAdjustmentMinutes) -
        Math.abs(a.recommendedAdjustmentMinutes)
    );

  const recommendations = strongestFindings.slice(0, 3).map((item) => ({
    type: "memory_adjustment",
    priority:
      Math.abs(item.recommendedAdjustmentMinutes) >= 10 ? "high" : "medium",
    title: `${item.label} historicamente ${
      item.direction === "underestimated"
        ? "subestimado"
        : item.direction === "overestimated"
        ? "sobreestimado"
        : "estável"
    }`,
    reasoning:
      item.direction === "underestimated"
        ? `O histórico sugere adicionar cerca de ${item.recommendedAdjustmentMinutes} minutos a este passo.`
        : `O histórico sugere que este passo pode estar ${Math.abs(
            item.recommendedAdjustmentMinutes
          )} minutos acima do necessário.`,
  }));

  return {
    success: true,
    engine: "Home2Flight Operational Memory Engine",
    version: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),

    memoryStatus: "memory_available",

    scope: {
      airport: normalizedAirport,
      airline: normalizedAirline,
      flightNumber: normalizedFlightNumber,
    },

    sampleSize: relevantJourneys.length,
    confidenceScore,
    learningStrength: getLearningStrength(relevantJourneys.length),

    adjustments: {
      routeMinutes: routeLearning.recommendedAdjustmentMinutes,
      checkInMinutes: checkInLearning.recommendedAdjustmentMinutes,
      securityMinutes: securityLearning.recommendedAdjustmentMinutes,
      passportControlMinutes: passportLearning.recommendedAdjustmentMinutes,
      walkingMinutes: walkingLearning.recommendedAdjustmentMinutes,
      airportTotalMinutes: airportTotalLearning.recommendedAdjustmentMinutes,
    },

    learning: {
      route: routeLearning,
      checkIn: checkInLearning,
      security: securityLearning,
      passportControl: passportLearning,
      walking: walkingLearning,
      airportTotal: airportTotalLearning,
    },

    recommendations:
      recommendations.length > 0
        ? recommendations
        : [
            {
              type: "memory_stable",
              priority: "low",
              title: "Histórico sem desvios relevantes",
              reasoning:
                "A memória operacional não encontrou desvios fortes entre previsão e realidade.",
            },
          ],

    limitations: [
      "Primeira versão sem base de dados ligada.",
      "A memória depende de journeys históricas fornecidas ao motor.",
      "Ainda sem segmentação por hora do dia, terminal, dia da semana ou tipo de passageiro.",
      "Ainda sem aprendizagem persistente em Supabase.",
    ],
  };
}

export default runOperationalMemoryEngine;