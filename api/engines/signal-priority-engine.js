// /api/engines/signal-priority-engine.js

import { runSignalPriorityEngine } from "../../../lib/engines/signal-priority-engine.js";

export default async function handler(req, res) {
  try {
    const inputSignals = Array.isArray(req.body?.signals)
      ? req.body.signals
      : [];

    const result = runSignalPriorityEngine({
      signals: inputSignals,
    });

    return res.status(200).json({
      ...result,
      engine: "Home2Flight Signal Priority Engine",
      version: "1.2.0-wrapper-lib",
      generatedAt: new Date().toISOString(),

      limitations: [
        "Motor migrado para /lib/engines.",
        "Ainda sem aprendizagem histórica baseada em previsão vs realidade.",
        "Ainda sem personalização por aeroporto, companhia e utilizador.",
      ],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      engine: "Home2Flight Signal Priority Engine",
      error: error.message,
    });
  }
}