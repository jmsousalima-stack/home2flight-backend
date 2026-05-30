// /api/engines/flight-status-engine.js

import { getFlightStatusIntelligence } from "../../lib/engines/flight-status-engine.js";

export default async function handler(req, res) {
  try {
    const flightNumber = String(req.query.flight || "AF1195").toUpperCase();
    const airline = req.query.airline
      ? String(req.query.airline).toUpperCase()
      : flightNumber.slice(0, 2);

    const airport = req.query.airport
      ? String(req.query.airport).toUpperCase()
      : null;

    const terminal = req.query.terminal
      ? String(req.query.terminal)
      : null;

    const manualDepartureTime =
      req.query.manualDepartureTime ||
      req.query.departureTime ||
      null;

    const forceManualTime =
      req.query.forceManualTime === "true" ||
      req.query.forceManualTime === true;

    const result = await getFlightStatusIntelligence({
      flightNumber,
      flight: flightNumber,
      airline,
      airport,
      terminal,
      manualDepartureTime,
      departureTime: manualDepartureTime,
      forceManualTime,
    });

    return res.status(200).json({
      ...result,
      engine: "Home2Flight Flight Status Engine",
      version: "0.4.2-wrapper-context-aware",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      engine: "Home2Flight Flight Status Engine",
      version: "0.4.2-wrapper-context-aware",
      error: error?.message || String(error),
    });
  }
}