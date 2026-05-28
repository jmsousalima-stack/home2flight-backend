// /api/engines/reliability-arbitration-engine.js

import { runReliabilityArbitration } from "../../../lib/engines/reliability-arbitration-engine.js";

export default async function handler(req, res) {
  try {
    const signals = Array.isArray(req.body?.signals)
      ? req.body.signals
      : [];

    const result = runReliabilityArbitration({
      signals,
    });

    return res.status(200).json({
      ...result,
      engine: "Home2Flight Reliability Arbitration Engine",
      version: "1.1.0-wrapper-lib",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      engine: "Home2Flight Reliability Arbitration Engine",
      error: error.message,
    });
  }
}