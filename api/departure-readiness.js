export default function handler(req, res) {
  const {
    minutesUntilFlight = "240",
    leaveHomeMinutesBeforeDeparture = "180",
    checkedIn = "false",
    bags = "false",
    kids = "false",
    riskLevel = "normal",
  } = req.query;

  const minutesToFlight = Number(minutesUntilFlight);
  const leaveBuffer = Number(leaveHomeMinutesBeforeDeparture);

  const isCheckedIn = checkedIn === "true";
  const hasBags = bags === "true";
  const hasKids = kids === "true";

  const minutesUntilRecommendedLeave = minutesToFlight - leaveBuffer;

  const warnings = [];
  const actions = [];

  let readinessScore = 85;
  let status = "on_track";

  if (!isCheckedIn) {
    readinessScore -= 15;
    actions.push({
      type: "check_in",
      priority: "high",
      title: "Fazer check-in online",
      reason: "Reduz incerteza e evita perdas de tempo no aeroporto.",
    });
  }

  if (hasBags) {
    readinessScore -= 8;
    actions.push({
      type: "bag_drop",
      priority: "medium",
      title: "Confirmar bag drop",
      reason: "Vai precisar de margem adicional no aeroporto.",
    });
  }

  if (hasKids) {
    readinessScore -= 5;
    actions.push({
      type: "kids_preparation",
      priority: "medium",
      title: "Preparar documentos e extras das crianças",
      reason: "Crianças aumentam variabilidade na saída e nos controlos.",
    });
  }

  if (riskLevel === "high") {
    readinessScore -= 18;
    warnings.push({
      type: "high_risk",
      severity: "high",
      title: "Margem operacional sensível",
      reason: "O plano tem risco elevado. Evita atrasar a saída.",
    });
  }

  if (minutesUntilRecommendedLeave <= 0) {
    status = "leave_now";
    warnings.push({
      type: "leave_now",
      severity: "critical",
      title: "Deves sair agora",
      reason: "Já atingiste ou ultrapassaste a hora recomendada de saída.",
    });
  } else if (minutesUntilRecommendedLeave <= 30) {
    status = "prepare_to_leave";
    warnings.push({
      type: "prepare_to_leave",
      severity: "medium",
      title: "Começa a preparar a saída",
      reason: "Faltam menos de 30 minutos para a hora recomendada de saída.",
    });
  }

  if (readinessScore > 96) readinessScore = 96;
  if (readinessScore < 10) readinessScore = 10;

  let readinessLabel = "Boa";

  if (readinessScore < 70) readinessLabel = "Atenção";
  if (readinessScore < 50) readinessLabel = "Crítica";

  res.status(200).json({
    readiness: {
      score: readinessScore,
      label: readinessLabel,
      status,
      minutesUntilRecommendedLeave,
    },

    context: {
      minutesUntilFlight: minutesToFlight,
      leaveHomeMinutesBeforeDeparture: leaveBuffer,
      checkedIn: isCheckedIn,
      bags: hasBags,
      kids: hasKids,
      riskLevel,
    },

    actions,

    warnings,

    recommendation: {
      headline:
        status === "leave_now"
          ? "Sai agora"
          : status === "prepare_to_leave"
          ? "Prepara-te para sair"
          : "Plano dentro da margem",

      message:
        status === "leave_now"
          ? "A margem recomendada já foi atingida. O melhor é sair imediatamente."
          : status === "prepare_to_leave"
          ? "Ainda tens alguma margem, mas deves começar a fechar tudo para sair."
          : "O plano está dentro da margem prevista. Mantém atenção aos alertas.",
    },

    metadata: {
      engine: "Home2Flight Departure Readiness Engine",
      version: "0.1.0",
    },
  });
}
