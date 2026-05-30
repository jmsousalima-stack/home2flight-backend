// /api/engines/flight-source-arbitration-engine.js

import { runFlightSourceArbitration } from "../../lib/engines/flight-source-arbitration-engine.js";

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return String(value).toLowerCase() === "true";
}

export default async function handler(req, res) {
  try {
    const flight = String(req.query.flight || "KL1578").toUpperCase();
    const airline = String(req.query.airline || flight.slice(0, 2)).toUpperCase();
    const airport = String(req.query.airport || "LIS").toUpperCase();
    const terminal = String(req.query.terminal || "1");

    const forceManualTime = parseBoolean(req.query.forceManualTime, false);

    const manualDepartureTime =
      req.query.manualDepartureTime ||
      req.query.departureTime ||
      null;

    const result = await runFlightSourceArbitration({
      flight,
      airline,
      airport,
      terminal,
      forceManualTime,
      manualDepartureTime,
      sources: [],
    });

    return res.status(200).json({
      ...result,
      engine: "Home2Flight Flight Source Arbitration Engine",
      version: "1.0.1-wrapper-lib",
      generatedAt: new Date().toISOString(),
      request: {
        flight,
        airline,
        airport,
        terminal,
        forceManualTime,
        manualDepartureTime,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      engine: "Home2Flight Flight Source Arbitration Engine",
      error: error?.message || String(error),
    });
  }
}