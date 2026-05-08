export function calculateReliability({
  airportRisk = "normal",
  flightStatus = "scheduled",
  hasLiveData = false,
  alerts = [],
  userContext = {},
}) {

  let score = 82;

  const adjustments = [];

  // AIRPORT RISK

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

  // FLIGHT STATUS

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

  // LIVE DATA

  if (!hasLiveData) {
    score -= 10;

    adjustments.push({
      factor: "live_data",
      impact: -10,
      reason: "Ainda sem integrações oficiais live",
    });
  }

  // ALERTS

  const totalAlertImpact = alerts.reduce((acc, alert) => {
    return acc + (alert.impactMinutes || 0);
  }, 0);

  if (totalAlertImpact >= 20) {
    score -= 10;

    adjustments.push({
      factor: "alerts",
      impact: -10,
      reason: "Alertas operacionais relevantes ativos",
    });
  }

  // USER CONTEXT

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

  // LIMITS

  if (score > 96) score = 96;
  if (score < 15) score = 15;

  // CONFIDENCE

  let confidence = "Baixa";

  if (score >= 80) {
    confidence = "Alta";
  } else if (score >= 65) {
    confidence = "Média";
  }

  // RISK LEVEL

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
        "Pontuação calculada com base em aeroporto, estado operacional do voo, alertas ativos e contexto do utilizador.",

      liveDataActive: hasLiveData,

      adjustmentCount: adjustments.length,
    },

    adjustments,
  };
}
