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

    const terminal = req.query.terminal ? String(req.query.terminal) : null;

    const flightDate =
      req.query.flightDate ||
      req.query.date ||
      new Date().toISOString().slice(0, 10);

    const debugManualFallback =
      req.query.debugManualFallback === "true" ||
      req.query.debugManualFallback === true;

    const manualDepartureTime =
      debugManualFallback
        ? req.query.manualDepartureTime || req.query.departureTime || null
        : null;

    const result = await getFlightStatusIntelligence({
      flightNumber,
      airline,
      airport,
      terminal,
      flightDate,
      manualDepartureTime,
      departureTime: manualDepartureTime,
      forceManualTime: debugManualFallback,
    });

    return res.status(200).json({
      ...result,
      engine: "Home2Flight Flight Status Engine",
      version: "0.4.3-date-first-wrapper",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      engine: "Home2Flight Flight Status Engine",
      version: "0.4.3-date-first-wrapper",
      error: error?.message || String(error),
    });
  }
}