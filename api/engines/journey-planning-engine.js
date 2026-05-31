// /api/engines/journey-planning-engine.js

import { runJourneyPlanningEngine } from "../../lib/engines/journey-planning-engine.js";

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return String(value).toLowerCase() === "true";
}

function getDefaultFlightDate() {
  return new Date().toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  try {
    const flight = String(req.query.flight || "KL1578").toUpperCase();

    const flightDate = req.query.flightDate
      ? String(req.query.flightDate)
      : getDefaultFlightDate();

    const origin = String(req.query.origin || "Lisboa");
    const airport = String(req.query.airport || "LIS").toUpperCase();
    const airline = String(req.query.airline || flight.slice(0, 2)).toUpperCase();
    const terminal = req.query.terminal ? String(req.query.terminal) : "1";

    const transport = String(
      req.query.transport || req.query.mode || "public"
    ).toLowerCase();

    const weather = String(req.query.weather || "normal").toLowerCase();

    const bags = parseBoolean(req.query.bags, true);
    const kids = parseBoolean(req.query.kids, false);
    const checkedIn = parseBoolean(req.query.checkedIn, false);
    const fastTrack = parseBoolean(req.query.fastTrack, false);
    const priorityBoarding = parseBoolean(req.query.priorityBoarding, false);

    const flightType = String(req.query.flightType || "passport");

    const result = await runJourneyPlanningEngine({
      flight,
      flightDate,
      origin,
      airport,
      airline,
      terminal,
      transport,
      weather,
      bags,
      kids,
      checkedIn,
      fastTrack,
      priorityBoarding,
      flightType,
      forceManualTime: false,
      departureTime: null,
    });

    return res.status(200).json({
      ...result,
      engine: "Home2Flight Journey Planning Engine",
      version: "1.9.5-date-first-wrapper",
      generatedAt: new Date().toISOString(),
      requestMode: "date_first_no_manual_time",
      wrapperInput: {
        flight,
        flightDate,
        origin,
        airport,
        airline,
        terminal,
        transport,
        bags,
        kids,
        checkedIn,
        fastTrack,
        priorityBoarding,
        flightType,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      engine: "Home2Flight Journey Planning Engine",
      version: "1.9.5-date-first-wrapper",
      error: error?.message || String(error),
    });
  }
}