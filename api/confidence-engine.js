export default function handler(req, res) {
  const {
    liveData = "false",
    communityReports = "false",
    operationalSignals = "false",
    airportRisk = "normal",
    reliabilityScore = "70",
  } = req.query;

  const hasLiveData = liveData === "true";
  const hasCommunityReports = communityReports === "true";
  const hasOperationalSignals = operationalSignals === "true";

  const score = Number(reliabilityScore);

  let confidenceLevel = "medium";
  let confidenceScore = 60;

  const sources = [];
  const weaknesses = [];
  const strengths = [];

  if (hasLiveData) {
    confidenceScore += 20;

    sources.push({
      type: "live_operational_data",
      active: true,
      trustLevel: "high",
    });

    strengths.push(
      "Dados operacionais live aumentam a precisão temporal."
    );
  } else {
    weaknesses.push(
      "Ainda sem integrações oficiais live com aeroportos ou companhias."
    );
  }

  if (hasCommunityReports) {
    confidenceScore += 8;

    sources.push({
      type: "community_reports",
      active: true,
      trustLevel: "medium",
    });

    strengths.push(
      "Reports comunitários ajudam a detetar filas e fricções recentes."
    );
  } else {
    weaknesses.push(
      "Sem reports ativos da comunidade neste momento."
    );
  }

  if (hasOperationalSignals) {
    confidenceScore += 10;

    sources.push({
      type: "operational_intelligence",
      active: true,
      trustLevel: "high",
    });

    strengths.push(
      "Sinais operacionais ajudam a antecipar instabilidade."
    );
  } else {
    weaknesses.push(
      "Sem leitura automática de sinais operacionais externos."
    );
  }

  if (airportRisk === "high") {
    confidenceScore -= 12;

    weaknesses.push(
      "O aeroporto apresenta elevada variabilidade operacional."
    );
  }

  if (score < 40) {
    confidenceScore -= 10;

    weaknesses.push(
      "Plano geral apresenta fiabilidade operacional reduzida."
    );
  }

  confidenceScore = Math.max(0, Math.min(100, confidenceScore));

  if (confidenceScore >= 80) {
    confidenceLevel = "high";
  } else if (confidenceScore >= 55) {
    confidenceLevel = "medium";
  } else {
    confidenceLevel = "low";
  }

  res.status(200).json({
    confidence: {
      level: confidenceLevel,
      score: confidenceScore,

      explanation: {
        strengths,
        weaknesses,
      },

      sourceBreakdown: {
        liveData: hasLiveData,
        communityReports: hasCommunityReports,
        operationalSignals: hasOperationalSignals,
      },

      sources,
    },

    metadata: {
      engine: "Home2Flight Confidence Engine",
      version: "0.1.0",
    },
  });
}
