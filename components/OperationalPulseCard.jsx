"use client";

function getToneStyles(tone = "stable") {
  switch (tone) {
    case "critical":
      return {
        accent: "#ef4444",
        soft: "rgba(239,68,68,0.14)",
        border: "rgba(239,68,68,0.34)",
        label: "Crítico",
      };

    case "warning":
      return {
        accent: "#f97316",
        soft: "rgba(249,115,22,0.14)",
        border: "rgba(249,115,22,0.34)",
        label: "Pressão elevada",
      };

    case "attention":
      return {
        accent: "#f59e0b",
        soft: "rgba(245,158,11,0.14)",
        border: "rgba(245,158,11,0.34)",
        label: "Acima do normal",
      };

    case "stable":
    default:
      return {
        accent: "#22c55e",
        soft: "rgba(34,197,94,0.14)",
        border: "rgba(34,197,94,0.34)",
        label: "Estável",
      };
  }
}

function getBehaviorFromData(data) {
  const behavior =
    data?.operationalBehavior ||
    data?.behaviorIntelligence ||
    data?.behavior ||
    null;

  const summary =
    behavior?.behaviorSummary ||
    behavior?.summary ||
    null;

  if (summary) {
    return {
      tone:
        summary.severity === "critical"
          ? "critical"
          : summary.severity === "high"
          ? "warning"
          : summary.severity === "medium"
          ? "attention"
          : "stable",

      title:
        summary.label ||
        "Operação dentro do normal",

      message:
        summary.summary ||
        "A Home2Flight está a monitorizar os principais fatores operacionais.",

      confidenceScore:
        summary.confidenceScore ??
        data?.confidence?.score ??
        data?.reliability?.score ??
        0,

      compactLabel:
        behavior?.displayHints?.compactLabel ||
        summary.label ||
        "Normal",
    };
  }

  const reliabilityScore = data?.reliability?.score ?? 0;
  const confidenceScore = data?.confidence?.score ?? 0;
  const status = data?.uiSummary?.status || "warning";

  if (status === "critical" || reliabilityScore < 45) {
    return {
      tone: "warning",
      title: "Plano operacionalmente sensível",
      message:
        "Existem fatores ativos que justificam margem adicional e monitorização reforçada.",
      confidenceScore,
      compactLabel: "Atenção",
    };
  }

  if (status === "good" && reliabilityScore >= 70) {
    return {
      tone: "stable",
      title: "Fluxo operacional estável",
      message:
        "A rota, o voo e o contexto operacional não indicam pressão relevante neste momento.",
      confidenceScore,
      compactLabel: "Estável",
    };
  }

  return {
    tone: "attention",
    title: "Mais movimentado do que o habitual",
    message:
      "A Home2Flight detetou variabilidade operacional moderada e mantém buffer adicional.",
    confidenceScore,
    compactLabel: "Acima do normal",
  };
}

function getDomainRows(data) {
  const behavior =
    data?.operationalBehavior ||
    data?.behaviorIntelligence ||
    data?.behavior ||
    null;

  const behaviors = behavior?.behaviors || {};

  if (Object.keys(behaviors).length > 0) {
    return [
      {
        label: "Aeroporto",
        value: behaviors?.airport?.shortLabel || "Monitorização",
        tone: behaviors?.airport?.tone || "attention",
      },
      {
        label: "Segurança",
        value: behaviors?.security?.shortLabel || "Monitorização",
        tone: behaviors?.security?.tone || "attention",
      },
      {
        label: "Trajeto",
        value: behaviors?.route?.shortLabel || "Monitorização",
        tone: behaviors?.route?.tone || "attention",
      },
      {
        label: "Voo",
        value: behaviors?.flight?.shortLabel || "Monitorização",
        tone: behaviors?.flight?.tone || "stable",
      },
    ];
  }

  return [
    {
      label: "Aeroporto",
      value:
        data?.airportIntelligence?.operationalIntelligence?.airportRisk ||
        "Monitorização",
      tone: "attention",
    },
    {
      label: "Trajeto",
      value:
        data?.routeIntelligence?.operationalProfile?.routeRiskLevel ||
        "Monitorização",
      tone: "stable",
    },
    {
      label: "Eventos",
      value:
        data?.eventDisruptionIntelligence?.eventIntelligence?.eventRisk ||
        "Monitorização",
      tone: "attention",
    },
    {
      label: "Voo",
      value: data?.flight?.status || "Monitorização",
      tone: "stable",
    },
  ];
}

