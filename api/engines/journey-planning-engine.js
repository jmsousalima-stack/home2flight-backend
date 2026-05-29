// /api/engines/journey-planning-engine.js

import {
  parseJourneyPlanningRequest,
  runJourneyPlanningEngine,
} from "../../lib/engines/journey-planning-engine.js";

export default async function handler(req, res) {
  try {
    const mission = parseJourneyPlanningRequest(req.query);

    const result = await runJourneyPlanningEngine(mission);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      engine: "Home2Flight Journey Planning Engine",
      version: "1.9.0-api-wrapper",
      error: error.message,
    });
  }
}