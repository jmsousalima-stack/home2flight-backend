export default async function handler(req, res) {
  const airport = String(req.query.airport || "LIS").toUpperCase();

  const profiles = {
    LIS: {
      city: "Lisbon",
      country: "Portugal",
      operationalRisk: "medium",
      weather: {
        condition: "Rain",
        impactLevel: "medium",
        visibility: "moderate",
        windRisk: "low",
        disruptionRisk: "medium",
      },
    },

    CDG: {
      city: "Paris",
      country: "France",
      operationalRisk: "high",
      weather: {
        condition: "Storm",
        impactLevel: "high",
        visibility: "low",
        windRisk: "high",
        disruptionRisk: "high",
      },
    },

    AMS: {
      city: "Amsterdam",
      country: "Netherlands",
      operationalRisk: "medium",
      weather: {
        condition: "Cloudy",
        impactLevel: "low",
        visibility: "good",
        windRisk: "medium",
        disruptionRisk: "low",
      },
    },

    DXB: {
      city: "Dubai",
      country: "UAE",
      operationalRisk: "medium",
      weather: {
        condition: "Clear",
        impactLevel: "low",
        visibility: "excellent",
        windRisk: "low",
        disruptionRisk: "low",
      },
    },
  };

  const profile = profiles[airport] || profiles.LIS;

  const score = calculateWeatherScore(profile.weather);

  return res.status(200).json({
    success: true,
    generatedAt: new Date().toISOString(),

    engine: "Home2Flight Weather Intelligence Engine",
    version: "0.1.0",

    airport: {
      code: airport,
      city: profile.city,
      country: profile.country,
    },

    operationalWeather: {
      condition: profile.weather.condition,
      impactLevel: profile.weather.impactLevel,
      visibility: profile.weather.visibility,
      windRisk: profile.weather.windRisk,
      disruptionRisk: profile.weather.disruptionRisk,
    },

    reliability: {
      score,
      trustLevel: getTrustLevel(score),
      sourceType: "internal_weather_profile",
      liveDataActive: false,
      limitations: [
        "Ainda sem integração meteorológica em tempo real.",
        "Ainda sem radar operacional aeroportuário.",
        "Perfil meteorológico interno usado como fallback.",
      ],
    },

    intelligenceSummary: {
      operationalStatus: getOperationalStatus(
        profile.weather.disruptionRisk
      ),

      recommendationImpact: getRecommendationImpact(
        profile.weather.impactLevel
      ),

      summary: buildSummary({
        airport,
        condition: profile.weather.condition,
        impactLevel: profile.weather.impactLevel,
      }),
    },

    intelligenceFlags: buildFlags(profile.weather),

    diagnostics: {
      fallbackUsed: false,
      liveProviderConnected: false,
    },
  });
}

function calculateWeatherScore(weather) {
  let score = 84;

  if (weather.impactLevel === "medium") score -= 14;
  if (weather.impactLevel === "high") score -= 28;

  if (weather.windRisk === "medium") score -= 8;
  if (weather.windRisk === "high") score -= 16;

  return Math.max(20, Math.min(95, score));
}

function getTrustLevel(score) {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

function getOperationalStatus(risk) {
  if (risk === "high") return "critical";
  if (risk === "medium") return "monitoring";

  return "stable";
}

function getRecommendationImpact(impact) {
  if (impact === "high") {
    return "strong_weather_buffer_required";
  }

  if (impact === "medium") {
    return "weather_buffer_recommended";
  }

  return "standard_monitoring";
}

function buildSummary({
  airport,
  condition,
  impactLevel,
}) {
  if (impactLevel === "high") {
    return `${airport} apresenta condições meteorológicas severas (${condition}). A timeline deve aplicar margem operacional reforçada e monitorização contínua.`;
  }

  if (impactLevel === "medium") {
    return `${airport} apresenta impacto meteorológico moderado (${condition}). O motor deve aplicar buffer climático preventivo.`;
  }

  return `${airport} sem impacto meteorológico relevante detetado.`;
}

function buildFlags(weather) {
  const flags = [];

  if (weather.impactLevel === "high") {
    flags.push({
      type: "weather",
      label: "Impacto meteorológico severo",
      severity: "high",
    });
  }

  if (weather.windRisk === "high") {
    flags.push({
      type: "wind",
      label: "Risco elevado de vento",
      severity: "high",
    });
  }

  if (weather.visibility === "low") {
    flags.push({
      type: "visibility",
      label: "Baixa visibilidade",
      severity: "medium",
    });
  }

  if (flags.length === 0) {
    flags.push({
      type: "weather",
      label: "Meteorologia estável",
      severity: "low",
    });
  }

  return flags;
}
