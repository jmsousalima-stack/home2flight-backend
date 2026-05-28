// /lib/engines/buffer-governance-engine.js

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
  const sorted = [...buffers].sort(
    (a, b) => b.adjustedBuffer - a.adjustedBuffer
  );

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

    const governedBuffer = Math.round(
      item.adjustedBuffer * multiplier
    );

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
  const base =
    profile.flightType === "passport" ? 95 : 80;

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
      rawBuffer: parseNumber(
        signal.extraBufferMinutes,
        0
      ),
      adjustedBuffer: calculateSignalBuffer(signal),
      reasoning: signal.reasoning,
      domain,
    });
  }

  const domainResults = {};

  for (const domain of Object.keys(grouped)) {
    const result = applyDiminishingReturns(
      grouped[domain]
    );

    const cap = getDomainCap(
      domain,
      profile.flightType
    );

    const cappedBuffer = clamp(
      result.total,
      0,
      cap
    );

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

function buildOperationalPosture(
  totalBuffer,
  profile
) {
  const totalCap = getTotalCap(profile);

  const ratio =
    totalCap > 0 ? totalBuffer / totalCap : 0;

  if (ratio >= 0.8) {
    return {
      mode: "ultra_conservative",
      label: "Estratégia muito conservadora",
    };
  }

  if (ratio >= 0.5) {
    return {
      mode: "conservative",
      label: "Estratégia conservadora",
    };
  }

  if (ratio >= 0.25) {
    return {
      mode: "balanced",
      label: "Estratégia equilibrada",
    };
  }

  return {
    mode: "lean",
    label: "Estratégia leve",
  };
}

export function runBufferGovernance({
  signals = [],
  profile = {},
}) {
  const domainResults = groupByDomain(
    signals,
    profile
  );

  const uncappedTotal = Object.values(
    domainResults
  ).reduce(
    (sum, domain) => sum + domain.bufferMinutes,
    0
  );

  const totalCap = getTotalCap(profile);

  const totalBufferMinutes = clamp(
    uncappedTotal,
    0,
    totalCap
  );

  const posture = buildOperationalPosture(
    totalBufferMinutes,
    profile
  );

  return {
    success: true,

    summary: {
      inputSignalCount: signals.length,
      totalCap,
      uncappedTotal,
      totalBufferMinutes,
      capped: uncappedTotal > totalCap,
      posture,
    },

    domains: domainResults,
  };
}