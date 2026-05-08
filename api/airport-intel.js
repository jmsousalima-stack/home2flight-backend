export default function handler(req, res) {

  const airport = req.query.airport || "LIS";

  const data = {
    airport,

    reliability: {
      score: 72,
      confidence: "Média",
      source: "Home2Flight Internal Engine",
      lastUpdated: "static-profile"
    },

    timings: {
      security: {
        status: "estimated",
        minutes: 18
      },

      bagDrop: {
        status: "estimated",
        minutes: 12
      },

      passportControl: {
        status: "estimated",
        minutes: 10
      },

      gateWalk: {
        status: "estimated",
        minutes: 14
      }
    },

    alerts: [],

    limitations: [
      "No live airport data yet",
      "No airline-specific bag drop data yet",
      "No real border control integration yet"
    ]
  };

  res.status(200).json(data);
}
