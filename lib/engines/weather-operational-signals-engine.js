// /lib/engines/weather-operational-signals-engine.js

export function buildWeatherOperationalSignals({ weatherEngine } = {}) {
  const weather = weatherEngine?.weatherIntelligence;

  if (!weatherEngine?.success || !weather) {
    return [
      {
        id: "weather_operational_unknown",
        type: "weather",
        title: "Meteorologia não confirmada",
        severity: "low",
        confidenceScore: 35,
        sourceType: "weather_fallback",
        freshness: "fallback",
        affects: ["route", "airport_access", "overall_reliability"],
        extraBufferMinutes: 5,
        reasoning:
          "Sem meteorologia live confirmada. Aplicada margem mínima conservadora.",
      },
    ];
  }

  const signals = [];

  if (weather.weatherRisk === "high") {
    signals.push({
      id: "weather_high_operational_impact",
      type: "weather",
      title: "Meteorologia com impacto operacional elevado",
      severity: "high",
      confidenceScore: weather.confidenceScore || 70,
      sourceType: weather.sourceType || "open_meteo_forecast",
      freshness: "live",
      affects: ["route", "airport_access", "airport", "overall_reliability"],
      extraBufferMinutes: Math.max(weather.extraBufferMinutes || 0, 25),
      reasoning:
        "Condições meteorológicas podem afetar trajeto, acessos ao aeroporto e fluidez operacional.",
    });
  } else if (weather.weatherRisk === "medium") {
    signals.push({
      id: "weather_medium_operational_impact",
      type: "weather",
      title: "Meteorologia com impacto operacional moderado",
      severity: "medium",
      confidenceScore: weather.confidenceScore || 70,
      sourceType: weather.sourceType || "open_meteo_forecast",
      freshness: "live",
      affects: ["route", "airport_access", "airport"],
      extraBufferMinutes: Math.max(weather.extraBufferMinutes || 0, 12),
      reasoning:
        "Meteorologia justifica margem adicional moderada na jornada até ao aeroporto.",
    });
  } else {
    signals.push({
      id: "weather_low_operational_impact",
      type: "weather",
      title: "Meteorologia sem impacto relevante",
      severity: "low",
      confidenceScore: weather.confidenceScore || 70,
      sourceType: weather.sourceType || "open_meteo_forecast",
      freshness: "live",
      affects: ["route", "airport_access"],
      extraBufferMinutes: weather.extraBufferMinutes || 0,
      reasoning:
        "Meteorologia live consultada sem impacto operacional relevante.",
    });
  }

  if (weather.precipitationMm >= 2) {
    signals.push({
      id: "weather_precipitation_detected",
      type: "weather_rain",
      title: "Precipitação com impacto no acesso",
      severity: weather.precipitationMm >= 8 ? "high" : "medium",
      confidenceScore: weather.confidenceScore || 70,
      sourceType: weather.sourceType || "open_meteo_forecast",
      freshness: "live",
      affects: ["route", "airport_access"],
      extraBufferMinutes: weather.precipitationMm >= 8 ? 18 : 10,
      reasoning: `Precipitação prevista: ${weather.precipitationMm} mm.`,
    });
  }

  if (weather.gustKmh >= 45) {
    signals.push({
      id: "weather_wind_gusts_detected",
      type: "weather_wind",
      title: "Rajadas de vento relevantes",
      severity: weather.gustKmh >= 70 ? "high" : "medium",
      confidenceScore: weather.confidenceScore || 70,
      sourceType: weather.sourceType || "open_meteo_forecast",
      freshness: "live",
      affects: ["route", "airport", "overall_reliability"],
      extraBufferMinutes: weather.gustKmh >= 70 ? 18 : 6,
      reasoning: `Rajadas previstas: ${weather.gustKmh} km/h.`,
    });
  }

  if ([45, 48].includes(weather.weatherCode)) {
    signals.push({
      id: "weather_fog_detected",
      type: "weather_visibility",
      title: "Nevoeiro ou visibilidade reduzida",
      severity: "medium",
      confidenceScore: weather.confidenceScore || 70,
      sourceType: weather.sourceType || "open_meteo_forecast",
      freshness: "live",
      affects: ["route", "airport_access", "flight"],
      extraBufferMinutes: 12,
      reasoning:
        "Código meteorológico indica nevoeiro/visibilidade reduzida, podendo afetar deslocação e operação.",
    });
  }

  return signals;
}

export default buildWeatherOperationalSignals;