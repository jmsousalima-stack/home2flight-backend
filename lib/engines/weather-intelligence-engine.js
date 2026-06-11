// /lib/engines/weather-intelligence-engine.js

const ENGINE_VERSION = "0.1.1-forecast-window-safe";

const AIRPORT_COORDINATES = {
  LIS: {
    airport: "LIS",
    name: "Lisboa Humberto Delgado",
    latitude: 38.7742,
    longitude: -9.1342,
    timezone: "Europe/Lisbon",
  },
  OPO: {
    airport: "OPO",
    name: "Porto Francisco Sá Carneiro",
    latitude: 41.2421,
    longitude: -8.6781,
    timezone: "Europe/Lisbon",
  },
  FAO: {
    airport: "FAO",
    name: "Faro Airport",
    latitude: 37.0144,
    longitude: -7.9659,
    timezone: "Europe/Lisbon",
  },
  AMS: {
    airport: "AMS",
    name: "Amsterdam Schiphol",
    latitude: 52.3105,
    longitude: 4.7683,
    timezone: "Europe/Amsterdam",
  },
  CDG: {
    airport: "CDG",
    name: "Paris Charles de Gaulle",
    latitude: 49.0097,
    longitude: 2.5479,
    timezone: "Europe/Paris",
  },
};

function normalizeAirport(airport) {
  return String(airport || "LIS").toUpperCase();
}

function normalizeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function hoursBetween(a, b) {
  if (!a || !b) return Infinity;
  return Math.abs(a.getTime() - b.getTime()) / 3600000;
}

