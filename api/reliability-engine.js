export function calculateReliability({
  airportRisk = "normal",
  flightStatus = "scheduled",
  hasLiveData = false,
  alerts = [],
  operationalSignals = [],
  userContext = {},
}) {
  let score = 86;

  const adjustments = [];

  if (airportRisk === "high") {
    score -= 15;
    adjustments.push({
      factor: "airport_risk",
      impact: -15,
      reason: "Aeroporto com maior complexidade operacional",
    });
  }

  if (airportRisk === "medium") {
    score -= 8;
    adjustments.push({
      factor: "airport_risk",
      impact: -8,
      reason: "Aeroporto com complexidade moderada",
    });
  }

  if (flightStatus === "delayed") {
    score -= 5;
    adjustments.push({
      factor: "flight_status",
      impact: -5,
      reason: "Voo com atraso operacional",
    });
  }

  if (flightStatus === "cancelled") {
    score -= 35;
    adjustments.push({
      factor: "flight_status",
      impact: -35,
      reason: "Voo cancelado",
    });
  }

  if (!hasLiveData) {
    score -= 10;
    adjustments.push({
      factor: "live_data",
      impact: -10,
      reason: "Ainda sem integrações oficiais live",
    });
  }

  const alertImpact = alerts.reduce((sum, alert) => {
    return sum + (alert.impactMinutes || 0);
  }, 0);

  if (alertImpact >= 20) {
    score -= 10;
    adjustments.push({
      factor: "alerts",
      impact: -10,
      reason: "Alertas operacionais relevantes ativos",
    });
  }

  const operationalImpact = operationalSignals.reduce((sum, signal) => {
    return sum + (signal.impactMinutes || 0);
  }, 0);

  if (operationalImpact >= 30) {
    score -= 12;
    adjustments.push({
      factor: "operational_intelligence",
      impact: -12,
      reason: "Sinais operacionais relevantes aumentam a incerteza",
    });
  } else if (operationalImpact >= 10) {
    score -= 6;
    adjustments.push({
      factor: "operational_intelligence",
      impact: -6,
      reason: "Sinais operacionais moderados detetados",
    });
  }

  if (userContext.kids) {
    score -= 3;
    adjustments.push({
      factor: "kids",
      impact: -3,
      reason: "Viagem com crianças aumenta variabilidade",
    });
  }

  if (userContext.transport === "public") {
    score -= 4;
    adjustments.push({
      factor: "transport",
      impact: -4,
      reason: "Dependência de transportes públicos",
    });
  }

  if (score > 96) score = 96;
  if (score < 15) score = 15;

  let confidence = "Baixa";

  if (score >= 80) {
    confidence = "Alta";
  } else if (score >= 65) {
    confidence = "Média";
  }

  let riskLevel = "high";

  if (score >= 80) {
    riskLevel = "low";
  } else if (score >= 65) {
    riskLevel = "normal";
  }

  return {
    score,
    confidence,
    riskLevel,

    explanation: {
      summary:
        "Pontuação calculada com base em aeroporto, voo, alertas, sinais operacionais e contexto do utilizador.",
      liveDataActive: hasLiveData,
      alertImpactMinutes: alertImpact,
      operationalImpactMinutes: operationalImpact,
      adjustmentCount: adjustments.length,
    },

    adjustments,
  };
}
