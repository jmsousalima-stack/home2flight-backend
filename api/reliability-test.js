import { calculateReliability } from "./reliability-engine.js";

export default function handler(req, res) {

  const result = calculateReliability({
    airportRisk: "high",
    flightStatus: "delayed",

    hasLiveData: false,

    alerts: [
      {
        type: "security_delay",
        impactMinutes: 25,
      },
    ],

    userContext: {
      kids: true,
      transport: "public",
    },
  });

  return res.status(200).json({
    scenario: "Stress test — aeroporto complexo + atraso + alertas",

    reliability: result,

    metadata: {
      engine: "Home2Flight Reliability Engine",
      version: "0.5.0",
    },
  });
}
