export default function handler(req, res) {
  const generatedAt = new Date().toISOString();

  const flight = {
    number: "AF1195",
    airline: "Air France",
    status: "delayed",
    route: {
      from: {
        code: "LIS",
        name: "Lisboa Humberto Delgado",
        country: "Portugal",
      },
      to: {
        code: "CDG",
        name: "Paris Charles de Gaulle",
        country: "France",
      },
    },
    departure: {
      scheduled: "2026-05-08T16:40:00.000Z",
    },
  };

  const timeline = [
    {
      id: 1,
      time: "2026-05-08T10:31:00.000Z",
      title: "Preparar documentos e essenciais",
      category: "Preparation",
      status: "ready",
      confidence: "Preparation",
      confidenceScore: 88,
      trustLevel: "high",
      source: "User checklist",
      sourceType: "user_context",
      buffer: "Prep",
      lastUpdatedMinutesAgo: 2,
      recalculationStatus: "stable",
      liveInsight: "Preparação inicial validada com margem confortável.",
      reasoning: "Tempo recomendado para preparação inicial antes da saída.",
      intelligenceFlags: [
        {
          type: "user_readiness",
          label: "Checklist pessoal",
          severity: "low",
        },
      ],
      operationalSignals: [],
    },
    {
      id: 2,
      time: "2026-05-08T11:01:00.000Z",
      title: "Confirmar check-in online",
      category: "Flight",
      status: "ready",
      confidence: "Flight",
      confidenceScore: 76,
      trustLevel: "medium",
      source: "Flight data",
      sourceType: "flight_engine",
      buffer: "Pending",
      lastUpdatedMinutesAgo: 2,
      recalculationStatus: "monitoring",
      liveInsight: "Estado do voo em vigilância por atraso operacional.",
      reasoning: "Verificação final do estado do voo e documentação digital.",
      intelligenceFlags: [
        {
          type: "flight_status",
          label: "Atraso operacional detetado",
          severity: "medium",
        },
      ],
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
      confidenceScore: 71,
      trustLevel: "medium",
      source: "Route engine",
      sourceType: "route_engine",
      buffer: "+25m",
      lastUpdatedMinutesAgo: 2,
      recalculationStatus: "recalculated",
      liveInsight: "Hora recalculada com margem dinâmica para transporte público.",
      reasoning:
        "Hora calculada considerando transporte, buffers dinâmicos e margem operacional.",
      intelligenceFlags: [
        {
          type: "traffic",
          label: "Margem dinâmica aplicada",
          severity: "medium",
        },
        {
          type: "public_transport",
          label: "Dependência de transporte público",
          severity: "medium",
        },
      ],
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
      confidenceScore: 64,
      trustLevel: "medium",
      source: "Operational profile",
      sourceType: "airport_profile",
      buffer: "+25m",
      lastUpdatedMinutesAgo: 2,
      recalculationStatus: "risk_adjusted",
      liveInsight:
        "Chegada antecipada por variabilidade elevada em segurança e deslocações internas.",
      reasoning:
        "Chegada recomendada baseada em filas, deslocações internas, segurança e risco operacional.",
      intelligenceFlags: [
        {
          type: "security_queue",
          label: "Fila de segurança longa",
          severity: "high",
        },
        {
          type: "airport_complexity",
          label: "Terminal com elevada variabilidade",
          severity: "medium",
        },
        {
          type: "gate_walk",
          label: "Deslocação interna prolongada",
          severity: "medium",
        },
      ],
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
      confidenceScore: 79,
      trustLevel: "medium",
      source: "Flight data",
      sourceType: "flight_engine",
      buffer: "Pending",
      lastUpdatedMinutesAgo: 2,
      recalculationStatus: "monitoring",
      liveInsight: "Hora programada pela companhia ainda sujeita a validação.",
      reasoning: "Hora programada atualmente pela companhia aérea.",
      intelligenceFlags: [
        {
          type: "flight_monitoring",
          label: "Estado do voo em monitorização",
          severity: "low",
        },
      ],
      operationalSignals: [],
    },
  ];

  res.status(200).json({
    success: true,
    generatedAt,
    engine: "Home2Flight Operational Timeline Engine",
    version: "0.8.0",
    flight,
    timeline,
    intelligenceSummary: {
      status: "active",
      recalculationStatus: "risk_adjusted",
      globalConfidenceScore: 74,
      globalTrustLevel: "medium",
      liveDataActive: false,
      operationalRisk: "high",
      summary:
        "Timeline recalculada com base em voo, transporte, perfil aeroportuário, buffers e sinais operacionais.",
      limitations: [
        "Integração live de filas de segurança ainda pendente.",
        "Inteligência específica por companhia aérea ainda em expansão.",
        "Sinais comunitários ainda em fase beta.",
      ],
    },
  });
}
