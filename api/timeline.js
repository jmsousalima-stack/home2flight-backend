import { calculateReliability } from "./reliability-engine.js";

export default function handler(req, res) {

  const {
    flight = "TP1365",
    bags = "false",
    kids = "false",
    flightType = "schengen",
    transport = "car",
  } = req.query;

  // MOCK FLIGHT ENGINE

  const flights = {
    TP1365: {
      airline: "TAP Air Portugal",
      from: {
        code: "LIS",
        name: "Lisboa Humberto Delgado",
        country: "Portugal",
      },
      to: {
        code: "AMS",
        name: "Amsterdam Schiphol",
        country: "Netherlands",
      },
      departure: "2026-05-08T14:20:00",
      status: "scheduled",
    },

    AF1195: {
      airline: "Air France",
      from: {
        code: "LIS",
        name: "Lisboa Humberto Delgado",
        country: "Portugal",
      },
      to: {
        code: "CDG",
        name: "Paris Charles de Gaulle",
        country: "France",
      },
      departure: "2026-05-08T16:40:00",
      status: "delayed",
    },
  };

  const flightData = flights[flight] || flights["TP1365"];

  // AIRPORT PROFILE ENGINE

  let airportRisk = "normal";

  const destinationAirport = flightData.to.code;

  if (destinationAirport === "CDG") {
    airportRisk = "high";
  }

  if (destinationAirport === "AMS") {
    airportRisk = "medium";
  }

  // AIRPORT BASE TIMES

  let securityMinutes = 18;
  let bagDropMinutes = 12;
  let passportMinutes = 10;
  let gateWalkMinutes = 14;

  if (destinationAirport === "AMS") {
    securityMinutes = 22;
    bagDropMinutes = 14;
    passportMinutes = 12;
    gateWalkMinutes = 18;
  }

  if (destinationAirport === "CDG") {
    securityMinutes = 32;
    bagDropMinutes = 18;
    passportMinutes = 20;
    gateWalkMinutes = 28;
  }

  // USER CONTEXT

  const hasBags = bags === "true";
  const withKids = kids === "true";

  // ADJUSTMENTS

  const adjustments = [];

  if (hasBags) {
    bagDropMinutes += 8;

    adjustments.push({
      type: "bags",
      area: "airport",
      impactMinutes: 8,
      reason: "Mala de porão aumenta margem de check-in/bag drop.",
    });
  }

  if (withKids) {
    securityMinutes += 4;
    gateWalkMinutes += 7;

    adjustments.push({
      type: "kids",
      area: "airport",
      impactMinutes: 11,
      reason: "Crianças aumentam margem de deslocação e controlo.",
    });
  }

  if (flightType === "passport") {
    passportMinutes += 10;

    adjustments.push({
      type: "passport",
      area: "airport",
      impactMinutes: 10,
      reason: "Voo com controlo de passaporte/fronteira.",
    });
  }

  let transportMinutes = 0;

  if (transport === "public") {
    transportMinutes = 25;

    adjustments.push({
      type: "transport",
      area: "transport",
      impactMinutes: 25,
      reason: "Margem dinâmica associada a transporte público.",
    });
  }

  if (flightData.status === "delayed") {

    adjustments.push({
      type: "flight_status",
      area: "flight",
      impactMinutes: -15,
      reason: "Voo atrasado reduz ligeiramente antecedência recomendada.",
    });
  }

  // ALERTS ENGINE

  const alerts = [];

  if (destinationAirport === "CDG") {
    alerts.push({
      type: "complex_airport",
      severity: "high",
      title: "Aeroporto complexo com maior incerteza operacional",
      impactMinutes: 20,
      source: "Home2Flight Airport Profile",
      verified: true,
    });
  }

  // TOTALS

  const totalAirportProcessMinutes =
    securityMinutes +
    bagDropMinutes +
    passportMinutes +
    gateWalkMinutes;

  const estimatedTravelMinutes = 40;
  const bufferMinutes = 25;

  const totalMinutes =
    totalAirportProcessMinutes +
    estimatedTravelMinutes +
    bufferMinutes +
    transportMinutes;

  // RELIABILITY ENGINE

  const reliability = calculateReliability({
    airportRisk,
    flightStatus: flightData.status,
    hasLiveData: false,
    alerts,
    userContext: {
      kids: withKids,
      transport,
    },
  });

  // RESPONSE

  return res.status(200).json({
    flight: {
      number: flight,

      airline: flightData.airline,

      status: flightData.status,

      route: {
        from: flightData.from,
        to: flightData.to,
      },

      userContext: {
        bags: hasBags,
        kids: withKids,
        flightType,
        transport,
      },

      departure: {
        scheduled: flightData.departure,
      },
    },

    timingBreakdown: {
      airportProcess: {
        totalMinutes: totalAirportProcessMinutes,

        securityMinutes,
        bagDropMinutes,
        passportMinutes,
        gateWalkMinutes,
      },

      transport: {
        mode: transport,
        estimatedTravelMinutes,
      },

      safetyBuffer: {
        minutes: bufferMinutes,
      },

      totalMinutes,
    },

    recommendation: {
      airportArrivalRecommendedMinutesBeforeDeparture:
        totalAirportProcessMinutes + bufferMinutes,

      leaveHomeRecommendedMinutesBeforeDeparture:
        totalMinutes,

      recommendationReason:
        "Estimativa separada por processo de aeroporto, transporte e margem de segurança.",
    },

    reliability,

    alerts,

    adjustments,

    limitations: [
      "Ainda sem tempo real oficial de filas de segurança.",
      "Ainda sem bag drop por companhia aérea.",
      "Ainda sem alertas automáticos de greves, incidentes ou notícias.",
      "Ainda sem reports da comunidade.",
    ],

    metadata: {
      engine: "Home2Flight Timeline Engine",
      version: "0.5.0",
    },
  });
}
