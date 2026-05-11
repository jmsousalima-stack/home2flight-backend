"use client";

function getDecision(data) {
  return data?.decision || {};
}

function getTimeline(data) {
  return data?.timeline || [];
}

function getSignals(data) {
  const timeline = getTimeline(data);

  return timeline.flatMap((item) => item.operationalSignals || []).slice(0, 4);
}

function getMainRisk(decision) {
  if (decision?.operationalRisk === "high") return "HIGH RISK";
  if (decision?.operationalRisk === "medium") return "BUFFER";
  return "STABLE";
}

function getRiskColor(risk) {
  if (risk === "HIGH RISK") return "#ef4444";
  if (risk === "BUFFER") return "#f59e0b";
  return "#22c55e";
}

function getReliabilityColor(score) {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#60a5fa";
  return "#f59e0b";
}

function getBriefing(data) {
  return (
    data?.decision?.summary ||
    "Operational intelligence active. Timeline generated with reliability weighting."
  );
}

function getDecisionFactors(data) {
  const airportRisk = data?.inputs?.airport?.operationalProfile?.riskLevel;
  const routeRisk = data?.inputs?.route?.operationalProfile?.trafficRisk;
  const flightStatus = data?.inputs?.flight?.flight?.status;
  const weatherRisk =
    data?.inputs?.weather?.operationalWeather?.impactLevel;

  return [
    {
      label: "Traffic",
      level:
        routeRisk === "high"
          ? "High"
          : routeRisk === "medium"
          ? "Moderate"
          : "Low",
      color:
        routeRisk === "high"
          ? "#ef4444"
          : routeRisk === "medium"
          ? "#f59e0b"
          : "#22c55e",
      explanation:
        routeRisk === "high"
          ? "Heavy operational variability detected."
          : routeRisk === "medium"
          ? "Dynamic route buffer applied."
          : "Stable access route.",
    },

    {
      label: "Airport",
      level:
        airportRisk === "high"
          ? "High"
          : airportRisk === "medium"
          ? "Moderate"
          : "Low",
      color:
        airportRisk === "high"
          ? "#ef4444"
          : airportRisk === "medium"
          ? "#f59e0b"
          : "#22c55e",
      explanation:
        airportRisk === "high"
          ? "Airport congestion risk detected."
          : airportRisk === "medium"
          ? "Moderate operational pressure."
          : "Airport operating normally.",
    },

    {
      label: "Flight",
      level:
        flightStatus === "delayed"
          ? "Moderate"
          : flightStatus === "cancelled"
          ? "Critical"
          : "Low",
      color:
        flightStatus === "cancelled"
          ? "#ef4444"
          : flightStatus === "delayed"
          ? "#f59e0b"
          : "#22c55e",
      explanation:
        flightStatus === "cancelled"
          ? "Flight disruption detected."
          : flightStatus === "delayed"
          ? "Flight monitoring active."
          : "Flight operating normally.",
    },

    {
      label: "Weather",
      level:
        weatherRisk === "high"
          ? "High"
          : weatherRisk === "medium"
          ? "Moderate"
          : "Low",
      color:
        weatherRisk === "high"
          ? "#ef4444"
          : weatherRisk === "medium"
          ? "#f59e0b"
          : "#22c55e",
      explanation:
        weatherRisk === "high"
          ? "Weather disruption risk detected."
          : weatherRisk === "medium"
          ? "Weather variability active."
          : "Weather conditions stable.",
    },
  ];
}

