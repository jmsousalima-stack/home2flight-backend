export default function DepartureDecisionCard({ data }) {
  return (
    <div
      style={{
        background: "linear-gradient(180deg, #0f172a 0%, #111c44 100%)",
        borderRadius: 28,
        padding: 22,
        border: "1px solid rgba(245,158,11,0.7)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -90,
          right: -90,
          width: 190,
          height: 190,
          borderRadius: "50%",
          background: "rgba(59,130,246,0.18)",
          filter: "blur(36px)",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: "#f59e0b",
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: 2,
              marginBottom: 10,
            }}
          >
            HOME2FLIGHT ENGINE
          </div>

          <div
            style={{
              color: "white",
              fontSize: 34,
              lineHeight: 1.05,
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
            padding: "7px 10px",
            borderRadius: 999,
            fontWeight: 800,
            fontSize: 11,
            border: "1px solid rgba(239,68,68,0.3)",
            whiteSpace: "nowrap",
            marginTop: 26,
          }}
        >
          SENSITIVE
        </div>
      </div>

      <div
        style={{
          color: "#cbd5e1",
          fontSize: 18,
          lineHeight: 1.35,
          position: "relative",
          zIndex: 1,
        }}
      >
        {data.uiSummary.shortMessage}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          position: "relative",
          zIndex: 1,
        }}
      >
        <MetricBox
          label="Reliability"
          value={data.reliability.score}
          caption={data.uiSummary.reliabilityLabel}
          color="#facc15"
        />

        <MetricBox
          label="Confidence"
          value={data.confidence.score}
          caption={data.uiSummary.confidenceLabel}
          color="#60a5fa"
        />
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          borderRadius: 22,
          padding: 18,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            color: "#94a3b8",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          Recommended departure
        </div>

        <div
          style={{
            marginTop: 6,
            color: "white",
            fontSize: 54,
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          {new Date(data.decision.leaveHomeTime).toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>

        <div
          style={{
            marginTop: 8,
            color: "#94a3b8",
            fontSize: 15,
          }}
        >
          Leave home recommendation
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          position: "relative",
          zIndex: 1,
        }}
      >
        {data.uiSummary.mainRiskFactors.slice(0, 3).map((risk, index) => (
          <div
            key={index}
            style={{
              background: "rgba(255,255,255,0.07)",
              color: "#cbd5e1",
              padding: "8px 10px",
              borderRadius: 999,
              fontSize: 12,
              lineHeight: 1.2,
              maxWidth: "100%",
            }}
          >
            {risk}
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricBox({ label, value, caption, color }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        borderRadius: 20,
        padding: 16,
      }}
    >
      <div
        style={{
          color: "#94a3b8",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {label}
      </div>

      <div
        style={{
          marginTop: 8,
          color: "white",
          fontSize: 42,
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        {value}
      </div>

      <div
        style={{
          marginTop: 8,
          color,
          fontSize: 16,
          fontWeight: 800,
          lineHeight: 1.15,
        }}
      >
        {caption}
      </div>
    </div>
  );
}
