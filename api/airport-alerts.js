export default function handler(req, res) {
  const airport = (req.query.airport || "LIS").toUpperCase();

  const alertsByAirport = {
    LIS: [],
    AMS: [
      {
        type: "congestion",
        severity: "medium",
        title: "Possível maior movimento no aeroporto",
        impactMinutes: 10,
        source: "Home2Flight Alerts Engine",
        verified: false
      }
    ],
    CDG: [
      {
        type: "complex_airport",
        severity: "high",
        title: "Aeroporto complexo com maior incerteza operacional",
        impactMinutes: 20,
        source: "Home2Flight Airport Profile",
        verified: true
      }
    ]
  };

  const alerts = alertsByAirport[airport] || [];

  res.status(200).json({
    airport,
    alerts,
    summary: {
      hasAlerts: alerts.length > 0,
      totalImpactMinutes: alerts.reduce(
        (sum, alert) => sum + alert.impactMinutes,
        0
      )
    },
    metadata: {
      engine: "Home2Flight Airport Alerts Engine",
      version: "0.1.0"
    }
  });
}
