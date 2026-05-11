"use client";

export default function LivePulseIndicator({
  status = "connected",
  label = "Live sync",
  lastSyncText = "updated just now",
  source = "operational engine",
}) {
  const config = getStatusConfig(status);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 999,
        padding: "9px 12px",
        color: "#e5e7eb",
        width: "fit-content",
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: config.color,
          boxShadow: `0 0 16px ${config.glow}`,
          position: "relative",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 999,
            background: config.color,
            animation: "h2fLivePulse 1.8s ease-in-out infinite",
          }}
        />
      </span>

      <span
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          lineHeight: 1.05,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            color: config.color,
          }}
        >
          {label}
        </span>

        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#94a3b8",
          }}
        >
          {lastSyncText} · {source}
        </span>
      </span>

      <style>{`
        @keyframes h2fLivePulse {
          0% {
            transform: scale(1);
            opacity: 0.65;
          }
          60% {
            transform: scale(2.2);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

function getStatusConfig(status) {
  switch (status) {
    case "syncing":
      return {
        color: "#60a5fa",
        glow: "rgba(96,165,250,0.75)",
      };

    case "warning":
      return {
        color: "#f59e0b",
        glow: "rgba(245,158,11,0.75)",
      };

    case "offline":
      return {
        color: "#ef4444",
        glow: "rgba(239,68,68,0.75)",
      };

    default:
      return {
        color: "#22c55e",
        glow: "rgba(34,197,94,0.75)",
      };
  }
}