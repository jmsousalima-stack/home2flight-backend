"use client";

function getMainRisk(timeline = []) {
  const hasHigh = timeline.some((item) => item.status === "risk");
  const hasBuffer = timeline.some((item) => item.status === "buffer");

  if (hasHigh) return "HIGH RISK";
  if (hasBuffer) return "BUFFER";
  return "STABLE";
}

function getRecommendedDeparture(timeline = []) {
  const leaveHome = timeline.find((item) => item.category === "Transport");

  if (!leaveHome?.time) return "--:--";

  return new Date(leaveHome.time).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getReliabilityScore(timeline = []) {
  const riskItems = timeline.filter((item) => item.status === "risk").length;
  const bufferItems = timeline.filter((item) => item.status === "buffer").length;

  return Math.max(0, 82 - riskItems * 22 - bufferItems * 10);
}

function getBriefingText(timeline = []) {
  const riskStep = timeline.find((item) => item.status === "risk");
  const bufferStep = timeline.find((item) => item.status === "buffer");

  if (riskStep) {
    return "Plano operacional com margem reforçada. A recomendação considera risco aeroportuário, sinais operacionais ativos e buffers de segurança.";
  }

  if (bufferStep) {
    return "Plano operacional com margem dinâmica. A recomendação considera transporte, estado do voo e margem adicional.";
  }

  return "Plano operacional estável. A recomendação considera preparação, transporte, aeroporto e dados do voo.";
}

export default function DepartureDecisionCard({ timelineData }) {
  const timeline = timelineData?.timeline || [];

  const riskLabel = getMainRisk(timeline);
  const departureTime = getRecommendedDeparture(timeline);
  const reliabilityScore = getReliabilityScore(timeline);
  const confidenceScore = Math.min(95, reliabilityScore + 24);
  const briefingText = getBriefingText(timeline);

  const keySignals = timeline
    .flatMap((item) => item.operationalSignals || [])
    .slice(0, 3);

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
          BRIEFING
        </div>

        <div
          style={{
            border: "1.5px solid rgba(251,113,133,0.45)",
            background: "rgba(127,29,29,0.18)",
            color: "#fda4af",
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
        Plano com
        <br />
        margem
        <br />
        operacional
        <br />
        sensível
      </h1>

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
          OPERATIONAL BRIEFING
        </div>

        <div
          style={{
            color: "#e5e7eb",
            fontSize: 17,
            lineHeight: 1.45,
          }}
        >
          {briefingText}
        </div>
      </div>

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
          subtitle={reliabilityScore < 60 ? "Baixa" : "Moderada"}
          color={reliabilityScore < 60 ? "#facc15" : "#60a5fa"}
        />

        <MetricCard
          title="Confidence"
          value={confidenceScore}
          subtitle="Confiança moderada"
          color="#60a5fa"
        />
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.08)",
          borderRadius: 24,
          padding: 20,
          marginBottom: keySignals.length ? 16 : 0,
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
          Leave home recommendation
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
