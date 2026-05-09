export default function DepartureDecisionCard({ data }) {
  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, #0f172a 0%, #111c44 100%)",
        borderRadius: 36,
        padding: 28,
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 20px 80px rgba(0,0,0,0.45)",
        display: "flex",
        flexDirection: "column",
        gap: 28,
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
          borderRadius: "50%",
          background: "rgba(59,130,246,0.15)",
          filter: "blur(40px)",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              color: "#f59e0b",
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: 2,
            }}
          >
            HOME2FLIGHT ENGINE
          </div>

          <div
            style={{
              marginTop: 10,
              color: "white",
              fontSize: 46,
              lineHeight: 1,
              fontWeight: 900,
            }}
          >
            {data.decision.headline}
          </div>
        </div>

        <div
          style={{
            background: "rgba(239,68,68,0.15)",
            color: "#fca5a5",
            padding: "10px 14px",
            borderRadius: 999,
            fontWeight: 700,
            fontSize: 14,
            border: "1px solid rgba(239,68,68,0.25)",
          }}
        >
          SENSITIVE
        </div>
      </div>

      <div
        style={{
          color: "#cbd5e1",
          fontSize: 24,
          lineHeight: 1.4,
        }}
      >
        {data.uiSummary.shortMessage}
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 140,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 26,
            padding: 22,
          }}
        >
          <div
            style={{
              color: "#94a3b8",
              fontSize: 18,
            }}
          >
            Reliability
          </div>

          <div
            style={{
              marginTop: 10,
              color: "white",
              fontSize: 64,
              fontWeight: 900,
            }}
          >
            {data.reliability.score}
          </div>

          <div
            style={{
              color: "#facc15",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            {data.uiSummary.reliabilityLabel}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 140,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 26,
            padding: 22,
          }}
        >
          <div
            style={{
              color: "#94a3b8",
              fontSize: 18,
            }}
          >
            Confidence
          </div>

          <div
            style={{
              marginTop: 10,
              color: "white",
              fontSize: 64,
              fontWeight: 900,
            }}
          >
            {data.confidence.score}
          </div>

          <div
            style={{
              color: "#60a5fa",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            {data.uiSummary.confidenceLabel}
          </div>
        </div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          borderRadius: 30,
          padding: 24,
        }}
      >
        <div
          style={{
            color: "#94a3b8",
            fontSize: 18,
          }}
        >
          Recommended Departure
        </div>

        <div
          style={{
            marginTop: 12,
            color: "white",
            fontSize: 82,
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          {new Date(
            data.decision.leaveHomeTime
          ).toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>

        <div
          style={{
            marginTop: 12,
            color: "#94a3b8",
            fontSize: 22,
          }}
        >
          Leave home recommendation
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {data.uiSummary.mainRiskFactors.map((risk, index) => (
          <div
            key={index}
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "#cbd5e1",
              padding: "10px 14px",
              borderRadius: 999,
              fontSize: 15,
            }}
          >
            {risk}
          </div>
        ))}
      </div>
    </div>
  );
}
