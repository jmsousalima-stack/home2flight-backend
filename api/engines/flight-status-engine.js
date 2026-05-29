// /api/engines/flight-status-engine.js

import { getFlightStatusIntelligence } from "../../../lib/engines/flight-status-engine.js";

export default async function handler(req, res) {
  try {
    const flightNumber = String(req.query.flight || "AF1195").toUpperCase();

    const result = await getFlightStatusIntelligence({
      flightNumber,
    });

    return res.status(200).json({
      ...result,
      engine: "Home2Flight Flight Status Engine",
      version: "0.3.2-wrapper-lib",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      engine: "Home2Flight Flight Status Engine",
      error: error.message,
    });
  }
}