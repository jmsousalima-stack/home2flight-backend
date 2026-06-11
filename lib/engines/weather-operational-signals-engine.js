// /lib/engines/weather-operational-signals-engine.js

const ENGINE_VERSION = "1.0.1-out-of-range-safe";

function normalizeWeatherIntelligence(weatherEngine = {}) {
  return weatherEngine?.weatherIntelligence || {};
}

function getSeverityFromRisk(weatherRisk) {
  if (weatherRisk === "high") return "high";
  if (weatherRisk === "medium") return "medium";
  return "low";
}

export function buildWeatherOperationalSignals({ weatherEngine } = {}) {
  const weather = normalizeWeatherIntelligence(weatherEngine);

  const sourceType = weather.sourceType || "weather_unknown";
  const dataFreshness = weather.dataFreshness || "unknown";
  const confidenceScore = weather.confidenceScore ?? 35;
  const extraBufferMinutes = weather.extraBufferMinutes ?? 0;
  const liveDataActive = Boolean(weather.liveDataActive);

  if (sourceType === "weather_forecast_out_of_range") {
    return [
      {
        id: "weather_forecast_out_of_range",
        type: "weather",
        title: "Meteorologia fora da janela de previsão",
        severity: "low",
        confidenceScore,
        sourceType,
        freshness: "out_of_range",
        liveDataActive: false,
        affects: ["route", "airport_access", "overall_reliability"],
        extraBufferMinutes,
        reasoning:
          "A data/hora do voo está fora da janela disponível de previsão live. A meteorologia não foi usada como dado real.",
      },
    ];
  }

  if (weatherEngine?.fallback || liveDataActive === false) {
    return [
      {
        id: "weather_data_unavailable",
        type: "weather",
        title: "Meteorologia indisponível",
        severity: "low",
        confidenceScore,
        sourceType,
        freshness: dataFreshness,
        liveDataActive: false,
        affects: ["route", "airport_access", "overall_reliability"],
        extraBufferMinutes: extraBufferMinutes || 5,
        reasoning:
          "Dados meteorológicos live indisponíveis. Aplicada margem mínima conservadora.",
      },
    ];
  }

  const weatherRisk = weather.weatherRisk || "unknown";
  const severity = getSeverityFromRisk(weatherRisk);

  return [
    {
      id: "weather_operational_forecast",
      type: "weather",
      title:
        weatherRisk === "high"
          ? "Meteorologia com impacto elevado"
          : weatherRisk === "medium"
          ? "Meteorologia com impacto moderado"
          : "Meteorologia sem impacto relevante",
      severity,
      confidenceScore,
      sourceType: sourceType || "open_meteo_forecast",
      freshness: "live",
      liveDataActive: true,
      affects: ["route", "airport_access", "airport"],
      extraBufferMinutes,
      reasoning:
        weatherRisk === "high" || weatherRisk === "medium"
          ? `Meteorologia com impacto operacional. Buffer adicional: ${extraBufferMinutes} minutos.`
          : "Sem chuva, vento ou visibilidade com impacto operacional relevante.",
    },
  ];
}

export default buildWeatherOperationalSignals;