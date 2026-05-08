export default function DepartureDecisionCard({ data }) {
  if (!data) return null;

  const statusColor =
    data?.uiSummary?.status === "critical"
      ? "#ff4d4f"
      : data?.uiSummary?.status === "warning"
      ? "#faad14"
      : "#52c41a";

  return (
    <div
      style={{
        background: "#0f172a",
        borderRadius: 24,
        padding: 24,
        color: "white",
        border: `1px solid ${statusColor}`,
        boxShadow: `0 0 30px rgba(0,0,0,0.35)`,
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            color: statusColor,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          HOME2FLIGHT DECISION ENGINE
        </div>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {data.uiSummary.headline}
        </h1>

        <p
          style={{
            marginTop: 12,
            color: "#cbd5e1",
            fontSize: 16,
            lineHeight: 1.5,
          }}
        >
          {data.uiSummary.shortMessage}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        <div
          style={{
            background: "#111827",
            borderRadius: 18,
            padding: 18,
          }}
        >
          <div style={{ color: "#94a3b8", fontSize: 13 }}>
            Reliability
          </div>

          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              marginTop: 8,
            }}
          >
            {data.reliability.score}
          </div>

          <div
            style={{
              marginTop: 6,
              color: "#facc15",
              fontWeight: 600,
            }}
          >
            {data.uiSummary.reliabilityLabel}
          </div>
        </div>

        <div
          style={{
            background: "#111827",
            borderRadius: 18,
            padding: 18,
          }}
        >
          <div style={{ color: "#94a3b8", fontSize: 13 }}>
            Confidence
          </div>

          <div
            style={{
              fontSize: 36,
              fontWeight: 800,
              marginTop: 8,
            }}
          >
            {data.confidence.score}
          </div>

          <div
            style={{
              marginTop: 6,
              color: "#60a5fa",
              fontWeight: 600,
            }}
          >
            {data.uiSummary.confidenceLabel}
          </div>
        </div>
      </div>

      <div
        style={{
          background: "#111827",
          borderRadius: 18,
          padding: 20,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            marginBottom: 12,
            fontSize: 15,
          }}
        >
          Recommended Departure
        </div>

        <div
          style={{
            fontSize: 42,
            fontWeight: 800,
            lineHeight: 1,
          }}
        >
          {new Date(
            data.decision.leaveHomeTime
          ).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>

        <div
          style={{
            marginTop: 10,
            color: "#94a3b8",
          }}
        >
          Leave home recommendation
        </div>
      </div>
    </div>
  );
}
