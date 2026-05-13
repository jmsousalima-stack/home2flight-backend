// /api/test-airport-intelligence.js

import { getAirportOperationalIntelligence } from "./engines/airport-intelligence-engine";

export default async function handler(req, res) {
  try {
    const result = await getAirportOperationalIntelligence({
      airport: "LIS",
      airline: "AF",
      terminal: "1",
      departureTime: new Date().toISOString(),
      passengerProfile: {
        frequentFlyer: false,
      },
      baggageProfile: {
        checkedBags: 1,
      },
    });

    return res.status(200).json({
      success: true,
      engine: "Home2Flight Airport Intelligence Engine",
      version: "2.0.0",
      generatedAt: new Date().toISOString(),
      result,
    });
  } catch (error) {
    console.error("Airport intelligence test error:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
}