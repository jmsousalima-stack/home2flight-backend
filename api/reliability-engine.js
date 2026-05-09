export function calculateReliability({
  airportRisk = "normal",
  flightStatus = "scheduled",
  hasLiveData = false,
  alerts = [],
  operationalSignals = [],
  userContext = {},
}) {
  let score = 100;

  const adjustments = [];

  function applyAdjustment(factor, impact, reason) {
    score += impact;

    adjustments.push({
      factor,
      impact,
      reason,
    });
  }

  if (airportRisk === "high") {
    applyAdjustment(
      "airport_risk",
      -15,
      "Aeroporto com maior complexidade operacional"
    );
  }

  if (airportRisk === "medium") {
    applyAdjustment(
      "airport_risk",
      -8,
      "Aeroporto com variabilidade operacional moderada"
    );
  }

  if (flightStatus === "delayed") {
    applyAdjustment(
      "flight_status",
      -5,
      "Voo com atraso operacional"
    );
  }

  if (!hasLiveData) {
    applyAdjustment(
      "live_data",
      -10,
      "Ainda sem integrações oficiais live"
    );
  }

  const highAlerts = alerts.filter(
    (alert) => alert.severity === "high"
  );

  const mediumAlerts = alerts.filter(
    (alert) => alert.severity === "medium"
  );

  if (highAlerts.length > 0) {
    applyAdjustment(
      "alerts",
      -10,
      "Alertas operacionais relevantes ativos"
    );
  }

  if (mediumAlerts.length > 0) {
    applyAdjustment(
      "alerts",
      -5,
      "Sinais operacionais moderados ativos"
    );
  }

  const verifiedOperationalSignals = operationalSignals.filter(
    (signal) => signal.verified === true
  );

  if (verifiedOperationalSignals.length > 0) {
    applyAdjustment(
      "operational_intelligence",
      -12,
      "Sinais operacionais relevantes aumentam a incerteza"
    );
  }

  if (userContext.kids) {
    applyAdjustment(
      "kids",
      -3,
      "Viagem com crianças aumenta variabilidade"
    );
  }

  if (userContext.transport === "public") {
    applyAdjustment(
      "transport",
      -4,
      "Dependência de transportes públicos"
    );
  }

  score = Math.max(0, Math.min(100, score));

  let confidence = "Alta";
  let riskLevel = "low";

  if (score < 75) {
    confidence = "Média";
    riskLevel = "normal";
  }

  if (score < 50) {
    confidence = "Baixa";
    riskLevel = "high";
  }

  return {
    score,
    confidence,
    riskLevel,

    explanation: {
      summary:
        "Pontuação calculada com base em aeroporto, voo, alertas, sinais operacionais e contexto do utilizador.",
      liveDataActive: hasLiveData,
      adjustmentCount: adjustments.length,
    },

    adjustments,
  };
}

export default function handler(req, res) {
  const reliability = calculateReliability({
    airportRisk: "high",
    flightStatus: "delayed",
    hasLiveData: false,
    alerts: [
      {
        severity: "high",
      },
    ],
    operationalSignals: [
      {
        verified: true,
      },
    ],
    userContext: {
      kids: true,
      transport: "public",
    },
  });

  res.status(200).json({
    scenario:
      "Stress test — aeroporto complexo + atraso + alertas",
    reliability,

    metadata: {
      engine: "Home2Flight Reliability Engine",
      version: "0.6.0",
    },
  });
}
