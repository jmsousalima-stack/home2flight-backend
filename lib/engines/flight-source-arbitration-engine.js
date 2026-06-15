// /lib/engines/flight-source-arbitration-engine.js

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function minutesBetween(a, b) {
  const dateA = parseDate(a);
  const dateB = parseDate(b);
  if (!dateA || !dateB) return null;
  return Math.round(Math.abs(dateA.getTime() - dateB.getTime()) / 60000);
}

function normalizeSource(source = {}) {
  const scheduledDeparture =
    source.scheduledDeparture ||
    source.departure?.scheduled ||
    source.flight?.departure?.scheduled ||
    null;

  const estimatedDeparture =
    source.estimatedDeparture ||
    source.departure?.estimated ||
    source.flight?.departure?.estimated ||
    scheduledDeparture ||
    null;

  return {
    id: source.id || source.provider || source.sourceType || `source_${Math.random().toString(36).slice(2)}`,
    provider: source.provider || source.sourceName || "unknown_provider",
    sourceType: source.sourceType || "external_flight_source",
    reachable: source.reachable !== false,
    liveDataActive: source.liveDataActive === true,
    scheduledDeparture,
    estimatedDeparture,
    status: source.status || source.providerStatusRaw || "unknown",
    terminal: source.terminal || source.departure?.terminal || source.flight?.departure?.terminal || null,
    gate: source.gate || source.departure?.gate || source.flight?.departure?.gate || null,
    delayMinutes: Number.isFinite(Number(source.delayMinutes)) ? Number(source.delayMinutes) : null,
    confidenceScore: clamp(
      Number.isFinite(Number(source.confidenceScore))
        ? Number(source.confidenceScore)
        : source.liveDataActive
        ? 75
        : 45
    ),
    freshness: source.freshness || source.dataFreshness || "unknown",
    limitations: Array.isArray(source.limitations) ? source.limitations : [],
    raw: source,
  };
}

function sourceBaseWeight(source) {
  let weight = 0;

  if (source.liveDataActive) weight += 35;
  if (source.reachable) weight += 15;

  weight += source.confidenceScore * 0.45;

  if (source.sourceType === "official_airline") weight += 18;
  if (source.sourceType === "official_airport") weight += 18;
  if (source.sourceType === "aviationstack_live") weight += 10;
  if (source.sourceType === "aerodatabox_live") weight += 12;
  if (source.sourceType === "manual_fallback_time") weight -= 30;
  if (source.sourceType === "safe_fallback") weight -= 30;

  if (!source.estimatedDeparture) weight -= 30;

  return clamp(Math.round(weight), 0, 100);
}

function detectConflicts(sources) {
  const conflicts = [];
  const validSources = sources.filter((source) => source.estimatedDeparture);

  for (let i = 0; i < validSources.length; i++) {
    for (let j = i + 1; j < validSources.length; j++) {
      const sourceA = validSources[i];
      const sourceB = validSources[j];

      const diff = minutesBetween(sourceA.estimatedDeparture, sourceB.estimatedDeparture);
      if (diff === null) continue;

      if (diff >= 30) {
        conflicts.push({
          type: "large_departure_time_conflict",
          severity: "high",
          sourceA: sourceA.provider,
          sourceB: sourceB.provider,
          differenceMinutes: diff,
          explanation: "Duas fontes apresentam diferença significativa na hora estimada de partida.",
          resolution: "Aplicar decisão conservadora e reduzir confiança até haver consenso mais forte.",
        });
      } else if (diff >= 12) {
        conflicts.push({
          type: "moderate_departure_time_conflict",
          severity: "medium",
          sourceA: sourceA.provider,
          sourceB: sourceB.provider,
          differenceMinutes: diff,
          explanation: "Duas fontes apresentam diferença moderada na hora estimada de partida.",
          resolution: "Usar fonte com maior peso, mantendo margem operacional adicional.",
        });
      }
    }
  }

  return conflicts;
}

function calculateConsensusStrength(sources, conflicts) {
  const validSources = sources.filter((source) => source.estimatedDeparture);

  if (validSources.length === 0) return "none";
  if (validSources.length === 1) return "single_source";

  if (conflicts.some((conflict) => conflict.severity === "high")) return "weak";
  if (conflicts.some((conflict) => conflict.severity === "medium")) return "medium";

  return "strong";
}

