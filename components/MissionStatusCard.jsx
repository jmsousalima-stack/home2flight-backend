"use client";

function getMissionStatus(reliability) {
  if (reliability >= 75) {
    return {
      label: "Ready",
      description: "Jornada operacional estável.",
      color: "#22c55e",
      glow: "rgba(34,197,94,0.35)",
    };
  }

  if (reliability >= 50) {
    return {
      label: "Attention needed",
      description: "A Home2Flight recomenda monitorização ativa.",
      color: "#f59e0b",
      glow: "rgba(245,158,11,0.35)",
    };
  }

  return {
    label: "Operational caution",
    description:
      "A jornada exige buffers reforçados e acompanhamento ativo.",
    color: "#ef4444",
    glow: "rgba(239,68,68,0.35)",
  };
}

function formatTime(value) {
  if (!value) return "--:--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMainRisk(data) {
  if (!data?.journey?.profile?.checkedIn) {
    return "Check-in online pendente";
  }

  if (data?.journey?.transport === "public") {
    return "Transporte público monitorizado";
  }

  return "Variabilidade operacional aeroportuária";
}

function getMainAction(data) {
  if (!data?.journey?.profile?.checkedIn) {
    return "Confirmar check-in";
  }

  return "Manter monitorização";
}

export default function MissionStatusCard({ timelineData }) {
  const reliability =
    timelineData?.reliability?.score || 0;

  const status =
    getMissionStatus(reliability);

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 32,
        padding: 24,
        background:
          "linear-gradient(180deg, rgba(16,24,52,0.98) 0%, rgba(7,14,34,0.98) 100%)",
        border:
          "1px solid rgba(255,255,255,0.08)",
        boxShadow:
          "0 28px 70px rgba(0,0,0,0.34)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -80,
          width: 220,
          height: 220,
          borderRadius: 999,
          background: status.glow,
          filter: "blur(80px)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 999,
              background: status.color,
              boxShadow: `0 0 18px ${status.color}`,
            }}
          />

          <div
            style={{
              fontSize: 12,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#9fb0d1",
              fontWeight: 900,
            }}
          >
            Mission Status
          </div>
        </div>

        <div
          style={{
            fontSize: 34,
            lineHeight: 1,
            fontWeight: 950,
            letterSpacing: "-2px",
            marginBottom: 10,
          }}
        >
          {status.label}
        </div>

        <div
          style={{
            color: "#cbd5e1",
            fontSize: 16,
            lineHeight: 1.5,
            marginBottom: 26,
          }}
        >
          {status.description}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}
        >
          {[
            {
              title: "Saída",
              value: formatTime(
                timelineData?.decision?.leaveHomeTime
              ),
            },
            {
              title: "Risco principal",
              value: getMainRisk(timelineData),
            },
            {
              title: "Próxima ação",
              value: getMainAction(timelineData),
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background:
                  "rgba(255,255,255,0.045)",
                border:
                  "1px solid rgba(255,255,255,0.06)",
                borderRadius: 22,
                padding: 16,
              }}
            >
              <div
                style={{
                  color: "#93a4c8",
                  fontSize: 11,
                  fontWeight: 800,
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {item.title}
              </div>

              <div
                style={{
                  color: "#ffffff",
                  fontSize: 16,
                  lineHeight: 1.35,
                  fontWeight: 800,
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}