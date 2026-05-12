// api/engines/route-intelligence-engine.js

export default async function handler(req, res) {
  try {
    const {
      origin = "Lisboa",
      airport = "LIS",
      mode = "car"
    } = req.query;

    const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;

    if (!GOOGLE_KEY) {
      return res.status(500).json({
        success: false,
        error: "GOOGLE_MAPS_API_KEY missing"
      });
    }

    const airportMap = {
      LIS: "Lisbon Airport",
      OPO: "Porto Airport",
      FAO: "Faro Airport",
      MAD: "Madrid Barajas Airport",
      CDG: "Charles de Gaulle Airport"
    };

    const destination =
      airportMap[airport] || `${airport} Airport`;

    const url =
      `https://maps.googleapis.com/maps/api/distancematrix/json` +
      `?origins=${encodeURIComponent(origin)}` +
      `&destinations=${encodeURIComponent(destination)}` +
      `&departure_time=now` +
      `&traffic_model=best_guess` +
      `&key=${GOOGLE_KEY}`;

    const response = await fetch(url);

    const data = await response.json();

    const element =
      data?.rows?.[0]?.elements?.[0];

    if (!element || element.status !== "OK") {
      return res.status(200).json({
        success: true,
        fallback: true,
        route: {
          origin,
          destinationAirport: airport,
          transportMode: mode,
          estimatedRouteMinutes: 28,
          dynamicBufferMinutes: 25,
          totalRecommendedRouteMinutes: 53
        },
        reliability: {
          score: 55,
          confidenceScore: 58,
          trustLevel: "low",
          liveDataActive: false,
          sourceType: "fallback_profile"
        },
        intelligenceSummary: {
          summary:
            "Google Maps indisponível. Motor usou perfil conservador fallback."
        }
      });
    }

    const durationMinutes =
      Math.round(
        element.duration.value / 60
      );

    const trafficMinutes =
      Math.round(
        element.duration_in_traffic.value / 60
      );

    const trafficDelta =
      trafficMinutes - durationMinutes;

    let dynamicBuffer = 15;

    if (trafficDelta >= 10) {
      dynamicBuffer = 35;
    } else if (trafficDelta >= 5) {
      dynamicBuffer = 25;
    }

    const totalRecommendation =
      trafficMinutes + dynamicBuffer;

    return res.status(200).json({
      success: true,

      engine:
        "Home2Flight Route Intelligence Engine",

      version: "1.0.0",

      generatedAt: new Date().toISOString(),

      route: {
        origin,
        destinationAirport: airport,
        transportMode: mode,

        baseDurationMinutes:
          durationMinutes,

        liveTrafficDurationMinutes:
          trafficMinutes,

        trafficDeltaMinutes:
          trafficDelta,

        dynamicBufferMinutes:
          dynamicBuffer,

        totalRecommendedRouteMinutes:
          totalRecommendation
      },

      operationalProfile: {
        trafficRisk:
          trafficDelta >= 10
            ? "high"
            : trafficDelta >= 5
            ? "medium"
            : "low",

        disruptionRisk:
          trafficDelta >= 15
            ? "high"
            : "low",

        airportAccessRisk:
          trafficDelta >= 8
            ? "medium"
            : "low",

        routeRiskLevel:
          trafficDelta >= 10
            ? "high"
            : trafficDelta >= 5
            ? "medium"
            : "low"
      },

      reliability: {
        score: 86,

        confidenceScore: 89,

        trustLevel: "high",

        sourceType:
          "google_maps_live_traffic",

        source:
          "Google Maps Distance Matrix API",

        liveDataActive: true,

        dataFreshness: "live"
      },

      intelligenceSummary: {
        operationalStatus: "live",

        recommendationImpact:
          trafficDelta >= 5
            ? "dynamic_buffer_increased"
            : "standard_route",

        summary:
          trafficDelta >= 5
            ? `Trânsito acima do normal detetado. Buffer aumentado para ${dynamicBuffer} minutos.`
            : "Trânsito estável. Rota operacional dentro do esperado."
      },

      intelligenceFlags: [
        {
          type: "live_traffic",
          label: "Live traffic active",
          severity:
            trafficDelta >= 10
              ? "high"
              : trafficDelta >= 5
              ? "medium"
              : "low"
        }
      ],

      raw: {
        googleStatus: data.status
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}