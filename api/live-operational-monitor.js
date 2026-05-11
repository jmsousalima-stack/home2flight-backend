export default async function handler(req, res) {
  const flight = String(req.query.flight || "AF1195").toUpperCase();
  const origin = String(req.query.origin || "Lisboa");
  const airport = String(req.query.airport || "LIS").toUpperCase();
  const mode = String(req.query.mode || "car");

  const baseUrl = getBaseUrl(req);

  try {
    const engineUrl = `${baseUrl}/api/home2flight-engine?flight=${encodeURIComponent(
      flight
    )}&origin=${encodeURIComponent(origin)}&airport=${encodeURIComponent(
      airport
    )}&mode=${encodeURIComponent(mode)}`;

    const response = await fetch(engineUrl);
    const data = await response.json();

    if (!data?.success) {
      return res.status(200).json(buildFallbackResponse({ flight, origin, airport, mode }));
    }

    const monitor = buildLiveMonitor(data);

    return res.status(200).json({
      success: true,
      generatedAt: new Date().toISOString(),
      engine: "Home2Flight Live Operational Monitor",
      version: "0.1.0",
      request: {
        flight,
        origin,
        airport,
        mode,
      },
      liveOperationalMonitor: monitor,
      decision: data.decision,
      timeline: data.timeline || [],
      sourceBreakdown: {
        baseEngine: "home2flight-engine",
        monitoringLayer: "live-operational-monitor",
        refreshMode: "smart-polling-ready",
      },
      diagnostics: {
        baseEngineReachable: true,
        timelineItems: Array.isArray(data.timeline) ? data.timeline.length : 0,
        operationalRisk: data?.decision?.operationalRisk || "unknown",
        dynamicBufferMinutes: data?.decision?.dynamicBufferMinutes || 0,
      },
    });
  } catch (error) {
    return res.status(200).json({
      ...buildFallbackResponse({ flight, origin, airport, mode }),
      diagnostics: {
        error: error.message,
      },
    });
  }
}

function getBaseUrl(req) {
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;

  return `${protocol}://${host}`;
}

function buildLiveMonitor(data) {
  const timeline = data.timeline || [];
  const decision = data.decision || {};

  const riskItems = timeline.filter((item) => item.status === "risk");
  const bufferItems = timeline.filter((item) => item.status === "buffer");
  const monitoringItems = timeline.filter(
    (item) =>
      item.recalculationStatus === "monitoring" ||
      item.recalculationStatus === "recalculated" ||
      item.recalculationStatus === "risk_adjusted"
  );

  const currentFocus = getCurrentFocus(timeline);
  const operationalState = getOperationalState(decision.operationalRisk);
  const nextAction = getNextAction(currentFocus, decision);
  const events = buildOperationalEvents(timeline, decision);

  return {
    status: "active",
    liveMode: "smart_polling",
    operationalState,
    currentFocus,
    nextAction,
    activeSignals: {
      riskItems: riskItems.length,
      bufferItems: bufferItems.length,
      monitoringItems: monitoringItems.length,
      totalSignals: riskItems.length + bufferItems.length + monitoringItems.length,
    },
    refreshPolicy: {
      recommendedIntervalSeconds: getRefreshInterval(decision.operationalRisk),
      reason: getRefreshReason(decision.operationalRisk),
    },
    operationalEvents: events,
    userFacingSummary: buildUserSummary({
      decision,
      currentFocus,
      riskItems,
      bufferItems,
    }),
  };
}

