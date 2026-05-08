export default function handler(req, res) {
  const flightNumber = (req.query.flight || "TP1365").toUpperCase();

  const flights = {
    TP1365: {
      airline: "TAP Air Portugal",
      from: "LIS",
      to: "AMS",
      departure: "2026-05-08T14:20:00",
      arrival: "2026-05-08T18:10:00",
      terminal: "1",
      gate: "22",
      status: "scheduled"
    },

    EK192: {
      airline: "Emirates",
      from: "LIS",
      to: "DXB",
      departure: "2026-05-08T21:15:00",
      arrival: "2026-05-09T08:05:00",
      terminal: "1",
      gate: "15",
      status: "scheduled"
    },

    AF1195: {
      airline: "Air France",
      from: "LIS",
      to: "CDG",
      departure: "2026-05-08T16:40:00",
      arrival: "2026-05-08T20:10:00",
      terminal: "1",
      gate: "18",
      status: "delayed"
    }
  };

  const selectedFlight = flights[flightNumber] || flights["TP1365"];

  res.status(200).json({
    flight: flightNumber,

    airline: selectedFlight.airline,

    route: {
      from: selectedFlight.from,
      to: selectedFlight.to
    },

    schedule: {
      departure: selectedFlight.departure,
      arrival: selectedFlight.arrival
    },

    airport: {
      terminal: selectedFlight.terminal,
      gate: selectedFlight.gate
    },

    operationalStatus: {
      status: selectedFlight.status,
      liveData: false,
      source: "Home2Flight Internal Flight Engine"
    },

    reliability: {
      score: 76,
      confidence: "Média",
      reason:
        "Ainda sem integração live com companhia aérea ou aeroporto."
    },

    metadata: {
      engine: "Home2Flight Flight Engine",
      version: "0.1.0"
    }
  });
}
