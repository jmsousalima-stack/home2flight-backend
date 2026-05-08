export default function handler(req, res) {
  const airport = (req.query.airport || "LIS").toUpperCase();

  const reportsByAirport = {
    LIS: [
      {
        type: "security_queue",
        severity: "low",
        title: "Fila de segurança dentro do normal",
        reportedMinutesAgo: 18,
        confidence: "medium",
        impactMinutes: 0,
        source: "community_report",
        verified: false
      }
    ],

    AMS: [
      {
        type: "security_queue",
        severity: "medium",
        title: "Fila de segurança acima do normal",
        reportedMinutesAgo: 22,
        confidence: "medium",
        impactMinutes: 10,
        source: "community_report",
        verified: false
      }
    ],

    CDG: [
      {
        type: "terminal_movement",
        severity: "medium",
        title: "Deslocações internas demoradas reportadas",
        reportedMinutesAgo: 35,
        confidence: "medium",
        impactMinutes: 12,
        source: "community_report",
        verified: false
      },
      {
        type: "security_queue",
        severity: "high",
        title: "Fila de segurança longa reportada",
        reportedMinutesAgo: 14,
        confidence: "medium",
        impactMinutes: 18,
        source: "community_report",
        verified: false
      }
    ],

    DXB: [
      {
        type: "gate_walk",
        severity: "medium",
        title: "Portas distantes reportadas por utilizadores",
        reportedMinutesAgo: 41,
        confidence: "medium",
        impactMinutes: 12,
        source: "community_report",
        verified: false
      }
    ]
  };

  const reports = reportsByAirport[airport] || [];

  const totalImpactMinutes = reports.reduce(
    (sum, report) => sum + report.impactMinutes,
    0
  );

  res.status(200).json({
    airport,

    communityIntelligence: {
      hasReports: reports.length > 0,
      reportCount: reports.length,
      totalImpactMinutes,
      freshness:
        reports.length > 0
          ? "recent-community-signals"
          : "no-community-signals",
      confidence:
        reports.length >= 2
          ? "medium"
          : reports.length === 1
          ? "low-medium"
          : "low"
    },

    reports,

    limitations: [
      "Reports ainda são simulados.",
      "Ainda sem sistema real de submissão por utilizadores.",
      "Ainda sem validação cruzada por múltiplos utilizadores.",
      "Ainda sem deteção automática de abuso ou falsos reports."
    ],

    metadata: {
      engine: "Home2Flight Community Intelligence Engine",
      version: "0.1.0"
    }
  });
}
