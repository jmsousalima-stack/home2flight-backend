// /api/engines/buffer-governance-engine.js

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getDomain(signal) {
  const affects = signal.affects || [];

  if (
    affects.includes("route") ||
    affects.includes("airport_access") ||
    affects.includes("public_transport") ||
    affects.includes("leave_home_time")
  ) {
    return "route";
  }

  if (
    affects.includes("airport") ||
    affects.includes("terminal_access") ||
    affects.includes("security") ||
    affects.includes("bag_drop") ||
    affects.includes("check_in")
  ) {
    return "airport";
  }

  if (
    affects.includes("passport_control") ||
    affects.includes("gate_timing") ||
    affects.includes("boarding")
  ) {
    return "gate";
  }

  if (
    affects.includes("flight") ||
    affects.includes("departure_time")
  ) {
    return "flight";
  }

  return "general";
}

function severityMultiplier(severity) {
  switch (String(severity || "").toLowerCase()) {
    case "critical":
      return 1.4;
    case "high":
      return 1.15;
    case "medium":
      return 0.75;
    case "low":
      return 0.35;
    default:
      return 0.5;
  }
}

function confidenceMultiplier(confidenceScore) {
  const confidence = clamp(parseNumber(confidenceScore, 50), 0, 100);

  if (confidence >= 80) return 1;
  if (confidence >= 60) return 0.82;
  if (confidence >= 40) return 0.62;

  return 0.45;
}

function freshnessMultiplier(freshness) {
  switch (freshness) {
    case "live":
      return 1;
    case "recent":
      return 0.82;
    case "cached":
      return 0.62;
    case "profile":
      return 0.48;
    case "fallback":
      return 0.35;
    default:
      return 0.5;
  }
}

function calculateSignalBuffer(signal) {
  const rawBuffer = parseNumber(signal.extraBufferMinutes, 0);

  const adjusted =
    rawBuffer *
    severityMultiplier(signal.severity) *
    confidenceMultiplier(signal.confidenceScore) *
    freshnessMultiplier(signal.freshness);

  return Math.round(clamp(adjusted, 0, 35));
}

function applyDiminishingReturns(buffers) {
  const sorted = [...buffers].sort((a, b) => b.adjustedBuffer - a.adjustedBuffer);

  let total = 0;

  const governed = sorted.map((item, index) => {
    const multiplier =
      index === 0
        ? 1
        : index === 1
        ? 0.55
        : index === 2
        ? 0.32
        : 0.18;

    const governedBuffer = Math.round(item.adjustedBuffer * multiplier);

    total += governedBuffer;

    return {
      ...item,
      diminishingReturnMultiplier: multiplier,
      governedBuffer,
    };
  });

  return {
    governed,
    total,
  };
}

function getDomainCap(domain, flightType) {
  const passport = flightType === "passport";

  const caps = {
    route: 45,
    airport: passport ? 55 : 45,
    gate: passport ? 28 : 20,
    flight: 20,
    general: 20,
  };

  return caps[domain] || 20;
}

function getTotalCap(profile) {
  const base = profile.flightType === "passport" ? 95 : 80;

  let extra = 0;

  if (profile.kids) extra += 12;
  if (profile.bags) extra += 10;
  if (profile.transport === "public") extra += 10;

  return clamp(base + extra, 70, 125);
}

function groupByDomain(signals, profile) {
  const grouped = {};

  for (const signal of signals) {
    const domain = getDomain(signal);

    if (!grouped[domain]) {
      grouped[domain] = [];
    }

    grouped[domain].push({
      id: signal.id,
      type: signal.type,
      title: signal.title,
      severity: signal.severity,
      confidenceScore: signal.confidenceScore,
      freshness: signal.freshness,
      sourceType: signal.sourceType,
      rawBuffer: parseNumber(signal.extraBufferMinutes, 0),
      adjustedBuffer: calculateSignalBuffer(signal),
      reasoning: signal.reasoning,
      domain,
    });
  }

  const domainResults = {};

  for (const domain of Object.keys(grouped)) {
    const result = applyDiminishingReturns(grouped[domain]);
    const cap = getDomainCap(domain, profile.flightType);
    const cappedBuffer = clamp(result.total, 0, cap);

    domainResults[domain] = {
      domain,
      cap,
      rawSignalCount: grouped[domain].length,
      governedSignalCount: result.governed.length,
      uncappedBuffer: result.total,
      bufferMinutes: cappedBuffer,
      capped: result.total > cap,
      signals: result.governed,
    };
  }

  return domainResults;
}

