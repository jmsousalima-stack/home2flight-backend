// /api/engines/journey-planning-engine.js

import {
  runJourneyPlanningEngine,
  parseJourneyPlanningRequest,
} from "../../lib/engines/journey-planning-engine.js";

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
}

export default async function handler(req, res) {
  try {
    const parsedRequest = parseJourneyPlanningRequest(req.query);

    const flight = String(req.query.flight || parsedRequest.flight || "KL1578").toUpperCase();
    const flightDate = String(
      req.query.flightDate ||
        parsedRequest.flightDate ||
        new Date().toISOString().slice(0, 10)
    );

    const origin = String(req.query.origin || parsedRequest.origin || "Lisboa");
    const airport = String(req.query.airport || parsedRequest.airport || "LIS").toUpperCase();
    const destinationAirport = req.query.destinationAirport
      ? String(req.query.destinationAirport).toUpperCase()
      : null;

    const airline = String(
      req.query.airline || parsedRequest.airline || flight.slice(0, 2)
    ).toUpperCase();

    const terminal = String(req.query.terminal || parsedRequest.terminal || "1");

    const transport = String(
      req.query.transport || req.query.mode || parsedRequest.transport || "public"
    ).toLowerCase();

    const weather = String(req.query.weather || parsedRequest.weather || "normal").toLowerCase();

    const forceManualTime = parseBoolean(req.query.forceManualTime, false);

    const departureTime =
      forceManualTime && req.query.departureTime
        ? String(req.query.departureTime)
        : "";

    const engineInput = {
      flight,
      flightDate,
      origin,
      airport,
      destinationAirport,
      airline,
      terminal,
      transport,
      weather,
      bags: parseBoolean(req.query.bags, true),
      kids: parseBoolean(req.query.kids, false),
      checkedIn: parseBoolean(req.query.checkedIn, false),
      fastTrack: parseBoolean(req.query.fastTrack, false),
      priorityBoarding: parseBoolean(req.query.priorityBoarding, false),
      flightType: String(req.query.flightType || "auto"),
      forceManualTime,
      departureTime,
    };

    const result = await runJourneyPlanningEngine(engineInput);

    return res.status(200).json({
      ...result,
      requestMode: forceManualTime
        ? "date_first_with_manual_fallback_time"
        : "date_first_no_manual_time",
      wrapperInput: engineInput,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      engine: "Home2Flight Journey Planning Engine",
      version: "api-wrapper-error",
      error: error?.message || String(error),
      generatedAt: new Date().toISOString(),
    });
  }
}