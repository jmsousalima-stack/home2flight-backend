"use client";

function formatTime(dateString) {
  if (!dateString) return "--:--";

  return new Date(dateString).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getReliabilityLabel(score) {
  if (score >= 75) return "High";
  if (score >= 50) return "Medium";
  return "Low";
}

function getConfidenceLabel(score) {
  if (score >= 75) return "High trust";
  if (score >= 50) return "Medium trust";
  return "Low trust";
}

export default function DepartureDecisionCard({ timelineData }) {
  const reliabilityScore =
    timelineData?.reliability?.score || 0;

  const confidenceScore =
    timelineData?.confidence?.score || 0;

  const departureTime = formatTime(
    timelineData?.decision?.leaveHomeTime
  );

  const airportRisk =
    timelineData?.airportIntelligence?.operationalIntelligence
      ?.airportRisk || "unknown";

  const headline =
    timelineData?.uiSummary?.headline ||
    "Operational decision generated.";

  const shortMessage =
    timelineData?.uiSummary?.shortMessage ||
    "Timeline generated dynamically.";

  return (
    <section
      style={{
        background:
          "linear-gradient(180deg, #14213d 0%, #091224 100%)",
        borderRadius: 38,
        padding: 22,
        color: "white",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow:
          "0 24px 60px rgba(0,0,0,0.45)",
      }}
    >
      <div
        style={{
          marginBottom: 22,
        }}
      >
        <div
          style={{
            color: "#98a2b3",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 2,
            marginBottom: 10,
          }}
        >
          Reliability Engine
        </div>

        <h2
          style={{
            fontSize: 42,
            lineHeight: 0.95,
            letterSpacing: "-2px",
            fontWeight: 950,
            margin: "0 0 14px",
          }}
        >
          Fiabilidade
          <br />
          operacional
        </h2>

        <p
          style={{
            color: "#c7d2e3",
            lineHeight: 1.45,
            fontSize: 16,
            margin: 0,
          }}
        >
          {headline}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 18,
        }}
      >
        <MetricCard
          title="Reliability"
          value={reliabilityScore}
          label={getReliabilityLabel(reliabilityScore)}
          accent="#f7b733"
        />

        <MetricCard
          title="Confidence"
          value={confidenceScore}
          label={getConfidenceLabel(confidenceScore)}
          accent="#5ea0ff"
        />
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          borderRadius: 28,
          padding: 22,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            color: "#98a2b3",
            fontSize: 14,
            fontWeight: 800,
            marginBottom: 14,
          }}
        >
          Recommended departure
        </div>

        <div
          style={{
            fontSize: 58,
            lineHeight: 1,
            fontWeight: 950,
            letterSpacing: "-3px",
            marginBottom: 14,
          }}
        >
          {departureTime}
        </div>

        <div
          style={{
            color: "#c7d2e3",
            fontSize: 16,
            lineHeight: 1.4,
          }}
        >
          {shortMessage}
        </div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.04)",
          borderRadius: 24,
          padding: 18,
        }}
      >
        <div
          style={{
            color: "#98a2b3",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 2,
            marginBottom: 14,
          }}
        >
          WHY THIS TIME?
        </div>

        <ReasonRow
          label="Airport"
          value={airportRisk}
        />

        <ReasonRow
          label="Transport"
          value={timelineData?.userContext?.transport || "unknown"}
        />

        <ReasonRow
          label="Check-in"
          value={
            timelineData?.userContext?.checkedIn
              ? "confirmed"
              : "pending"
          }
        />

        <ReasonRow
          label="Children"
          value={
            timelineData?.userContext?.kids
              ? "travelling"
              : "none"
          }
        />
      </div>
    </section>
  );
}

function MetricCard({
  title,
  value,
  label,
  accent,
}) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        borderRadius: 24,
        padding: 18,
      }}
    >
      <div
        style={{
          color: "#98a2b3",
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 12,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 56,
          lineHeight: 1,
          fontWeight: 950,
          marginBottom: 10,
        }}
      >
        {value}
      </div>

      <div
        style={{
          color: accent,
          fontSize: 16,
          fontWeight: 800,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function ReasonRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: "#22c55e",
            boxShadow:
              "0 0 14px rgba(34,197,94,0.9)",
          }}
        />

        <div>
          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
            }}
          >
            {label}
          </div>

          <div
            style={{
              color: "#98a2b3",
              fontSize: 14,
            }}
          >
            Operational factor
          </div>
        </div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          borderRadius: 999,
          padding: "8px 14px",
          fontWeight: 800,
          color: "#22c55e",
          textTransform: "capitalize",
        }}
      >
        {value}
      </div>
    </div>
  );
}