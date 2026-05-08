export default async function handler(req, res) {
  const {
    flight = "AF1195",
    departureTime = "2026-05-08T16:40:00",
    airportArrivalMinutesBeforeDeparture = "214",
    leaveHomeMinutesBeforeDeparture = "279",
    reliabilityScore = "27",
    riskLevel = "high",
  } = req.query;

  const departureDate = new Date(departureTime);

  const airportArrivalDate = new Date(
    departureDate.getTime() -
      Number(airportArrivalMinutesBeforeDeparture) * 60000
  );

  const leaveHomeDate = new Date(
    departureDate.getTime() -
      Number(leaveHomeMinutesBeforeDeparture) * 60000
  );

  const checkInRecommendationDate = new Date(
    leaveHomeDate.getTime() - 3600000
  );

  const preparationDate = new Date(
    leaveHomeDate.getTime() - 5400000
  );

  let readinessLabel = "Confortável";

  if (Number(reliabilityScore) < 70) {
    readinessLabel = "Sensível";
  }

  if (Number(reliabilityScore) < 45) {
    readinessLabel = "Crítica";
  }

  res.status(200).json({
    flight,

    decision: {
      status: readinessLabel,
      reliabilityScore: Number(reliabilityScore),
      riskLevel,

      headline:
        readinessLabel === "Crítica"
          ? "Plano com margem operacional frágil"
          : readinessLabel === "Sensível"
          ? "Plano requer atenção operacional"
          : "Plano operacional confortável",

      recommendation:
        readinessLabel === "Crítica"
          ? "Recomendada saída antecipada e monitorização contínua."
          : readinessLabel === "Sensível"
          ? "Monitorizar alertas e evitar atrasos adicionais."
          : "Plano dentro da margem operacional prevista.",
    },

    timeline: [
      {
        step: "prepare_documents",
        title: "Preparar documentos e essenciais",
        recommendedTime: preparationDate.toISOString(),
        category: "preparation",
      },

      {
        step: "online_checkin",
        title: "Confirmar check-in online",
        recommendedTime: checkInRecommendationDate.toISOString(),
        category: "flight",
      },

      {
        step: "leave_home",
        title: "Sair de casa",
        recommendedTime: leaveHomeDate.toISOString(),
        category: "transport",
      },

      {
        step: "arrive_airport",
        title: "Chegar ao aeroporto",
        recommendedTime: airportArrivalDate.toISOString(),
        category: "airport",
      },

      {
        step: "departure",
        title: "Partida do voo",
        recommendedTime: departureDate.toISOString(),
        category: "flight",
      },
    ],

    summary: {
      departureTime: departureDate.toISOString(),
      leaveHomeTime: leaveHomeDate.toISOString(),
      airportArrivalTime: airportArrivalDate.toISOString(),
    },

    reliability: {
      score: Number(reliabilityScore),
      riskLevel,
    },

    metadata: {
      engine: "Home2Flight Travel Plan Engine",
      version: "0.2.0",
    },
  });
}
