// /api/engines/journey-planning-engine.js

import { runJourneyPlanningEngine } from "../../lib/engines/journey-planning-engine.js";

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

function parseFlightDate(query = {}) {
  return (
    query.flightDate ||
    query.date ||
    query.departureDate ||
    new Date().toISOString().slice(0, 10)
  );
}

export default async function handler(req, res) {
  try {
    const flight = String(req.query.flight || "KL1578").toUpperCase();
    const origin = String(req.query.origin || "Lisboa");
    const airport = String(req.query.airport || "LIS").toUpperCase();
    const airline = String(req.query.airline || flight.slice(0, 2)).toUpperCase();
    const terminal = String(req.query.terminal || "1");

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
    const flightDate = parseFlightDate(req.query);

    const result = await runJourneyPlanningEngine({
      flight,
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
      flightDate,

      // Campo antigo desligado por defeito.
      // Só existe para compatibilidade interna, não para uso normal do utilizador.
      forceManualTime: false,
      departureTime: "",
      manualDepartureTime: null,
    });

    return res.status(200).json({
      ...result,
      engine: "Home2Flight Journey Planning Engine",
      version: "1.9.4-date-first-wrapper",
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
      version: "1.9.4-date-first-wrapper",
      error: error?.message || String(error),
    });
  }
}