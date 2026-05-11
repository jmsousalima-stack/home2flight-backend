"use client";

function getPressureConfig(state) {
  switch (state) {
    case "critical_pressure":
      return {
        label: "CRITICAL OPERATIONAL PRESSURE",
        color: "#ef4444",
        glow: "rgba(239,68,68,0.45)",
      };

    case "controlled_pressure":
      return {
        label: "MEDIUM OPERATIONAL PRESSURE",
        color: "#f59e0b",
        glow: "rgba(245,158,11,0.35)",
      };

    default:
      return {
        label: "STABLE OPERATIONAL FLOW",
        color: "#22c55e",
        glow: "rgba(34,197,94,0.35)",
      };
  }
}

export default function LiveOperationalMonitor({ monitor }) {
  if (!monitor) return null;

  const pressure = getPressureConfig(monitor.operationalState);

  const currentFocus = monitor.currentFocus || {};
  const nextAction = monitor.nextAction || {};
  const refreshPolicy = monitor.refreshPolicy || {};
  const activeSignals = monitor.activeSignals || {};

  return (
    <section
      style={{
        background:
          "linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(2,6,23,1) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 30,
        padding: 22,
        color: "white",
        boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 999,
                background: "#22c55e",
                boxShadow: "0 0 18px rgba(34,197,94,0.85)",
              }}
            />

            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                letterSpacing: 3,
              }}
            >
              LIVE OPERATIONAL MONITORING
            </div>
          </div>

          <div
            style={{
              color: "#94a3b8",
              fontSize: 15,
            }}
          >
            Updated just now
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: 999,
            padding: "10px 16px",
            color: "#e2e8f0",
            fontSize: 14,
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
        >
          {activeSignals.totalSignals || 0} engines active
        </div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          borderRadius: 26,
          padding: 20,
          marginBottom: 18,
          border: `1px solid ${pressure.glow}`,
        }}
      >
        <div
          style={{
            color: pressure.color,
            fontSize: 15,
            fontWeight: 900,
            marginBottom: 10,
            letterSpacing: 1,
          }}
        >
          {pressure.label}
        </div>

        <div
          style={{
            fontSize: 40,
            lineHeight: 1,
            fontWeight: 950,
            marginBottom: 10,
          }}
        >
          {currentFocus.title || "Operational monitoring"}
        </div>

        <div
          style={{
            color: "#cbd5e1",
            fontSize: 17,
            lineHeight: 1.45,
          }}
        >
          {nextAction.message ||
            "The operational engine is monitoring all active layers."}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 16,
        }}
      >
        <MetricCard
          title="Refresh"
          value={`${refreshPolicy.recommendedIntervalSeconds || 60}s`}
          subtitle="dynamic polling"
        />

        <MetricCard
          title="Signals"
          value={activeSignals.totalSignals || 0}
          subtitle="live operational inputs"
        />
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <SignalPill
          label={`${activeSignals.monitoringItems || 0} monitoring`}
        />

        <SignalPill
          label={`${activeSignals.bufferItems || 0} buffer layers`}
        />

        <SignalPill
          label={`${activeSignals.riskItems || 0} risk events`}
        />

        <SignalPill label={monitor.liveMode || "live mode"} />
      </div>
    </section>
  );
}

function MetricCard({ title, value, subtitle }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        borderRadius: 22,
        padding: 18,
      }}
    >
      <div
        style={{
          color: "#94a3b8",
          fontSize: 13,
          fontWeight: 800,
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 38,
          lineHeight: 1,
          fontWeight: 950,
          marginBottom: 10,
        }}
      >
        {value}
      </div>

      <div
        style={{
          color: "#60a5fa",
          fontSize: 14,
          fontWeight: 700,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

function SignalPill({ label }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        borderRadius: 999,
        padding: "10px 14px",
        color: "#cbd5e1",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {label}
    </div>
  );
}