function getNearestHourlyIndex(times, targetDate) {
  if (!Array.isArray(times) || !targetDate) return -1;

  let bestIndex = -1;
  let bestDiff = Infinity;

  for (let index = 0; index < times.length; index += 1) {
    const time = new Date(times[index]);
    if (Number.isNaN(time.getTime())) continue;

    const diff = Math.abs(time.getTime() - targetDate.getTime());

    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function getForecastWindow(times = []) {
  const validDates = times
    .map((item) => new Date(item))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (validDates.length === 0) {
    return {
      start: null,
      end: null,
    };
  }

  return {
    start: validDates[0],
    end: validDates[validDates.length - 1],
  };
}

function isTargetInsideForecastWindow({ targetDate, windowStart, windowEnd }) {
  if (!targetDate || !windowStart || !windowEnd) return false;

  return (
    targetDate.getTime() >= windowStart.getTime() &&
    targetDate.getTime() <= windowEnd.getTime()
  );
}

function classifyWeatherRisk({
  precipitationMm,
  windKmh,
  gustKmh,
  weatherCode,
}) {
  let score = 12;
  const reasons = [];

  if (precipitationMm >= 8) {
    score += 35;
    reasons.push("precipitação forte");
  } else if (precipitationMm >= 2) {
    score += 20;
    reasons.push("chuva moderada");
  } else if (precipitationMm > 0) {
    score += 8;
    reasons.push("chuva fraca");
  }

  if (gustKmh >= 70) {
    score += 32;
    reasons.push("rajadas fortes");
  } else if (gustKmh >= 45) {
    score += 18;
    reasons.push("vento moderado/forte");
  }

  if (windKmh >= 45) {
    score += 12;
    reasons.push("vento sustentado elevado");
  }

  if ([95, 96, 99].includes(weatherCode)) {
    score += 30;
    reasons.push("trovoada");
  }

  if ([45, 48].includes(weatherCode)) {
    score += 12;
    reasons.push("nevoeiro");
  }

  const riskScore = Math.max(0, Math.min(100, score));

  let weatherRisk = "low";
  let severity = "low";
  let extraBufferMinutes = 0;

  if (riskScore >= 70) {
    weatherRisk = "high";
    severity = "high";
    extraBufferMinutes = 25;
  } else if (riskScore >= 40) {
    weatherRisk = "medium";
    severity = "medium";
    extraBufferMinutes = 12;
  } else if (riskScore >= 25) {
    weatherRisk = "low";
    severity = "low";
    extraBufferMinutes = 5;
  }

  return {
    weatherRisk,
    severity,
    riskScore,
    extraBufferMinutes,
    reasons,
  };
}

function buildFallback({
  airport,
  reason,
  errorMessage = null,
  departureTime = null,
  sourceType = "weather_fallback",
  dataFreshness = "fallback",
  matchedWeatherTime = null,
  forecastWindow = null,
}) {
  const airportCode = normalizeAirport(airport);

  return {
    success: true,
    fallback: true,
    engine: "Home2Flight Weather Intelligence Engine",
    version: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    request: {
      airport: airportCode,
      departureTime,
      matchedWeatherTime,
      forecastWindow,
    },
    weatherIntelligence: {
      liveDataActive: false,
      weatherRisk: "unknown",
      riskScore: 35,
      confidenceScore: 35,
      trustLevel: "low",
      sourceType,
      dataFreshness,
      extraBufferMinutes: 5,
    },
    operationalSignals: [
      {
        id:
          sourceType === "weather_forecast_out_of_range"
            ? "weather_forecast_out_of_range"
            : "weather_data_unavailable",
        type: "weather",
        title:
          sourceType === "weather_forecast_out_of_range"
            ? "Meteorologia fora da janela de previsão"
            : "Meteorologia indisponível",
        severity: "low",
        confidenceScore: 35,
        sourceType,
        freshness: dataFreshness,
        affects: ["route", "airport_access", "overall_reliability"],
        extraBufferMinutes: 5,
        reasoning:
          sourceType === "weather_forecast_out_of_range"
            ? "A data/hora do voo está fora da janela disponível de previsão live. A meteorologia não foi usada como dado real."
            : "Dados meteorológicos live indisponíveis. Aplicada margem mínima conservadora.",
      },
    ],
    intelligenceSummary: {
      operationalStatus:
        sourceType === "weather_forecast_out_of_range"
          ? "forecast_out_of_range"
          : "fallback",
      weatherRisk: "unknown",
      recommendationImpact: "minimal_conservative_buffer",
      summary:
        sourceType === "weather_forecast_out_of_range"
          ? "A meteorologia live não cobre a data do voo. A Home2Flight aplica margem mínima conservadora e deve voltar a consultar mais perto da partida."
          : "Não foi possível obter meteorologia live. A Home2Flight aplica margem mínima conservadora.",
    },
    limitations: [
      reason,
      ...(errorMessage ? [errorMessage] : []),
      "Fallback meteorológico conservador.",
    ],
  };
}

export async function getWeatherIntelligence({
  airport = "LIS",
  departureTime = null,
} = {}) {
  const airportCode = normalizeAirport(airport);
  const profile = AIRPORT_COORDINATES[airportCode];

  if (!profile) {
    return buildFallback({
      airport: airportCode,
      departureTime,
      reason: `Sem coordenadas configuradas para ${airportCode}.`,
    });
  }

  const targetDate = normalizeDate(departureTime) || new Date();

  try {
    const params = new URLSearchParams({
      latitude: String(profile.latitude),
      longitude: String(profile.longitude),
      hourly: [
        "precipitation",
        "weather_code",
        "wind_speed_10m",
        "wind_gusts_10m",
        "visibility",
      ].join(","),
      timezone: profile.timezone,
      forecast_days: "3",
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      return buildFallback({
        airport: airportCode,
        departureTime,
        reason: `Open-Meteo respondeu com status ${response.status}.`,
      });
    }

    const data = await response.json();
    const hourlyTimes = data?.hourly?.time || [];

    const forecastWindow = getForecastWindow(hourlyTimes);

    const isInsideWindow = isTargetInsideForecastWindow({
      targetDate,
      windowStart: forecastWindow.start,
      windowEnd: forecastWindow.end,
    });

    if (!isInsideWindow) {
      return buildFallback({
        airport: airportCode,
        departureTime,
        sourceType: "weather_forecast_out_of_range",
        dataFreshness: "out_of_range",
        reason:
          "A data/hora do voo está fora da janela de forecast disponível no Open-Meteo.",
        forecastWindow: {
          start: forecastWindow.start?.toISOString() || null,
          end: forecastWindow.end?.toISOString() || null,
        },
      });
    }

    const index = getNearestHourlyIndex(hourlyTimes, targetDate);

    if (index < 0) {
      return buildFallback({
        airport: airportCode,
        departureTime,
        reason: "Sem hora meteorológica compatível na resposta Open-Meteo.",
      });
    }

    const matchedDate = normalizeDate(hourlyTimes[index]);
    const matchedDiffHours = hoursBetween(matchedDate, targetDate);

    if (matchedDiffHours > 2) {
      return buildFallback({
        airport: airportCode,
        departureTime,
        matchedWeatherTime: hourlyTimes[index] || null,
        sourceType: "weather_forecast_out_of_range",
        dataFreshness: "out_of_range",
        reason:
          "A hora meteorológica mais próxima está demasiado distante da hora do voo.",
        forecastWindow: {
          start: forecastWindow.start?.toISOString() || null,
          end: forecastWindow.end?.toISOString() || null,
        },
      });
    }

    const precipitationMm = Number(data?.hourly?.precipitation?.[index] || 0);
    const weatherCode = Number(data?.hourly?.weather_code?.[index] || 0);
    const windKmh = Number(data?.hourly?.wind_speed_10m?.[index] || 0);
    const gustKmh = Number(data?.hourly?.wind_gusts_10m?.[index] || 0);
    const visibility = Number(data?.hourly?.visibility?.[index] || 0);

    const classification = classifyWeatherRisk({
      precipitationMm,
      windKmh,
      gustKmh,
      weatherCode,
    });

    const confidenceScore = 76;

    return {
      success: true,
      fallback: false,
      engine: "Home2Flight Weather Intelligence Engine",
      version: ENGINE_VERSION,
      generatedAt: new Date().toISOString(),
      request: {
        airport: airportCode,
        airportName: profile.name,
        departureTime,
        matchedWeatherTime: hourlyTimes[index] || null,
        forecastWindow: {
          start: forecastWindow.start?.toISOString() || null,
          end: forecastWindow.end?.toISOString() || null,
        },
      },
      weatherIntelligence: {
        liveDataActive: true,
        weatherRisk: classification.weatherRisk,
        riskScore: classification.riskScore,
        confidenceScore,
        trustLevel: confidenceScore >= 75 ? "high" : "medium",
        sourceType: "open_meteo_forecast",
        dataFreshness: "live_forecast",
        extraBufferMinutes: classification.extraBufferMinutes,
        precipitationMm,
        windKmh,
        gustKmh,
        visibility,
        weatherCode,
      },
      operationalSignals: [
        {
          id: "weather_operational_forecast",
          type: "weather",
          title:
            classification.weatherRisk === "high"
              ? "Meteorologia com impacto elevado"
              : classification.weatherRisk === "medium"
              ? "Meteorologia com impacto moderado"
              : "Meteorologia sem impacto relevante",
          severity: classification.severity,
          confidenceScore,
          sourceType: "open_meteo_forecast",
          freshness: "live",
          affects: ["route", "airport_access", "airport"],
          extraBufferMinutes: classification.extraBufferMinutes,
          reasoning:
            classification.reasons.length > 0
              ? `Condições detetadas: ${classification.reasons.join(", ")}.`
              : "Sem chuva, vento ou visibilidade com impacto operacional relevante.",
        },
      ],
      intelligenceSummary: {
        operationalStatus: "live_forecast",
        weatherRisk: classification.weatherRisk,
        recommendationImpact:
          classification.extraBufferMinutes > 0
            ? "weather_buffer_recommended"
            : "standard_monitoring",
        summary:
          classification.extraBufferMinutes > 0
            ? `Meteorologia justifica buffer adicional de ${classification.extraBufferMinutes} minutos.`
            : "Meteorologia sem impacto operacional relevante para a timeline.",
      },
      limitations: [
        "Forecast meteorológico dentro da janela disponível do Open-Meteo.",
        "Ainda não cruza METAR/TAF oficial de aviação.",
        "Ainda não separa impacto no voo, acesso ao aeroporto e operação em terminal com granularidade avançada.",
      ],
    };
  } catch (error) {
    return buildFallback({
      airport: airportCode,
      departureTime,
      reason: "Falha ao consultar Open-Meteo.",
      errorMessage: error?.message || String(error),
    });
  }
}

export default getWeatherIntelligence;