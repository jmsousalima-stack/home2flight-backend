function getAirportProfile(code) {
  const airports = {
    LIS: {
      name: "Lisboa Humberto Delgado",
      country: "Portugal",
      security: 18,
      bagDrop: 12,
      passport: 10,
      gateWalk: 14,
      reliability: 72
    },

    AMS: {
      name: "Amsterdam Schiphol",
      country: "Netherlands",
      security: 22,
      bagDrop: 14,
      passport: 12,
      gateWalk: 18,
      reliability: 82
    },

    CDG: {
      name: "Paris Charles de Gaulle",
      country: "France",
      security: 32,
      bagDrop: 18,
      passport: 20,
      gateWalk: 28,
      reliability: 64
    },

    DXB: {
      name: "Dubai International",
      country: "United Arab Emirates",
      security: 26,
      bagDrop: 18,
      passport: 18,
      gateWalk: 26,
      reliability: 74
    }
  };

  return airports[code] || airports.LIS;
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

  return flights[flightNumber] || flights.TP1365;
}

function toBoolean(value) {
  return value === true || value === "true";
}

function getConfidence(score) {
  if (score >= 80) return "Alta";
  if (score >= 70) return "Média";
  return "Média-baixa";
}

function getRiskLevel(score) {
  if (score >= 80) return "low";
  if (score >= 70) return "normal";
  return "high";
}

export default function handler(req, res) {
  const flightNumber = (req.query.flight || "TP1365").toUpperCase();

  const hasBags = toBoolean(req.query.bags);
  const hasKids = toBoolean(req.query.kids);
  const flightType = req.query.flightType || "schengen";
  const transport = req.query.transport || "car";

  const flight = getFlight(flightNumber);
  const departureAirport = getAirportProfile(flight.from);
  const arrivalAirport = getAirportProfile(flight.to);

  let securityMinutes = departureAirport.security;
  let bagDropMinutes = hasBags ? departureAirport.bagDrop : 0;
  let passportMinutes =
    flightType === "passport" ? departureAirport.passport : 0;
  let gateWalkMinutes = departureAirport.gateWalk;

  const adjustments = [];

  if (hasBags) {
    bagDropMinutes += 8;
    adjustments.push({
      type: "bags",
      impactMinutes: 8,
      reason: "Mala de porão aumenta margem de check-in/bag drop."
    });
  }

  if (hasKids) {
    securityMinutes += 6;
    gateWalkMinutes += 5;
    adjustments.push({
      type: "kids",
      impactMinutes: 11,
      reason: "Crianças aumentam margem de deslocação e controlo."
    });
  }

  if (flightType === "passport") {
    passportMinutes += 10;
    adjustments.push({
      type: "passport",
      impactMinutes: 10,
      reason: "Voo com controlo de passaporte/fronteira."
    });
  }

  let transportBuffer = 15;

  if (transport === "public") {
    transportBuffer = 25;
  }

  if (transport === "uber") {
    transportBuffer = 18;
  }

  if (transport === "car") {
    transportBuffer = 15;
  }

  adjustments.push({
    type: "transport",
    impactMinutes: transportBuffer,
    reason: `Margem dinâmica associada ao transporte: ${transport}.`
  });

  let baseBuffer = 75;

  if (flight.status === "delayed") {
    baseBuffer = 60;
    adjustments.push({
      type: "flight_status",
      impactMinutes: -15,
      reason: "Voo atrasado reduz ligeiramente a necessidade de antecedência."
    });
  }

  if (departureAirport.reliability < 70) {
    baseBuffer += 30;
    adjustments.push({
      type: "low_reliability",
      impactMinutes: 30,
      reason: "Aeroporto com menor fiabilidade exige margem adicional."
    });
  }

  const totalAirportProcessMinutes =
    securityMinutes +
    bagDropMinutes +
    passportMinutes +
    gateWalkMinutes;

  const airportArrivalRecommendedMinutesBeforeDeparture =
    totalAirportProcessMinutes + baseBuffer;

  const leaveHomeRecommendedMinutesBeforeDeparture =
    airportArrivalRecommendedMinutesBeforeDeparture + transportBuffer;

  res.status(200).json({
    flight: {
      number: flightNumber,
      airline: flight.airline,
      status: flight.status
    },

    route: {
      from: {
        code: flight.from,
        name: departureAirport.name,
        country: departureAirport.country
      },
      to: {
        code: flight.to,
        name: arrivalAirport.name,
        country: arrivalAirport.country
      }
    },

    userContext: {
      bags: hasBags,
      kids: hasKids,
      flightType,
      transport
    },

    departure: {
      scheduled: flight.departure
    },

    airportProfile: {
      securityMinutes,
      bagDropMinutes,
      passportMinutes,
      gateWalkMinutes,
      totalAirportProcessMinutes
    },

    recommendation: {
      airportArrivalRecommendedMinutesBeforeDeparture,
      leaveHomeRecommendedMinutesBeforeDeparture,
      recommendationReason:
        "Estimativa baseada em voo, aeroporto de partida, contexto do utilizador e margens dinâmicas."
    },

    reliability: {
      score: departureAirport.reliability,
      confidence: getConfidence(departureAirport.reliability),
      riskLevel: getRiskLevel(departureAirport.reliability),
      liveData: false,
      source: "Home2Flight Timeline Engine"
    },

    adjustments,

    limitations: [
      "Ainda sem tempo real oficial de filas de segurança.",
      "Ainda sem bag drop por companhia aérea.",
      "Ainda sem alertas automáticos de greves, incidentes ou notícias.",
      "Ainda sem reports da comunidade."
    ],

    metadata: {
      engine: "Home2Flight Timeline Engine",
      version: "0.3.0"
    }
  });
}