function selectPrimarySource(sources) {
  const ranked = [...sources]
    .map((source) => ({
      ...source,
      arbitrationWeight: sourceBaseWeight(source),
    }))
    .sort((a, b) => b.arbitrationWeight - a.arbitrationWeight);

  return ranked[0] || null;
}

function calculateDecisionConfidence({ primarySource, sources, conflicts, consensusStrength }) {
  if (!primarySource) return 0;

  let confidence = primarySource.confidenceScore;

  if (primarySource.liveDataActive) confidence += 8;
  if (sources.length === 1) confidence -= 15;
  if (consensusStrength === "strong") confidence += 10;
  if (consensusStrength === "medium") confidence += 2;
  if (consensusStrength === "weak") confidence -= 18;
  if (consensusStrength === "single_source") confidence -= 8;

  confidence -= conflicts.length * 5;

  if (primarySource.sourceType === "manual_fallback_time") confidence = Math.min(confidence - 20, 18);
  if (primarySource.sourceType === "safe_fallback") confidence = Math.min(confidence - 20, 22);

  return clamp(Math.round(confidence), 0, 95);
}

function trustLevelFromConfidence(score) {
  if (score >= 78) return "high";
  if (score >= 52) return "medium";
  return "low";
}

function buildReasoning({ primarySource, sources, conflicts, consensusStrength, confidenceScore }) {
  if (!primarySource) {
    return [
      "Nenhuma fonte forneceu uma hora de partida utilizável.",
      "A Home2Flight deve bloquear a timeline automática até conseguir dados reais ou confirmação explícita do utilizador.",
    ];
  }

  const reasoning = [
    `Fonte principal escolhida: ${primarySource.provider}, com peso operacional ${primarySource.arbitrationWeight}/100.`,
  ];

  if (primarySource.sourceType === "manual_fallback_time") {
    reasoning.push(
      "A fonte escolhida é uma hora manual/fallback, não validada por fornecedor externo.",
      "A timeline só deve ser gerada após confirmação explícita do utilizador."
    );
  }

  if (sources.length === 1) {
    reasoning.push("Só existe uma fonte disponível, por isso a confiança foi reduzida por falta de validação cruzada.");
  }

  if (consensusStrength === "strong") {
    reasoning.push("As fontes disponíveis estão alinhadas e reforçam a confiança da decisão.");
  }

  if (consensusStrength === "medium") {
    reasoning.push("Existem pequenas diferenças entre fontes, mas sem conflito grave.");
  }

  if (consensusStrength === "weak") {
    reasoning.push("Foram detetadas diferenças relevantes entre fontes. A decisão mantém postura conservadora.");
  }

  if (conflicts.length > 0) {
    reasoning.push(`Foram detetados ${conflicts.length} conflito(s) entre fontes.`);
  }

  reasoning.push(`Confiança final da decisão de voo: ${confidenceScore}/100.`);

  return reasoning;
}