export default function DepartureDecisionCard({ timelineData }) {
  const decision = getDecision(timelineData);
  const timeline = getTimeline(timelineData);

  const riskLabel = getMainRisk(decision);
  const riskColor = getRiskColor(riskLabel);

  const reliabilityScore = decision?.globalReliabilityScore || 0;
  const confidenceScore = decision?.globalConfidenceScore || 0;

  const departureTime =
    decision?.recommendedDepartureLocal || "--:--";

  const briefingText = getBriefing(timelineData);

  const decisionFactors = getDecisionFactors(timelineData);

  const keySignals = getSignals(timelineData);

  return (
    <section
      style={{
        background:
          "radial-gradient(circle at top right, #1e3a8a 0%, #0f172a 45%, #020617 100%)",
        border: "1.5px solid rgba(236,72,153,0.35)",
        borderRadius: 34,
        padding: 24,
        color: "white",
        overflow: "hidden",
        boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 34,
        }}
      >
        <div
          style={{
            color: "#f59e0b",
            fontSize: 17,
            fontWeight: 900,
            letterSpacing: 4,
            lineHeight: 1.3,
          }}
        >
          HOME2FLIGHT
          <br />
          OPERATIONAL AI
        </div>

        <div
          style={{
            border: `1.5px solid ${riskColor}`,
            background: "rgba(255,255,255,0.08)",
            color: riskColor,
            padding: "12px 16px",
            borderRadius: 999,
            fontSize: 15,
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
        >
          {riskLabel}
        </div>
      </div>

      <h1
        style={{
          fontSize: "clamp(46px, 13vw, 68px)",
          lineHeight: 0.95,
          letterSpacing: "-2.5px",
          fontWeight: 950,
          margin: "0 0 26px",
        }}
      >
        Leave home
        <br />
        with
        <br />
        operational
        <br />
        confidence
      </h1>

      <GlassBlock label="OPERATIONAL BRIEFING">
        {briefingText}
      </GlassBlock>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <MetricCard
          title="Reliability"
          value={reliabilityScore}
          subtitle={decision?.trustLevel || "Unknown"}
          color={getReliabilityColor(reliabilityScore)}
        />

        <MetricCard
          title="Confidence"
          value={confidenceScore}
          subtitle="AI weighted"
          color="#60a5fa"
        />
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.08)",
          borderRadius: 24,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            color: "#94a3b8",
            fontSize: 15,
            fontWeight: 800,
            marginBottom: 8,
          }}
        >
          Recommended departure
        </div>

        <div
          style={{
            color: "white",
            fontSize: "clamp(56px, 16vw, 82px)",
            lineHeight: 1,
            fontWeight: 950,
            letterSpacing: "-2px",
          }}
        >
          {departureTime}
        </div>

        <div
          style={{
            marginTop: 8,
            color: "#94a3b8",
            fontSize: 17,
          }}
        >
          Dynamic operational recommendation
        </div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.075)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          padding: 18,
          marginBottom: keySignals.length ? 16 : 0,
        }}
      >
        <div
          style={{
            color: "#cbd5e1",
            fontSize: 13,
            fontWeight: 900,
            letterSpacing: 2.5,
            marginBottom: 14,
          }}
        >
          WHY THIS TIME?
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {decisionFactors.map((factor) => (
            <DecisionFactor
              key={factor.label}
              factor={factor}
            />
          ))}
        </div>
      </div>

      {keySignals.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {keySignals.map((signal, index) => (
            <div
              key={index}
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "#e2e8f0",
                borderRadius: 999,
                padding: "10px 14px",
                fontSize: 13,
                lineHeight: 1.25,
              }}
            >
              {signal.label}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function GlassBlock({ label, children }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 24,
        padding: 20,
        marginBottom: 18,
      }}
    >
      <div
        style={{
          color: "#cbd5e1",
          fontSize: 13,
          fontWeight: 900,
          letterSpacing: 3,
          marginBottom: 12,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: "#e5e7eb",
          fontSize: 17,
          lineHeight: 1.45,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function DecisionFactor({ factor }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "12px 1fr auto",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: factor.color,
          boxShadow: `0 0 16px ${factor.color}`,
        }}
      />

      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: "#f8fafc",
            fontSize: 14,
            fontWeight: 800,
            marginBottom: 2,
          }}
        >
          {factor.label}
        </div>

        <div
          style={{
            color: "#94a3b8",
            fontSize: 12,
            lineHeight: 1.25,
          }}
        >
          {factor.explanation}
        </div>
      </div>

      <div
        style={{
          color: factor.color,
          fontSize: 12,
          fontWeight: 900,
          background: "rgba(255,255,255,0.08)",
          borderRadius: 999,
          padding: "6px 9px",
          whiteSpace: "nowrap",
        }}
      >
        {factor.level}
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, color }) {
  return (
    <div
      style={{
        background: "rgba(15,23,42,0.6)",
        borderRadius: 22,
        padding: 18,
      }}
    >
      <div
        style={{
          color: "#94a3b8",
          fontSize: 14,
          fontWeight: 800,
          marginBottom: 12,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: "white",
          fontSize: 48,
          lineHeight: 1,
          fontWeight: 950,
          marginBottom: 10,
        }}
      >
        {value}
      </div>

      <div
        style={{
          color,
          fontSize: 18,
          lineHeight: 1.1,
          fontWeight: 900,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}
