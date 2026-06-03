// /lib/engines/operational-signal-fusion-engine.js

const ENGINE_VERSION = "1.0.0-foundation";

function getSignalDomain(signal) {
  const affects = signal?.affects || [];

  if (
    affects.includes("airport") ||
    affects.includes("security") ||
    affects.includes("terminal_access")
  ) {
    return "airport";
  }

  if (
    affects.includes("route") ||
    affects.includes("airport_access")
  ) {
    return "route";
  }

  if (
    affects.includes("flight") ||
    affects.includes("departure_time")
  ) {
    return "flight";
  }

  if (
    affects.includes("passport_control") ||
    affects.includes("gate_timing") ||
    affects.includes("boarding")
  ) {
    return "gate";
  }

  if (
    affects.includes("check_in") ||
    affects.includes("bag_drop")
  ) {
    return "airport";
  }

  return "general";
}

function buildSignalFingerprint(signal) {
  return [
    signal.type || "",
    signal.title || "",
    getSignalDomain(signal),
  ].join("|");
}

export async function runOperationalSignalFusion({
  signals = [],
} = {}) {
  const generatedAt = new Date().toISOString();

  const uniqueSignals = [];
  const fingerprints = new Set();

  for (const signal of signals) {
    const fingerprint = buildSignalFingerprint(signal);

    if (fingerprints.has(fingerprint)) {
      continue;
    }

    fingerprints.add(fingerprint);
    uniqueSignals.push(signal);
  }

  const groupedDomains = {
    flight: [],
    airport: [],
    route: [],
    gate: [],
    general: [],
  };

  for (const signal of uniqueSignals) {
    const domain = getSignalDomain(signal);

    if (!groupedDomains[domain]) {
      groupedDomains[domain] = [];
    }

    groupedDomains[domain].push(signal);
  }

  const summary = {
    originalSignals: signals.length,
    fusedSignals: uniqueSignals.length,
    removedDuplicates:
      signals.length - uniqueSignals.length,
  };

  return {
    success: true,
    engine: "Home2Flight Operational Signal Fusion Engine",
    version: ENGINE_VERSION,
    generatedAt,

    summary,

    groupedDomains,

    signals: uniqueSignals,
  };
}

export default runOperationalSignalFusion;