function buildOperationalPosture(totalBuffer, profile) {
  const totalCap = getTotalCap(profile);
  const ratio = totalCap > 0 ? totalBuffer / totalCap : 0;

  if (ratio >= 0.8) {
    return {
      mode: "ultra_conservative",
      label: "Estratégia muito conservadora",
      explanation:
        "A Home2Flight detetou múltiplos fatores operacionais e aplicou margem elevada dentro de limites controlados.",
    };
  }

  if (ratio >= 0.5) {
    return {
      mode: "conservative",
      label: "Estratégia conservadora",
      explanation:
        "A Home2Flight aplicou margem reforçada, evitando somar riscos duplicados de forma excessiva.",
    };
  }

  if (ratio >= 0.25) {
    return {
      mode: "balanced",
      label: "Estratégia equilibrada",
      explanation:
        "A Home2Flight aplicou buffers moderados de acordo com os sinais operacionais ativos.",
    };
  }

  return {
    mode: "lean",
    label: "Estratégia leve",
    explanation:
      "A Home2Flight encontrou poucos sinais de risco e manteve buffers reduzidos.",
  };
}

function buildRecommendations(domainResults, totalBuffer, profile) {
  const recommendations = [];

  if (domainResults.route?.bufferMinutes >= 30) {
    recommendations.push({
      priority: "high",
      type: "route_margin",
      title: "Sair com margem adicional",
      reasoning:
        "Os sinais de rota/acesso ao aeroporto justificam margem adicional antes da saída.",
    });
  }

  if (domainResults.airport?.bufferMinutes >= 35) {
    recommendations.push({
      priority: "high",
      type: "airport_margin",
      title: "Chegar ao aeroporto mais cedo",
      reasoning:
        "Os sinais aeroportuários indicam variabilidade em check-in, segurança ou terminal.",
    });
  }

  if (profile.bags) {
    recommendations.push({
      priority: "medium",
      type: "bag_drop",
      title: "Manter margem para bag drop",
      reasoning:
        "Bagagem de porão adiciona dependência operacional antes da segurança.",
    });
  }

  if (profile.kids) {
    recommendations.push({
      priority: "medium",
      type: "kids_buffer",
      title: "Preservar margem por viajar com crianças",
      reasoning:
        "Viajar com crianças aumenta pequenas fricções acumuladas ao longo da jornada.",
    });
  }

  if (totalBuffer > 90) {
    recommendations.push({
      priority: "critical",
      type: "buffer_review",
      title: "Plano muito conservador",
      reasoning:
        "A margem total está elevada. Deve ser explicada claramente ao utilizador.",
    });
  }

  return recommendations;
}

export default async function handler(req, res) {
  try {
    const signals = Array.isArray(req.body?.signals)
      ? req.body.signals
      : [];

    const profile = {
      bags: Boolean(req.body?.profile?.bags),
      kids: Boolean(req.body?.profile?.kids),
      checkedIn: Boolean(req.body?.profile?.checkedIn),
      fastTrack: Boolean(req.body?.profile?.fastTrack),
      priorityBoarding: Boolean(req.body?.profile?.priorityBoarding),
      flightType: req.body?.profile?.flightType || "schengen",
      transport: req.body?.profile?.transport || "car",
    };

    const domainResults = groupByDomain(signals, profile);

    const uncappedTotal = Object.values(domainResults).reduce(
      (sum, domain) => sum + domain.bufferMinutes,
      0
    );

    const totalCap = getTotalCap(profile);
    const totalBufferMinutes = clamp(uncappedTotal, 0, totalCap);

    const posture = buildOperationalPosture(totalBufferMinutes, profile);

    return res.status(200).json({
      success: true,
      engine: "Home2Flight Buffer Governance Engine",
      version: "1.0.0-foundation",
      generatedAt: new Date().toISOString(),

      profile,

      summary: {
        inputSignalCount: signals.length,
        totalCap,
        uncappedTotal,
        totalBufferMinutes,
        capped: uncappedTotal > totalCap,
        posture,
      },

      domains: domainResults,

      recommendations: buildRecommendations(
        domainResults,
        totalBufferMinutes,
        profile
      ),

      limitations: [
        "Primeira versão heurística de governação de buffers.",
        "Ainda sem calibração histórica real por aeroporto/companhia.",
        "Ainda sem aprendizagem automática baseada em previsão vs realidade.",
      ],
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      engine: "Home2Flight Buffer Governance Engine",
      error: error.message,
    });
  }
}