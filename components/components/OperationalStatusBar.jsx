"use client";

export default function OperationalStatusBar({
  status = "LIVE MONITORING",
  engines = 4,
  updated = "Updated just now",
  risk = "MEDIUM OPERATIONAL PRESSURE",
}) {
  return (
    <div
      style={{
        background: "rgba(15,23,42,0.72)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 22,
        padding: "14px 16px",
        marginBottom: 18,
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.22)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: "#22c55e",
              boxShadow: "0 0 16px #22c55e",
              animation: "pulse 1.8s infinite",
            }}
          />

          <div>
            <div
              style={{
                color: "#f8fafc",
                fontSize: 14,
                fontWeight: 900,
                letterSpacing: 1.4,
              }}
            >
              {status}
            </div>

            <div
              style={{
                color: "#94a3b8",
                fontSize: 12,
                marginTop: 2,
              }}
            >
              {updated}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.06)",
              borderRadius: 999,
              padding: "8px 12px",
              color: "#e2e8f0",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {engines} engines active
          </div>

          <div
            style={{
              background: "rgba(245,158,11,0.12)",
              border: "1px solid rgba(245,158,11,0.22)",
              borderRadius: 999,
              padding: "8px 12px",
              color: "#fbbf24",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            {risk}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% {
            opacity: 1;
            transform: scale(1);
          }

          50% {
            opacity: 0.45;
            transform: scale(1.18);
          }

          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
