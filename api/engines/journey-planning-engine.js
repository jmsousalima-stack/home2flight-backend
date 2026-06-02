// /api/engines/journey-planning-engine.js

import { runJourneyPlanningEngine } from "../../lib/engines/journey-planning-engine.js";

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
}

export default async function handler(req, res) {
  try {
    const flight = String(req.query.flight || "KL1578").toUpperCase();
    const flightDate = String(
      req.query.flightDate || new Date().toISOString().slice(0, 10)
    );

    const origin = String(req.query.origin || "Lisboa");
    const airport = String(req.query.airport || "LIS").toUpperCase();
    const airline = String(req.query.airline || flight.slice(0, 2)).toUpperCase();
    const terminal = String(req.query.terminal || "1");

    const transport = String(
      req.query.transport || req.query.mode || "public"
    ).toLowerCase();

    const weather = String(req.query.weather || "normal").toLowerCase();

    const result = await runJourneyPlanningEngine({
      flight,
      flightDate,
      origin,
      airport,
      airline,
      terminal,
      transport,
      weather,
      bags: parseBoolean(req.query.bags, true),
      kids: parseBoolean(req.query.kids, false),
      checkedIn: parseBoolean(req.query.checkedIn, false),
      fastTrack: parseBoolean(req.query.fastTrack, false),
      priorityBoarding: parseBoolean(req.query.priorityBoarding, false),
      flightType: String(req.query.flightType || "passport"),
      forceManualTime: false,
      departureTime: null,
    });

    return res.status(200).json({
      ...result,
      engine: "Home2Flight Journey Planning Engine",
      version: "1.9.6-date-first-event-aware-wrapper",
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
        bags: parseBoolean(req.query.bags, true),
        kids: parseBoolean(req.query.kids, false),
        checkedIn: parseBoolean(req.query.checkedIn, false),
        fastTrack: parseBoolean(req.query.fastTrack, false),
        priorityBoarding: parseBoolean(req.query.priorityBoarding, false),
        flightType: String(req.query.flightType || "passport"),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      engine: "Home2Flight Journey Planning Engine",
      version: "1.9.6-date-first-event-aware-wrapper",
      error: error?.message || String(error),
    });
  }
}