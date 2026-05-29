// /api/engines/event-disruption-engine.js

import { getEventDisruptionIntelligence } from "../../lib/engines/event-disruption-engine.js";

export default async function handler(req, res) {
  try {
    const {
      origin = "Lisboa",
      airport = "LIS",
      mode = "car",
      flightDate = null,
    } = req.query;

    const result = await getEventDisruptionIntelligence({
      origin,
      airport,
      mode,
      flightDate,
    });

    return res.status(200).json({
      ...result,
      engine: "Home2Flight Event & Disruption Intelligence Engine",
      version: "0.1.2-wrapper-lib",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      engine: "Home2Flight Event & Disruption Intelligence Engine",
      error: error.message,
    });
  }
}