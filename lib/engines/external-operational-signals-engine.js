// /lib/engines/external-operational-signals-engine.js

function buildSignal({
  id,
  type,
  title,
  severity,
  confidenceScore,
  sourceType,
  affects,
  extraBufferMinutes,
  reasoning,
  liveDataActive = false,
}) {
  return {
    id,
    type,
    title,
    severity,
    confidenceScore,
    sourceType,
    freshness: liveDataActive ? "live" : "profile",
    liveDataActive,
    affects,
    extraBufferMinutes,
    reasoning,
  };
}

function calculateGlobalRisk(signals) {
  let risk = 20;

  for (const signal of signals) {
    if (signal.severity === "low") risk += 4;
    if (signal.severity === "medium") risk += 10;
    if (signal.severity === "high") risk += 22;
  }

  return Math.min(100, risk);
}

export function runExternalOperationalSignals({
  airport = "LIS",
  mode = "public",
  weather = "normal",
} = {}) {
  const normalizedAirport = String(airport || "LIS").toUpperCase();
  const normalizedMode = String(mode || "public").toLowerCase();
  const normalizedWeather = String(weather || "normal").toLowerCase();

  const signals = [];

  if (normalizedWeather === "rain") {
    signals.push(
      buildSignal({
        id: "weather_rain",
        type: "weather",
        title: "Chuva com impacto operacional",
        severity: "medium",
        confidenceScore: 72,
        sourceType: "weather_profile",
        affects: ["route", "airport_access"],
        extraBufferMinutes: 12,
        reasoning:
          "Chuva aumenta risco operacional em trânsito e acessos aeroportuários.",
      })
    );
  }

  if (normalizedWeather === "storm") {
    signals.push(
      buildSignal({
        id: "weather_storm",
        type: "weather",
        title: "Tempestade com potencial impacto operacional",
        severity: "high",
        confidenceScore: 84,
        sourceType: "weather_profile",
        affects: ["route", "airport", "flight"],
        extraBufferMinutes: 28,
        reasoning:
          "Condições meteorológicas severas aumentam risco operacional geral.",
      })
    );
  }

  if (normalizedMode === "public") {
    signals.push(
      buildSignal({
        id: "public_transport_variability",
        type: "transport",
        title: "Transporte público sob monitorização",
        severity: "medium",
        confidenceScore: 58,
        sourceType: "city_transport_profile",
        affects: ["route", "airport_access"],
        extraBufferMinutes: 10,
        reasoning:
          "Transportes públicos apresentam variabilidade operacional adicional.",
      })
    );
  }

  if (normalizedAirport === "LIS") {
    signals.push(
      buildSignal({
        id: "lis_operational_variability",
        type: "airport",
        title: "LIS com variabilidade operacional moderada",
        severity: "medium",
        confidenceScore: 64,
        sourceType: "airport_profile",
        affects: ["security", "airport"],
        extraBufferMinutes: 10,
        reasoning:
          "Lisboa apresenta variabilidade moderada em períodos operacionais ativos.",
      })
    );
  }

  const operationalRiskScore = calculateGlobalRisk(signals);

  return {
    success: true,
    engine: "Home2Flight External Operational Signals Engine",
    version: "1.0.1-lib-exportable",
    generatedAt: new Date().toISOString(),
    request: {
      airport: normalizedAirport,
      mode: normalizedMode,
      weather: normalizedWeather,
    },
    summary: {
      totalSignals: signals.length,
      operationalRiskScore,
      liveDataActive: false,
    },
    signals,
  };
}

export default runExternalOperationalSignals;