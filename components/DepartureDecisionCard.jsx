"use client";

export default function DepartureDecisionCard({ data }) {
  const recommendation =
    data?.recommendation || {};

  const reliability =
    data?.reliability || {};

  const departureTime =
    recommendation.leaveHomeRecommendedMinutesBeforeDeparture
      ? calculateDepartureTime(
          data?.flight?.departure?.scheduled,
          recommendation.leaveHomeRecommendedMinutesBeforeDeparture
        )
      : "12:01";

  const reliabilityScore =
    reliability.score || 36;

  const confidence =
    reliability.confidence || "Moderada";

  const riskLevel =
    reliability.riskLevel || "stable";

  const explanation =
    reliability?.explanation?.summary ||
    "Plano operacional calculado dinamicamente.";

  const alerts =
    reliability?.adjustments || [];

  return (
    <section
      style={{
        background:
          "radial-gradient(circle at top right, #16296b 0%, #020b2d 60%)",
        borderRadius: 42,
        padding: "32px 24px 44px",
        color: "white",
        border: "2px solid rgba(219,105,180,0.35)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 48,
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 4,
            color: "#f3a623",
          }}
        >
          HOME2FLIGHT
          <br />
          BRIEFING
        </div>

        <div
          style={{
            border:
              "2px solid rgba(230,125,173,0.5)",
            color: "#ffb3cb",
            padding: "16px 22px",
            borderRadius: 999,
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          {riskLevel === "high"
            ? "HIGH RISK"
            : "STABLE"}
        </div>
      </div>

      <h1
        style={{
          fontSize: 88,
          lineHeight: 0.92,
          fontWeight: 900,
          marginBottom: 36,
        }}
      >
        Plano
        <br />
        com
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
          borderRadius: 28,
          padding: 28,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: 3,
            color: "#d2d7ea",
            marginBottom: 18,
          }}
        >
          OPERATIONAL BRIEFING
        </div>

        <div
          style={{
            fontSize: 22,
            lineHeight: 1.6,
            color: "#f2f4fb",
          }}
        >
          {explanation}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 18,
          marginBottom: 24,
        }}
      >
        <MetricCard
          title="Reliability"
          value={reliabilityScore}
          subtitle="Baixa"
          color="#ffd12f"
        />

        <MetricCard
          title="Confidence"
          value="61"
          subtitle={`Confiança ${confidence.toLowerCase()}`}
          color="#59a3ff"
        />
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.08)",
          borderRadius: 32,
          padding: 28,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#b8bfd7",
            marginBottom: 14,
          }}
        >
          Recommended departure
        </div>

        <div
          style={{
            fontSize: 92,
            lineHeight: 1,
            fontWeight: 900,
            marginBottom: 12,
          }}
        >
          {departureTime}
        </div>

        <div
          style={{
            fontSize: 22,
            color: "#b8bfd7",
          }}
        >
          Leave home recommendation
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        {alerts.slice(0, 3).map((alert, index) => (
          <div
            key={index}
            style={{
              background:
                "rgba(255,255,255,0.08)",
              borderRadius: 999,
              padding: "16px 22px",
              fontSize: 18,
              color: "#dfe5fb",
            }}
          >
            {alert.reason}
          </div>
        ))}
      </div>
    </section>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  color,
}) {
  return (
    <div
      style={{
        flex: 1,
        background: "rgba(0,0,0,0.22)",
        borderRadius: 28,
        padding: 24,
      }}
    >
      <div
        style={{
          fontSize: 18,
          color: "#aeb7d5",
          fontWeight: 700,
          marginBottom: 22,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 74,
          lineHeight: 1,
          fontWeight: 900,
          marginBottom: 18,
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color,
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

function calculateDepartureTime(
  flightDate,
  minutesBefore
) {
  if (!flightDate || !minutesBefore) {
    return "12:01";
  }

  const flight =
    new Date(flightDate);

  const departure =
    new Date(
      flight.getTime() -
        minutesBefore * 60000
    );

  return departure.toLocaleTimeString(
    "pt-PT",
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}
