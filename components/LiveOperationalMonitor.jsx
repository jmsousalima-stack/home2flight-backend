"use client";

import LivePulseIndicator from "./LivePulseIndicator";

export default function LiveOperationalMonitor({
  monitor,
}) {
  if (!monitor) {
    return null;
  }

  const focus =
    monitor?.currentFocus || {};

  const refreshPolicy =
    monitor?.refreshPolicy || {};

  const signals =
    monitor?.activeSignals || {};

  return (
    <section
      style={{
        background:
          "linear-gradient(180deg,#071028 0%,#020817 100%)",
        border:
          "1px solid rgba(255,255,255,0.08)",
        borderRadius: 34,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 22,
        boxShadow:
          "0 10px 40px rgba(0,0,0,0.28)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -120,
          width: 260,
          height: 260,
          borderRadius: 999,
          background:
            "radial-gradient(circle, rgba(59,130,246,0.18) 0%, rgba(59,130,246,0) 72%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 12,
                height: 42,
                borderRadius: 999,
                background:
                  "linear-gradient(180deg,#22c55e 0%,#16a34a 100%)",
                boxShadow:
                  "0 0 20px rgba(34,197,94,0.65)",
              }}
            />

            <div>
              <h2
                style={{
                  margin: 0,
                  color: "white",
                  fontSize: 25,
                  lineHeight: 1,
                  fontWeight: 900,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                }}
              >
                Live Operational
              </h2>

              <h2
                style={{
                  margin: "2px 0 0",
                  color: "white",
                  fontSize: 25,
                  lineHeight: 1,
                  fontWeight: 900,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                }}
              >
                Monitoring
              </h2>
            </div>
          </div>

          <p
            style={{
              margin: 0,
              color: "#94a3b8",
              fontSize: 15,
            }}
          >
            Updated just now
          </p>
        </div>

        <div
          style={{
            background:
              "rgba(255,255,255,0.06)",
            border:
              "1px solid rgba(255,255,255,0.05)",
            borderRadius: 999,
            padding: "12px 16px",
            color: "white",
            fontWeight: 800,
            fontSize: 16,
          }}
        >
          {monitor?.activeSignals?.totalSignals || 0}{" "}
          engines active
        </div>
      </div>

      <LivePulseIndicator
        status="connected"
        label="Live sync"
        lastSyncText={`refresh ${refreshPolicy?.recommendedIntervalSeconds || 60}s`}
        source={refreshPolicy?.reason || "operational intelligence"}
      />

      <div
        style={{
          border:
            "1px solid rgba(245,158,11,0.45)",
          borderRadius: 28,
          padding: 24,
          background:
            "linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.72) 100%)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <span
          style={{
            color: "#f59e0b",
            fontWeight: 900,
            letterSpacing: 1.6,
            fontSize: 17,
            textTransform: "uppercase",
          }}
        >
          Medium operational pressure
        </span>

        <h3
          style={{
            margin: 0,
            color: "white",
            fontSize: 62,
            lineHeight: 0.95,
            fontWeight: 900,
            letterSpacing: -2.5,
          }}
        >
          {focus?.title || "Operational monitoring"}
        </h3>

        <p
          style={{
            margin: 0,
            color: "#cbd5e1",
            fontSize: 18,
            lineHeight: 1.45,
            maxWidth: 620,
          }}
        >
          {focus?.nextAction?.message ||
            "Operational monitoring active."}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(160px,1fr))",
          gap: 14,
        }}
      >
        <MetricCard
          label="Refresh"
          value={`${refreshPolicy?.recommendedIntervalSeconds || 60}s`}
          description="dynamic polling"
        />

        <MetricCard
          label="Signals"
          value={
            signals?.totalSignals || 0
          }
          description="live operational inputs"
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
          label={`${signals?.monitoringItems || 0} monitoring`}
        />

        <SignalPill
          label={`${signals?.bufferItems || 0} buffer layers`}
        />

        <SignalPill
          label={`${signals?.riskItems || 0} risk events`}
        />

        <SignalPill
          label={
            monitor?.liveMode ||
            "smart_polling"
          }
        />
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  description,
}) {
  return (
    <div
      style={{
        background:
          "rgba(255,255,255,0.03)",
        border:
          "1px solid rgba(255,255,255,0.04)",
        borderRadius: 26,
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <span
        style={{
          color: "#cbd5e1",
          fontWeight: 700,
          fontSize: 15,
        }}
      >
        {label}
      </span>

      <span
        style={{
          color: "white",
          fontSize: 52,
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        {value}
      </span>

      <span
        style={{
          color: "#60a5fa",
          fontWeight: 700,
          fontSize: 15,
        }}
      >
        {description}
      </span>
    </div>
  );
}

function SignalPill({ label }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 999,
        background:
          "rgba(255,255,255,0.05)",
        border:
          "1px solid rgba(255,255,255,0.04)",
        color: "#d1d5db",
        fontWeight: 700,
        fontSize: 15,
      }}
    >
      {label}
    </div>
  );
}