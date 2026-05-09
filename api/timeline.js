export default async function handler(req, res) {
  const timeline = [
    {
      id: 1,
      time: "2026-05-08T10:31:00.000Z",
      title: "Preparar documentos e essenciais",
      category: "Preparation",
      status: "ready",
      confidence: "Preparation",
      source: "Preparation",
      buffer: "Prep",
      level: "low",
      reasoning:
        "Tempo recomendado para preparação inicial antes da saída.",
      operationalSignals: [],
    },

    {
      id: 2,
      time: "2026-05-08T11:01:00.000Z",
      title: "Confirmar check-in online",
      category: "Flight",
      status: "ready",
      confidence: "Flight",
      source: "Flight data",
      buffer: "Pending",
      level: "low",
      reasoning:
        "Verificação final do estado do voo e documentação digital.",
      operationalSignals: [
        {
          type: "flight_status",
          severity: "medium",
          label: "Atraso operacional detetado",
        },
      ],
    },

    {
      id: 3,
      time: "2026-05-08T12:01:00.000Z",
      title: "Sair de casa",
      category: "Transport",
      status: "buffer",
      confidence: "Transport",
      source: "Route engine",
      buffer: "+25m",
      level: "medium",
      reasoning:
        "Hora calculada considerando transporte, buffers dinâmicos e margem operacional.",
      operationalSignals: [
        {
          type: "traffic",
          severity: "medium",
          label: "Margem dinâmica aplicada",
        },
      ],
    },

    {
      id: 4,
      time: "2026-05-08T13:06:00.000Z",
      title: "Chegar ao aeroporto",
      category: "Airport",
      status: "risk",
      confidence: "Airport intel",
      source: "Operational profile",
      buffer: "+25m",
      level: "high",
      reasoning:
        "Chegada recomendada baseada em filas, deslocações internas, segurança e risco operacional.",
      operationalSignals: [
        {
          type: "security_queue",
          severity: "high",
          label: "Fila de segurança longa",
        },
        {
          type: "airport_complexity",
          severity: "medium",
          label: "Terminal com elevada variabilidade",
        },
      ],
    },

    {
      id: 5,
      time: "2026-05-08T16:40:00.000Z",
      title: "Partida do voo",
      category: "Flight",
      status: "ready",
      confidence: "Flight",
      source: "Flight data",
      buffer: "Pending",
      level: "low",
      reasoning:
        "Hora programada atualmente pela companhia aérea.",
      operationalSignals: [],
    },
  ];

  res.status(200).json({
    success: true,
    generatedAt: new Date().toISOString(),
    engine: "Home2Flight Operational Timeline Engine",
    timeline,
  });
}
