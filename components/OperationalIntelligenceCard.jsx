"use client";

function getConfidenceColor(score) {
  if (score >= 75) return "#22c55e";
  if (score >= 55) return "#f59e0b";
  return "#ef4444";
}

function getConfidenceLabel(score) {
  if (score >= 75) return "High operational trust";
  if (score >= 55) return "Moderate operational trust";
  return "Reduced operational trust";
}

function getRiskLabel(score) {
  if (score >= 75) return "Stable";
  if (score >= 55) return "Sensitive";
  return "Fragile";
}

export default function OperationalIntelligenceCard({
  reliability,
  confidence,
  airportIntelligence,
}) {
  const reliabilityScore = reliability?.score || 0;
  const confidenceScore = confidence?.score || 0;

  const confidenceColor = getConfidenceColor(confidenceScore);

  const operational =
    airportIntelligence?.operationalIntelligence || {};

  const flags =
    airportIntelligence?.intelligenceFlags || [];

  return (
    <section
      style={{
        padding: "32px 22px",
        background:
          "linear-gradient(180deg, #04112b 0%, #061537 100%)",
        color: "#ffffff",
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            fontSize: 13,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#7c8db5",
            fontWeight: 900,
            marginBottom: 12,
          }}
        >
          Operational Intelligence
        </div>

        <h2
          style={{
            fontSize: "clamp(42px, 10vw, 64px)",
            lineHeight: 0.92,
            letterSpacing: "-3px",
            margin: 0,
            fontWeight: 950,
          }}
        >
          Operational
          <br />
          confidence
        </h2>

        <p
          style={{
            marginTop: 18,
            color: "#b7c3df",
            lineHeight: 1.45,
            fontSize: 18,
            maxWidth: 420,
          }}
        >
          Dynamic airport intelligence generated from operational,
          transport and passenger context layers.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <MetricCard
          title="Reliability"
          value={reliabilityScore}
          label={getRiskLabel(reliabilityScore)}
          color="#f8b133"
        />

        <MetricCard
          title="Confidence"
          value={confidenceScore}
          label={getConfidenceLabel(confidenceScore)}
          color={confidenceColor}
        />
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 28,
          padding: 22,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontSize: 12,
            letterSpacing: 2,
            fontWeight: 900,
            color: "#8ea0c8",
            marginBottom: 14,
          }}
        >
          AIRPORT INTELLIGENCE
        </div>

        <InsightRow
          title="Airport risk"
          value={operational.airportRisk || "Unknown"}
        />

        <InsightRow
          title="Security estimation"
          value={`${operational.estimatedSecurityMinutes || 0} min`}
        />

        <InsightRow
          title="Internal walking"
          value={`${operational.estimatedWalkingMinutes || 0} min`}
        />

        <InsightRow
          title="Recommended airport buffer"
          value={`${operational.recommendedAirportBuffer || 0} min`}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {flags.map((flag, index) => (
          <SignalCard key={index} flag={flag} />
        ))}
      </div>
    </section>
  );
}

function MetricCard({ title, value, label, color }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        borderRadius: 28,
        padding: 20,
      }}
    >
      <div
        style={{
          color: "#8ea0c8",
          fontSize: 14,
          marginBottom: 18,
          fontWeight: 700,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 72,
          lineHeight: 0.9,
          fontWeight: 950,
          marginBottom: 16,
        }}
      >
        {value}
      </div>

      <div
        style={{
          color,
          fontWeight: 900,
          fontSize: 18,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function InsightRow({ title, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          color: "#8ea0c8",
          fontSize: 15,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: "#ffffff",
          fontWeight: 800,
          textTransform: "capitalize",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SignalCard({ flag }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 22,
        padding: 18,
      }}
    >
      <div
        style={{
          color: "#ffffff",
          fontWeight: 800,
          fontSize: 16,
          marginBottom: 6,
        }}
      >
        {flag.label}
      </div>

      <div
        style={{
          color: "#9fb0d1",
          fontSize: 14,
        }}
      >
        Operational signal detected by intelligence layer.
      </div>
    </div>
  );
}