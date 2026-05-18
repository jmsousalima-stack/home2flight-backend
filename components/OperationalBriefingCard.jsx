"use client";

function getOperationalTone(score) {
  if (score >= 75) {
    return {
      label: "Plano estável",
      badge: "Margem normal",
      color: "#22c55e",
      glow: "rgba(34,197,94,0.35)",
    };
  }

  if (score >= 50) {
    return {
      label: "Plano sensível",
      badge: "Margem reforçada",
      color: "#f59e0b",
      glow: "rgba(245,158,11,0.35)",
    };
  }

  return {
    label: "Plano com margem reforçada",
    badge: "Estratégia conservadora",
    color: "#ef4444",
    glow: "rgba(239,68,68,0.35)",
  };
}

function buildBriefing(timelineData) {
  const airportRisk =
    timelineData?.airportIntelligence?.operationalIntelligence?.airportRisk;

  const transport =
    timelineData?.journey?.transport;

  const checkedIn = timelineData?.journey?.profile?.checkedIn;
  const bags = timelineData?.journey?.profile?.bags;
  const passport = timelineData?.journey?.profile?.flightType === "passport";

  const points = [];

  if (airportRisk === "medium") {
    points.push("aeroporto com variabilidade moderada");
  }

  if (airportRisk === "high") {
    points.push("pressão operacional elevada no aeroporto");
  }

  if (transport === "public") {
    points.push("dependência de transporte público");
  }

  if (!checkedIn) {
    points.push("check-in online ainda por confirmar");
  }

  if (bags) {
    points.push("bagagem de porão / bag drop");
  }

  if (passport) {
    points.push("controlo de passaporte antes da porta");
  }

  if (points.length === 0) {
    return "A jornada encontra-se operacionalmente estável. A Home2Flight mantém monitorização ativa até à partida.";
  }

  return `A Home2Flight recomenda uma margem reforçada porque identificou ${points.join(
    ", "
  )}.`;
}

export default function OperationalBriefingCard({ timelineData }) {
  const reliability = timelineData?.reliability?.score || 0;

  const confidence =
    timelineData?.sources?.route?.confidenceScore ||
    timelineData?.routeIntelligence?.reliability?.confidenceScore ||
    timelineData?.airportIntelligence?.operationalIntelligence?.confidenceScore ||
    58;

  const tone = getOperationalTone(reliability);
  const briefing = buildBriefing(timelineData);

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 30,
        padding: 24,
        background:
          "linear-gradient(180deg, rgba(19,27,60,0.96) 0%, rgba(8,15,40,0.98) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.32)",
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

      <div style={{ position: "relative", zIndex: 2 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 18,
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
                  fontSize: 16,
                  fontWeight: 950,
                  lineHeight: 1.2,
                }}
              >
                {tone.label}
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right", minWidth: 74 }}>
            <div
              style={{
                color: "#93a4c8",
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: 1,
                marginBottom: 5,
              }}
            >
              DATA
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 950,
                color: "#ffffff",
                lineHeight: 1,
              }}
            >
              {confidence}%
            </div>
          </div>
        </div>

        <div
          style={{
            color: "#ffffff",
            fontSize: 20,
            lineHeight: 1.42,
            fontWeight: 750,
            marginBottom: 20,
          }}
        >
          {briefing}
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
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
            {tone.badge}. A timeline mantém buffers para reduzir risco antes do
            embarque.
          </div>
        </div>
      </div>
    </section>
  );
}