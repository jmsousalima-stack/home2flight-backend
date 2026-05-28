import getFlightSourceArbitration from "./engines/flight-source-arbitration-engine.js";

export default async function handler(req, res) {
  try {
    const result = await getFlightSourceArbitration({
      flight: req.query.flight || "KL1578",
      airline: req.query.airline || "KL",
      airport: req.query.airport || "LIS",
      terminal: req.query.terminal || "1",
      manualDepartureTime:
        req.query.manualDepartureTime ||
        req.query.departureTime ||
        "2026-05-20T15:05:00.000Z",
      forceManualTime:
        req.query.forceManualTime === "true" ||
        req.query.forceManualTime === true,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      engine: "Home2Flight Flight Source Arbitration Engine",
      error: error?.message || String(error),
    });
  }
}