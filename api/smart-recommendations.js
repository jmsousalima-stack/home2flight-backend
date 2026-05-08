export default function handler(req, res) {
  const {
    reliabilityScore = "70",
    riskLevel = "normal",
    transport = "car",
    bags = "false",
    kids = "false",
    checkedIn = "false",
    airport = "LIS",
  } = req.query;

  const score = Number(reliabilityScore);
  const hasBags = bags === "true";
  const hasKids = kids === "true";
  const isCheckedIn = checkedIn === "true";

  const recommendations = [];

  if (!isCheckedIn) {
    recommendations.push({
      type: "check_in",
      priority: "high",
      title: "Faz o check-in online antes de sair",
      reason:
        "Reduz incerteza no aeroporto e pode evitar filas ou balcões desnecessários.",
    });
  }

  if (hasBags) {
    recommendations.push({
      type: "bag_drop",
      priority: "medium",
      title: "Confirma o balcão de bag drop",
      reason:
        "Viajar com mala de porão aumenta o risco de perda de tempo no aeroporto.",
    });
  }

  if (hasKids) {
    recommendations.push({
      type: "family_margin",
      priority: "medium",
      title: "Mantém uma margem extra para as crianças",
      reason:
        "Com crianças, pequenas paragens e imprevistos acumulam facilmente vários minutos.",
    });
  }

  if (transport === "public" && riskLevel === "high") {
    recommendations.push({
      type: "transport_change",
      priority: "high",
      title: "Considera Uber/táxi em vez de transportes públicos",
      reason:
        "Com risco operacional elevado, reduzir variáveis no trajeto melhora a fiabilidade do plano.",
    });
  }

  if (score < 45) {
    recommendations.push({
      type: "critical_plan",
      priority: "critical",
      title: "Evita qualquer paragem antes do aeroporto",
      reason:
        "A margem operacional está frágil. O plano deve ser executado sem desvios.",
    });
  } else if (score < 70) {
    recommendations.push({
      type: "monitor_alerts",
      priority: "high",
      title: "Mantém atenção aos alertas",
      reason:
        "A fiabilidade do plano é média/baixa e pode mudar com novos sinais operacionais.",
    });
  }

  if (airport === "CDG") {
    recommendations.push({
      type: "complex_airport",
      priority: "medium",
      title: "Evita chegar ao limite neste aeroporto",
      reason:
        "CDG é um aeroporto complexo, com deslocações internas e variabilidade operacional elevadas.",
    });
  }

  res.status(200).json({
    airport,

    input: {
      reliabilityScore: score,
      riskLevel,
      transport,
      bags: hasBags,
      kids: hasKids,
      checkedIn: isCheckedIn,
    },

    recommendations,

    summary: {
      count: recommendations.length,
      highestPriority:
        recommendations.find((item) => item.priority === "critical")
          ? "critical"
          : recommendations.find((item) => item.priority === "high")
          ? "high"
          : recommendations.find((item) => item.priority === "medium")
          ? "medium"
          : "low",
    },

    metadata: {
      engine: "Home2Flight Smart Recommendation Engine",
      version: "0.1.0",
    },
  });
}
