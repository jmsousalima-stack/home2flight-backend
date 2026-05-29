// /api/engines/weather-intelligence-engine.js

import { getWeatherIntelligence } from "../../lib/engines/weather-intelligence-engine.js";

export default async function handler(req, res) {
  try {
    const {
      airport = "LIS",
      departureTime = null,
    } = req.query;

    const result = await getWeatherIntelligence({
      airport,
      departureTime,
    });

    return res.status(200).json({
      ...result,
      engine: "Home2Flight Weather Intelligence Engine",
      version: "0.1.1-wrapper-lib",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      engine: "Home2Flight Weather Intelligence Engine",
      error: error.message,
    });
  }
}