export async function runFlightSourceArbitration({
  flight = "KL1578",
  airline = "KL",
  airport = "LIS",
  terminal = null,
  manualDepartureTime = null,
  forceManualTime = false,
  sources = [],
} = {}) {
  const normalizedFlight = String(flight || "").replace(/\s+/g, "").toUpperCase();
  const normalizedAirline = String(airline || "").toUpperCase();
  const normalizedAirport = String(airport || "").toUpperCase();
  const normalizedTerminal = terminal ? String(terminal) : null;

  const normalizedSources = Array.isArray(sources) ? sources.map(normalizeSource) : [];

  if (forceManualTime && manualDepartureTime) {
    normalizedSources.push(
      normalizeSource({
        id: "manual_departure_time",
        provider: "manual_fallback",
        sourceType: "manual_fallback_time",
        reachable: true,
        liveDataActive: false,
        scheduledDeparture: manualDepartureTime,
        estimatedDeparture: manualDepartureTime,
        status: "manual_fallback",
        terminal: null,
        gate: null,
        confidenceScore: 35,
        freshness: "manual",
        limitations: [
          "Hora introduzida manualmente pelo utilizador.",
          "Não valida atrasos, alterações de terminal, gate ou cancelamentos.",
          "Requer confirmação explícita antes de gerar timeline operacional.",
        ],
      })
    );
  }

  const usableSources = normalizedSources.filter((source) => source.estimatedDeparture);
  const liveSources = usableSources.filter((source) => source.liveDataActive === true);

  const conflicts = detectConflicts(usableSources);
  const consensusStrength = calculateConsensusStrength(usableSources, conflicts);
  const primarySource = selectPrimarySource(usableSources);

  const confidenceScore = calculateDecisionConfidence({
    primarySource,
    sources: usableSources,
    conflicts,
    consensusStrength,
  });

  const trustLevel = trustLevelFromConfidence(confidenceScore);
  const selectedSourceType = primarySource?.sourceType || "unavailable";
  const isManualFallback = selectedSourceType === "manual_fallback_time";
  const hasLiveFlightData = liveSources.length > 0 && !isManualFallback;

  const requiresUserConfirmation = Boolean(isManualFallback || !hasLiveFlightData);

  const flightDecision = primarySource
    ? {
        flight: normalizedFlight,
        airline: normalizedAirline,
        airport: normalizedAirport,
        terminal: isManualFallback ? null : primarySource.terminal || null,
        gate: isManualFallback ? null : primarySource.gate || null,

        scheduledDeparture: primarySource.scheduledDeparture,
        estimatedDeparture: primarySource.estimatedDeparture,

        status: primarySource.status || "unknown",
        delayMinutes: primarySource.delayMinutes,

        selectedProvider: primarySource.provider,
        selectedSourceType,

        confidenceScore,
        trustLevel,
        consensusStrength,

        sourcesUsed: usableSources.length,
        liveSourcesUsed: liveSources.length,
        conflictsDetected: conflicts.length,

        liveDataActive: hasLiveFlightData,
        requiresUserConfirmation,
        confirmationReason: requiresUserConfirmation
          ? "A hora do voo não foi validada por uma fonte live confiável."
          : null,
      }
    : {
        flight: normalizedFlight,
        airline: normalizedAirline,
        airport: normalizedAirport,
        terminal: null,
        gate: null,

        scheduledDeparture: null,
        estimatedDeparture: null,

        status: "unavailable",
        delayMinutes: null,

        selectedProvider: null,
        selectedSourceType: "unavailable",

        confidenceScore,
        trustLevel,
        consensusStrength,

        sourcesUsed: 0,
        liveSourcesUsed: 0,
        conflictsDetected: conflicts.length,

        liveDataActive: false,
        requiresUserConfirmation: true,
        confirmationReason: "Não foi encontrada hora de partida validada por fonte live.",
      };

  const reasoning = buildReasoning({
    primarySource,
    sources: usableSources,
    conflicts,
    consensusStrength,
    confidenceScore,
  });

  return {
    success: Boolean(primarySource),
    engine: "Home2Flight Flight Source Arbitration Engine",
    version: "1.1.0-flight-data-gate",
    generatedAt: new Date().toISOString(),

    flightDecision,

    dataGate: {
      hasUsableDepartureTime: Boolean(primarySource?.estimatedDeparture),
      hasLiveFlightData,
      requiresUserConfirmation,
      selectedSourceType,
      selectedProvider: primarySource?.provider || null,
      confidenceScore,
      policy:
        "Sem dados live de voo, a timeline automática deve ser bloqueada ou exigir confirmação explícita.",
    },

    sources: usableSources.map((source) => ({
      id: source.id,
      provider: source.provider,
      sourceType: source.sourceType,
      reachable: source.reachable,
      liveDataActive: source.liveDataActive,
      scheduledDeparture: source.scheduledDeparture,
      estimatedDeparture: source.estimatedDeparture,
      status: source.status,
      terminal: source.sourceType === "manual_fallback_time" ? null : source.terminal,
      gate: source.sourceType === "manual_fallback_time" ? null : source.gate,
      delayMinutes: source.delayMinutes,
      confidenceScore: source.confidenceScore,
      arbitrationWeight: sourceBaseWeight(source),
      freshness: source.freshness,
      limitations: source.limitations,
    })),

    conflicts,
    reasoning,

    limitations: [
      "Arbitragem preparada para múltiplas fontes.",
      "Hora manual/fallback nunca é tratada como dado live.",
      "Terminal e gate só são confirmados quando vêm de fornecedor externo confiável.",
      "Ainda sem histórico Home2Flight de atrasos por voo, rota, companhia ou aeroporto.",
    ],
  };
}

export default runFlightSourceArbitration;