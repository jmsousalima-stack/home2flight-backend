export default function handler(req, res) {
  const {
    officialMinutes = "0",
    communityMinutes = "30",
    operationalMinutes = "32",
    airportProfileMinutes = "20",
    hasOfficial = "false",
    communityConfidence = "medium",
    operationalVerified = "true",
  } = req.query;

  const sources = [
    {
      id: "official_live_data",
      label: "Dados oficiais live",
      active: hasOfficial === "true",
      minutes: Number(officialMinutes),
      trustWeight: 0.95,
      freshnessWeight: 0.95,
      verificationWeight: 1.0,
    },

    {
      id: "operational_intelligence",
      label: "Inteligência operacional",
      active: true,
      minutes: Number(operationalMinutes),
      trustWeight: operationalVerified === "true" ? 0.82 : 0.65,
      freshnessWeight: 0.7,
      verificationWeight: operationalVerified === "true" ? 0.85 : 0.55,
    },

    {
      id: "community_reports",
      label: "Reports da comunidade",
      active: true,
      minutes: Number(communityMinutes),
      trustWeight:
        communityConfidence === "high"
          ? 0.75
          : communityConfidence === "medium"
          ? 0.58
          : 0.4,
      freshnessWeight: 0.75,
      verificationWeight: 0.45,
    },

    {
      id: "airport_profile",
      label: "Perfil histórico do aeroporto",
      active: true,
      minutes: Number(airportProfileMinutes),
      trustWeight: 0.68,
      freshnessWeight: 0.45,
      verificationWeight: 0.7,
    },
  ];

  const activeSources = sources.filter((source) => source.active);

  const weightedSources = activeSources.map((source) => {
    const finalWeight =
      source.trustWeight * 0.5 +
      source.freshnessWeight * 0.3 +
      source.verificationWeight * 0.2;

    return {
      ...source,
      finalWeight: Number(finalWeight.toFixed(3)),
      weightedMinutes: Number((source.minutes * finalWeight).toFixed(2)),
    };
  });

  const totalWeight = weightedSources.reduce(
    (sum, source) => sum + source.finalWeight,
    0
  );

  const weightedMinutesSum = weightedSources.reduce(
    (sum, source) => sum + source.weightedMinutes,
    0
  );

  const recommendedMinutes =
    totalWeight > 0
      ? Math.round(weightedMinutesSum / totalWeight)
      : Number(airportProfileMinutes);

  const highestTrustedSource = weightedSources.reduce(
    (best, source) =>
      !best || source.finalWeight > best.finalWeight ? source : best,
    null
  );

  const maxMinutes = Math.max(...weightedSources.map((source) => source.minutes));
  const minMinutes = Math.min(...weightedSources.map((source) => source.minutes));

  const conflictSpread = maxMinutes - minMinutes;

  let conflictLevel = "low";

  if (conflictSpread >= 30) {
    conflictLevel = "high";
  } else if (conflictSpread >= 15) {
    conflictLevel = "medium";
  }

  res.status(200).json({
    arbitration: {
      recommendedMinutes,
      conflictLevel,
      conflictSpread,
      highestTrustedSource: highestTrustedSource
        ? {
            id: highestTrustedSource.id,
            label: highestTrustedSource.label,
            finalWeight: highestTrustedSource.finalWeight,
          }
        : null,
    },

    weightedSources,

    decisionExplanation: {
      summary:
        "Tempo recomendado calculado por arbitragem ponderada entre fontes oficiais, operacionais, comunitárias e perfil histórico.",
      logic:
        "O peso final combina confiança da fonte, frescura dos dados e grau de verificação.",
      fallback:
        hasOfficial === "true"
          ? "Fonte oficial ativa, mas ainda cruzada com sinais complementares."
          : "Sem fonte oficial ativa, decisão baseada em sinais operacionais, comunidade e perfil histórico.",
    },

    metadata: {
      engine: "Home2Flight Source Arbitration Engine",
      version: "0.1.0",
    },
  });
}
