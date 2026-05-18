"use client";

function buildReasons(data) {
  const reasons = [];

  const airportRisk =
    data?.airportIntelligence
      ?.operationalIntelligence
      ?.airportRisk;

  const checkedIn =
    data?.journey?.profile
      ?.checkedIn;

  const bags =
    data?.journey?.profile
      ?.bags;

  const passport =
    data?.journey?.profile
      ?.flightType === "passport";

  const transport =
    data?.journey?.transport;

  if (airportRisk === "medium") {
    reasons.push({
      text:
        "Segurança com variabilidade moderada",
      severity: "medium",
    });
  }

  if (airportRisk === "high") {
    reasons.push({
      text:
        "Pressão operacional elevada no aeroporto",
      severity: "high",
    });
  }

  if (
    transport === "public"
  ) {
    reasons.push({
      text:
        "Transporte público sob monitorização",
      severity: "medium",
    });
  }

  if (!checkedIn) {
    reasons.push({
      text:
        "Check-in online ainda pendente",
      severity: "high",
    });
  }

  if (bags) {
    reasons.push({
      text:
        "Passageiro com bagagem de porão",
      severity: "medium",
    });
  }

  if (passport) {
    reasons.push({
      text:
        "Voo com controlo de passaporte",
      severity: "medium",
    });
  }

  return reasons;
}

function getDotColor(severity) {
  if (severity === "high") {
    return "#ef4444";
  }

  if (severity === "medium") {
    return "#f59e0b";
  }

  return "#22c55e";
}

export default function DecisionExplanationCard({
  data,
}) {
  const reasons =
    buildReasons(data);

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.035))",
        border:
          "1px solid rgba(255,255,255,0.08)",
        borderRadius: 34,
        padding: 24,
        backdropFilter: "blur(18px)",
      }}
    >
      <div
        style={{
          position: "absolute",
          right: -80,
          top: -80,
          width: 180,
          height: 180,
          borderRadius: 999,
          background:
            "rgba(59,130,246,0.10)",
          filter: "blur(60px)",
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
            fontSize: 12,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "#9fb0d1",
            fontWeight: 950,
            marginBottom: 18,
          }}
        >
          Why This Decision
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            marginBottom: 24,
          }}
        >
          {reasons.map((reason) => (
            <div
              key={reason.text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background:
                    getDotColor(
                      reason.severity
                    ),

                  boxShadow: `0 0 14px ${getDotColor(
                    reason.severity
                  )}`,
                }}
              />

              <div
                style={{
                  color: "#f8fafc",
                  fontSize: 15,
                  lineHeight: 1.4,
                  fontWeight: 700,
                }}
              >
                {reason.text}
              </div>
            </div>
          ))}
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
              color: "#dbe4ff",
              fontSize: 15,
              lineHeight: 1.6,
              fontWeight: 600,
            }}
          >
            Operational confidence reduced
            due to multiple active
            operational factors being
            monitored simultaneously.
          </div>
        </div>
      </div>
    </section>
  );
}