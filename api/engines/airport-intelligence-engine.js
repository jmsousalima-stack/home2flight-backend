// /api/engines/airport-intelligence-engine.js

import { getAirportOperationalIntelligence } from "../../../lib/engines/airport-intelligence-engine.js";

function toBoolean(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return String(value).toLowerCase() === "true";
}

export default async function handler(req, res) {
  try {
    const {
      airport = "LIS",
      airline = "AF",
      terminal = "1",
      departureTime = new Date().toISOString(),
      bags = "true",
      kids = "false",
      checkedIn = "false",
    } = req.query;

    const result = await getAirportOperationalIntelligence({
      airport,
      airline,
      terminal,
      departureTime,
      passengerProfile: {
        travellingWithKids: toBoolean(kids, false),
        checkedInOnline: toBoolean(checkedIn, false),
      },
      baggageProfile: {
        checkedBags: toBoolean(bags, true) ? 1 : 0,
      },
    });

    return res.status(200).json({
      ...result,
      engine: "Home2Flight Airport Intelligence Engine",
      version: "2.1.2-wrapper-lib",
      generatedAt: new Date().toISOString(),
      request: {
        airport,
        airline,
        terminal,
        departureTime,
        bags: toBoolean(bags, true),
        kids: toBoolean(kids, false),
        checkedIn: toBoolean(checkedIn, false),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      engine: "Home2Flight Airport Intelligence Engine",
      error: error.message,
    });
  }
}