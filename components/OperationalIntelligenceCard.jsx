"use client";

function getConfidenceColor(score) {
  if (score >= 75) return "#22c55e";
  if (score >= 55) return "#f59e0b";
  return "#ef4444";
}

function getReliabilityLabel(score) {
  if (score >= 75) return "Plano confortável";
  if (score >= 55) return "Plano sensível";
  return "Plano frágil";
}

function getConfidenceLabel(score) {
  if (score >= 75) return "Confiança elevada";
  if (score >= 55) return "Confiança moderada";
  return "Confiança reduzida";
}

function getAirportRiskLabel(risk) {
  if (risk === "high") return "Atenção elevada";
  if (risk === "medium") return "Atenção moderada";
  if (risk === "low") return "Operação estável";
  return "Por avaliar";
}

function getSignalDescription(type) {
  const descriptions = {
    terminal_pressure:
      "O terminal pode ter alguma pressão operacional. Mantemos margem extra.",
    bag_drop_required:
      "Como há bagagem de porão, existe maior variabilidade no aeroporto.",
    security_variability:
      "A segurança pode variar. A timeline já inclui margem adicional.",
  };

  return descriptions[type] || "Fator considerado no cálculo da margem operacional.";
}

function getSeverityColor(severity) {
  if (severity === "high") return "#ef4444";
  if (severity === "medium") return "#f59e0b";
  return "#22c55e";
}

export default function OperationalIntelligenceCard({
  reliability,
  confidence,
  airportIntelligence,
}) {
  const reliabilityScore = reliability?.score || 0;
  const confidenceScore = confidence?.score || 0;
  const confidenceColor = getConfidenceColor(confidenceScore);

  const operational = airportIntelligence?.operationalIntelligence || {};
  const flags = airportIntelligence?.intelligenceFlags || [];

  return (
    <section
      style={{
        padding: "32px 22px",
        background: "linear-gradient(180deg, #04112b 0%, #061537 100%)",
        color: "#ffffff",
        borderRadius: 34,
        overflow: "hidden",
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
          Inteligência operacional
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
          Confiança
          <br />
          da decisão
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
          A Home2Flight avaliou aeroporto, transporte, bagagem e contexto do
          passageiro para definir a margem de segurança.
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
          title="Fiabilidade"
          value={reliabilityScore}
          label={getReliabilityLabel(reliabilityScore)}
          color="#f8b133"
        />

        <MetricCard
          title="Confiança"
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
          ANÁLISE DO AEROPORTO
        </div>

        <InsightRow
          title="Estado operacional"
          value={getAirportRiskLabel(operational.airportRisk)}
        />

        <InsightRow
          title="Segurança estimada"
          value={`${operational.estimatedSecurityMinutes || 0} min`}
        />

        <InsightRow
          title="Caminho até à porta"
          value={`${operational.estimatedWalkingMinutes || 0} min`}
        />

        <InsightRow
          title="Margem aplicada"
          value={`${operational.recommendedAirportBuffer || 0} min`}
        />
      </div>

      {flags.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {flags.map((flag, index) => (
            <SignalCard key={`${flag.type || "signal"}-${index}`} flag={flag} />
          ))}
        </div>
      )}
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

      <div style={{ color, fontWeight: 900, fontSize: 18 }}>{label}</div>
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
      <div style={{ color: "#8ea0c8", fontSize: 15 }}>{title}</div>

      <div
        style={{
          color: "#ffffff",
          fontWeight: 800,
          textAlign: "right",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SignalCard({ flag }) {
  const severityColor = getSeverityColor(flag?.severity);

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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          gap: 12,
        }}
      >
        <div
          style={{
            color: "#ffffff",
            fontWeight: 800,
            fontSize: 16,
            lineHeight: 1.2,
          }}
        >
          {flag?.label || "Sinal operacional"}
        </div>

        <div
          style={{
            background: `${severityColor}20`,
            color: severityColor,
            padding: "6px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 1,
            flexShrink: 0,
          }}
        >
          {flag?.severity || "low"}
        </div>
      </div>

      <div
        style={{
          color: "#9fb0d1",
          fontSize: 14,
          lineHeight: 1.45,
        }}
      >
        {getSignalDescription(flag?.type)}
      </div>
    </div>
  );
}