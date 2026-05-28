// /api/engines/buffer-governance-engine.js

import { runBufferGovernance } from "../../../lib/engines/buffer-governance-engine.js";

export default async function handler(req, res) {
  try {
    const signals = Array.isArray(req.body?.signals)
      ? req.body.signals
      : [];

    const profile = {
      bags: Boolean(req.body?.profile?.bags),
      kids: Boolean(req.body?.profile?.kids),
      checkedIn: Boolean(req.body?.profile?.checkedIn),
      fastTrack: Boolean(req.body?.profile?.fastTrack),
      priorityBoarding: Boolean(req.body?.profile?.priorityBoarding),
      flightType: req.body?.profile?.flightType || "schengen",
      transport: req.body?.profile?.transport || "car",
    };

    const result = runBufferGovernance({
      signals,
      profile,
    });

    return res.status(200).json({
      ...result,
      engine: "Home2Flight Buffer Governance Engine",
      version: "1.0.1-wrapper-lib",
      generatedAt: new Date().toISOString(),
      profile,
      recommendations: [],
      limitations: [
        "Motor migrado para /lib/engines.",
        "Ainda sem calibração histórica real por aeroporto/companhia.",
        "Ainda sem aprendizagem automática baseada em previsão vs realidade.",
      ],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      engine: "Home2Flight Buffer Governance Engine",
      error: error.message,
    });
  }
}