function PulseDot({ accent }) {
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: 999,
        background: accent,
        boxShadow: `0 0 18px ${accent}`,
        position: "relative",
        display: "inline-block",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 999,
          background: accent,
          opacity: 0.35,
          animation: "h2fPulseWave 1.8s ease-in-out infinite",
        }}
      />
    </span>
  );
}

function DomainRow({ row }) {
  const styles = getToneStyles(row.tone);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 0",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          minWidth: 0,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: styles.accent,
            boxShadow: `0 0 14px ${styles.accent}`,
            flexShrink: 0,
          }}
        />

        <div
          style={{
            minWidth: 0,
          }}
        >
          <div
            style={{
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 900,
              lineHeight: 1.1,
            }}
          >
            {row.label}
          </div>

          <div
            style={{
              color: "#94a3b8",
              fontSize: 12,
              fontWeight: 700,
              marginTop: 3,
            }}
          >
            Estado operacional
          </div>
        </div>
      </div>

      <div
        style={{
          color: styles.accent,
          background: styles.soft,
          border: `1px solid ${styles.border}`,
          borderRadius: 999,
          padding: "7px 10px",
          fontSize: 12,
          fontWeight: 950,
          whiteSpace: "nowrap",
          textTransform: "capitalize",
        }}
      >
        {row.value}
      </div>
    </div>
  );
}

export default function OperationalPulseCard({ data }) {
  const behavior = getBehaviorFromData(data);
  const styles = getToneStyles(behavior.tone);
  const rows = getDomainRows(data);

  return (
    <section
      style={{
        background:
          "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(3,7,18,0.98))",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 32,
        padding: 22,
        color: "#ffffff",
        boxShadow: "0 24px 70px rgba(0,0,0,0.32)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes h2fPulseWave {
          0% { transform: scale(1); opacity: 0.40; }
          50% { transform: scale(2.3); opacity: 0.06; }
          100% { transform: scale(1); opacity: 0.40; }
        }
      `}</style>

      <div
        style={{
          position: "absolute",
          top: -80,
          right: -90,
          width: 220,
          height: 220,
          background: `radial-gradient(circle, ${styles.accent}22 0%, transparent 62%)`,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 14,
          alignItems: "flex-start",
          marginBottom: 22,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div>
          <div
            style={{
              color: "#93a4c8",
              fontSize: 11,
              fontWeight: 950,
              letterSpacing: 2.4,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Live operational pulse
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: "clamp(30px, 8vw, 44px)",
              lineHeight: 0.95,
              letterSpacing: "-1.8px",
              fontWeight: 950,
            }}
          >
            Estado real
            <br />
            da operação
          </h2>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: styles.accent,
            background: styles.soft,
            border: `1px solid ${styles.border}`,
            borderRadius: 999,
            padding: "9px 12px",
            fontSize: 12,
            fontWeight: 950,
            whiteSpace: "nowrap",
          }}
        >
          <PulseDot accent={styles.accent} />
          {behavior.compactLabel}
        </div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          padding: 18,
          marginBottom: 18,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <PulseDot accent={styles.accent} />

          <div
            style={{
              color: styles.accent,
              fontSize: 14,
              fontWeight: 950,
              textTransform: "uppercase",
              letterSpacing: 1.4,
            }}
          >
            Em monitorização
          </div>
        </div>

        <div
          style={{
            fontSize: 22,
            lineHeight: 1.12,
            fontWeight: 950,
            letterSpacing: "-0.5px",
            marginBottom: 10,
          }}
        >
          {behavior.title}
        </div>

        <p
          style={{
            color: "#cbd5e1",
            fontSize: 15,
            lineHeight: 1.45,
            margin: 0,
          }}
        >
          {behavior.message}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 22,
            padding: 16,
          }}
        >
          <div
            style={{
              color: "#94a3b8",
              fontSize: 12,
              fontWeight: 850,
              marginBottom: 8,
            }}
          >
            Confiança
          </div>

          <div
            style={{
              fontSize: 34,
              fontWeight: 950,
              lineHeight: 1,
              color: "#ffffff",
            }}
          >
            {behavior.confidenceScore}
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 22,
            padding: 16,
          }}
        >
          <div
            style={{
              color: "#94a3b8",
              fontSize: 12,
              fontWeight: 850,
              marginBottom: 8,
            }}
          >
            Leitura
          </div>

          <div
            style={{
              fontSize: 18,
              fontWeight: 950,
              lineHeight: 1.1,
              color: styles.accent,
            }}
          >
            {styles.label}
          </div>
        </div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.045)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 24,
          padding: "4px 16px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {rows.map((row, index) => (
          <DomainRow key={`${row.label}-${index}`} row={row} />
        ))}
      </div>
    </section>
  );
}