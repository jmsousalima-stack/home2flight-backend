"use client";

function buildBriefing(timelineData) {
  const airportRisk =
    timelineData?.airportIntelligence
      ?.operationalIntelligence
      ?.airportRisk;

  const transportRisk =
    timelineData?.routeIntelligence
      ?.operationalProfile
      ?.routeRiskLevel;

  const checkedIn =
    timelineData?.journey?.profile?.checkedIn;

  const bags =
    timelineData?.journey?.profile?.bags;

  const passport =
    timelineData?.journey?.profile?.flightType === "passport";

  const fragments = [];

  if (airportRisk === "high") {
    fragments.push(
      "A Home2Flight detetou pressão operacional elevada no aeroporto."
    );
  } else if (airportRisk === "medium") {
    fragments.push(
      "Existe variabilidade operacional moderada na zona aeroportuária."
    );
  } else {
    fragments.push(
      "O aeroporto encontra-se operacionalmente estável."
    );
  }

  if (
    transportRisk === "medium" ||
    transportRisk === "high"
  ) {
    fragments.push(
      "O trajeto até ao terminal está sob monitorização ativa."
    );
  }

  if (!checkedIn) {
    fragments.push(
      "O check-in online ainda não foi confirmado."
    );
  }

  if (bags) {
    fragments.push(
      "A jornada inclui bagagem de porão e margem adicional para bag drop."
    );
  }

  if (passport) {
    fragments.push(
      "O voo exige controlo documental/fronteiriço antes da porta."
    );
  }

  return fragments.join(" ");
}

function buildOperationalTone(score) {
  if (score >= 75) {
    return {
      label: "Estável",
      color: "#22c55e",
      glow: "rgba(34,197,94,0.35)",
    };
  }

  if (score >= 50) {
    return {
      label: "Sensível",
      color: "#f59e0b",
      glow: "rgba(245,158,11,0.35)",
    };
  }

  return {
    label: "Conservadora",
    color: "#ef4444",
    glow: "rgba(239,68,68,0.35)",
  };
}

export default function OperationalBriefingCard({
  timelineData,
}) {
  const reliability =
    timelineData?.reliability?.score || 0;

  const briefing =
    buildBriefing(timelineData);

  const tone =
    buildOperationalTone(reliability);

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 30,
        padding: 24,
        background:
          "linear-gradient(180deg, rgba(19,27,60,0.96) 0%, rgba(8,15,40,0.98) 100%)",
        border:
          "1px solid rgba(255,255,255,0.08)",
        boxShadow:
          "0 24px 60px rgba(0,0,0,0.32)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -120,
          right: -60,
          width: 240,
          height: 240,
          borderRadius: 999,
          background: tone.glow,
          filter: "blur(80px)",
          opacity: 0.8,
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
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "#93a4c8",
                fontWeight: 900,
                marginBottom: 10,
              }}
            >
              Operational Briefing
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: tone.color,
                  boxShadow: `0 0 16px ${tone.color}`,
                }}
              />

              <div
                style={{
                  color: "#ffffff",
                  fontSize: 15,
                  fontWeight: 900,
                }}
              >
                Estratégia {tone.label}
              </div>
            </div>
          </div>

          <div
            style={{
              textAlign: "right",
            }}
          >
            <div
              style={{
                color: "#93a4c8",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1,
                marginBottom: 4,
              }}
            >
              DATA CONFIDENCE
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 950,
                color: "#ffffff",
                lineHeight: 1,
              }}
            >
              {timelineData?.sources?.route
                ?.confidenceScore || 58}
              %
            </div>
          </div>
        </div>

        <div
          style={{
            color: "#ffffff",
            fontSize: 20,
            lineHeight: 1.4,
            fontWeight: 700,
            marginBottom: 20,
          }}
        >
          {briefing}
        </div>

        <div
          style={{
            background:
              "rgba(255,255,255,0.04)",
            border:
              "1px solid rgba(255,255,255,0.06)",
            borderRadius: 22,
            padding: 18,
          }}
        >
          <div
            style={{
              color: "#93a4c8",
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: 2,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Operational posture
          </div>

          <div
            style={{
              color: "#dbe4ff",
              fontSize: 15,
              lineHeight: 1.6,
              fontWeight: 600,
            }}
          >
            A timeline mantém buffers conservadores
            para reduzir exposição a variabilidade
            operacional antes do embarque.
          </div>
        </div>
      </div>
    </section>
  );
}