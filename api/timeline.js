function getAirportProfile(code) {
  const airports = {
    LIS: {
      security: 18,
      bagDrop: 12,
      passport: 10,
      gateWalk: 14,
      reliability: 72
    },

    AMS: {
      security: 22,
      bagDrop: 14,
      passport: 12,
      gateWalk: 18,
      reliability: 82
    },

    CDG: {
      security: 32,
      bagDrop: 18,
      passport: 20,
      gateWalk: 28,
      reliability: 64
    }
  };

  return airports[code] || airports["LIS"];
}

function getFlight(flightNumber) {
  const flights = {
    TP1365: {
      airline: "TAP Air Portugal",
      from: "LIS",
      to: "AMS",
      departure: "2026-05-08T14:20:00",
      status: "scheduled"
    },

    EK192: {
      airline: "Emirates",
      from: "LIS",
      to: "DXB",
      departure: "2026-05-08T21:15:00",
      status: "scheduled"
    },

    AF1195: {
      airline: "Air France",
      from: "LIS",
      to: "CDG",
      departure: "2026-05-08T16:40:00",
      status: "delayed"
    }
  };

  return flights[flightNumber] || flights["TP1365"];
}

export default function handler(req, res) {
  const flightNumber = (req.query.flight || "TP1365").toUpperCase();

  const flight = getFlight(flightNumber);

  const airportProfile = getAirportProfile(flight.from);

  const totalAirportTime =
    airportProfile.security +
    airportProfile.bagDrop +
    airportProfile.passport +
    airportProfile.gateWalk;

  let baseBuffer = 90;

  if (flight.status === "delayed") {
    baseBuffer = 75;
  }

  if (airportProfile.reliability < 70) {
    baseBuffer += 30;
  }

  const recommendedArrivalMinutes =
    totalAirportTime + baseBuffer;

  res.status(200).json({
    flight: {
      number: flightNumber,
      airline: flight.airline,
      status: flight.status
    },

    route: {
      from: flight.from,
      to: flight.to
    },

    departure: {
      scheduled: flight.departure
    },

    airportProfile: {
      securityMinutes: airportProfile.security,
      bagDropMinutes: airportProfile.bagDrop,
      passportMinutes: airportProfile.passport,
      gateWalkMinutes: airportProfile.gateWalk
    },

    recommendation: {
      airportArrivalRecommendedMinutesBeforeDeparture:
        recommendedArrivalMinutes,

      recommendationReason:
        "Estimativa baseada em perfil operacional do aeroporto."
    },

    reliability: {
      score: airportProfile.reliability,

      confidence:
        airportProfile.reliability >= 80
          ? "Alta"
          : airportProfile.reliability >= 70
          ? "Média"
          : "Média-baixa",

      liveData: false,

      riskLevel:
        airportProfile.reliability >= 80
          ? "low"
          : airportProfile.reliability >= 70
          ? "normal"
          : "high"
    },

    metadata: {
      engine: "Home2Flight Timeline Engine",
      version: "0.2.0"
    }
  });
}