function getCurrentFocus(timeline) {
  const now = Date.now();

  const futureItems = timeline
    .filter((item) => item.time)
    .map((item) => ({
      ...item,
      timestamp: new Date(item.time).getTime(),
    }))
    .filter((item) => !Number.isNaN(item.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);

  const nextItem =
    futureItems.find((item) => item.timestamp >= now) ||
    futureItems[futureItems.length - 1] ||
    null;

  if (!nextItem) {
    return {
      status: "unknown",
      title: "Operational focus unavailable",
      category: null,
      time: null,
      minutesUntil: null,
    };
  }

  const minutesUntil = Math.round((nextItem.timestamp - now) / 60000);

  return {
    status: minutesUntil <= 30 ? "urgent" : "upcoming",
    id: nextItem.id,
    title: nextItem.title,
    category: nextItem.category,
    time: nextItem.time,
    localTime: new Date(nextItem.time).toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    minutesUntil,
  };
}

function getOperationalState(risk) {
  if (risk === "high") return "high_pressure";
  if (risk === "medium") return "controlled_pressure";
  if (risk === "low") return "stable_monitoring";

  return "monitoring";
}

function getNextAction(currentFocus, decision) {
  if (!currentFocus || currentFocus.status === "unknown") {
    return {
      priority: "manual_check",
      label: "Validate trip manually",
      message: "A Home2Flight ainda não conseguiu determinar o próximo passo operacional.",
    };
  }

  if (currentFocus.status === "urgent") {
    return {
      priority: "high",
      label: currentFocus.title,
      message: `Próximo passo operacional às ${currentFocus.localTime}. Mantém este passo em foco.`,
    };
  }

  return {
    priority: decision?.operationalRisk === "high" ? "medium" : "normal",
    label: currentFocus.title,
    message: `Próximo passo previsto: ${currentFocus.title} às ${currentFocus.localTime}.`,
  };
}

function buildOperationalEvents(timeline, decision) {
  const events = [];

  if (decision?.dynamicBufferMinutes > 0) {
    events.push({
      type: "buffer_applied",
      severity: decision.operationalRisk === "high" ? "high" : "medium",
      label: `Dynamic buffer +${decision.dynamicBufferMinutes} min`,
      message: "A timeline foi recalculada com margem operacional dinâmica.",
    });
  }

  timeline.forEach((item) => {
    if (item.status === "risk") {
      events.push({
        type: "risk_step",
        severity: "high",
        label: item.title,
        message: item.liveInsight || item.reasoning || "Risco operacional detetado.",
      });
    }

    if (item.status === "buffer") {
      events.push({
        type: "buffer_step",
        severity: "medium",
        label: item.title,
        message: item.liveInsight || item.reasoning || "Buffer operacional aplicado.",
      });
    }
  });

  return events.slice(0, 6);
}

function getRefreshInterval(risk) {
  if (risk === "high") return 30;
  if (risk === "medium") return 60;
  return 120;
}

function getRefreshReason(risk) {
  if (risk === "high") {
    return "Risco operacional elevado. A monitorização deve ser mais frequente.";
  }

  if (risk === "medium") {
    return "Risco operacional moderado. A monitorização deve manter atualização regular.";
  }

  return "Operação estável. Monitorização periódica suficiente.";
}

function buildUserSummary({ decision, currentFocus, riskItems, bufferItems }) {
  const departure = decision?.recommendedDepartureLocal || "--:--";

  if (riskItems.length > 0) {
    return `A Home2Flight está a monitorizar risco operacional ativo. Mantém a recomendação de saída às ${departure} sob vigilância.`;
  }

  if (bufferItems.length > 0) {
    return `A Home2Flight aplicou buffer dinâmico e recomenda sair às ${departure}. Próximo foco: ${currentFocus?.title || "monitorização operacional"}.`;
  }

  return `A Home2Flight mantém plano operacional estável. Saída recomendada às ${departure}.`;
}

function buildFallbackResponse({ flight, origin, airport, mode }) {
  return {
    success: false,
    generatedAt: new Date().toISOString(),
    engine: "Home2Flight Live Operational Monitor",
    version: "0.1.0",
    request: {
      flight,
      origin,
      airport,
      mode,
    },
    liveOperationalMonitor: {
      status: "fallback",
      liveMode: "safe_fallback",
      operationalState: "manual_validation_required",
      currentFocus: {
        status: "unknown",
        title: "Manual validation required",
      },
      nextAction: {
        priority: "manual_check",
        label: "Validate trip manually",
        message: "Não foi possível carregar o motor operacional ao vivo.",
      },
      refreshPolicy: {
        recommendedIntervalSeconds: 120,
        reason: "Fallback seguro ativo.",
      },
      operationalEvents: [],
      userFacingSummary:
        "Não foi possível obter monitorização operacional ao vivo. A app deve pedir validação manual.",
    },
  };
}