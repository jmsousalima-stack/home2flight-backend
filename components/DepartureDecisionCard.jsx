export default function DepartureDecisionCard({ data }) {
  const reliability = data?.reliability || {};
  const adjustments = reliability?.adjustments || [];

  const recommendation =
    data?.recommendation?.leaveHomeRecommendedMinutesBeforeDeparture || 0;

  const departureTime = new Date(
    new Date(data?.flight?.departure?.scheduled).getTime() -
      recommendation * 60 * 1000
  );

  const departureFormatted = departureTime.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const getRiskLabel = () => {
    if (reliability?.riskLevel === "high") return "HIGH RISK";
    if (reliability?.riskLevel === "medium") return "MODERATE";
    return "STABLE";
  };

  return (
    <section
      style={{
        background:
          "radial-gradient(circle at top right, #172554 0%, #020617 55%)",
        border: "2px solid rgba(244,114,182,0.3)",
        borderRadius: 40,
        padding: 32,
        color: "white",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            color: "#f59e0b",
            fontWeight: 800,
            letterSpacing: 3,
            fontSize: 18,
          }}
        >
          HOME2FLIGHT BRIEFING
        </div>

        <div
          style={{
            padding: "12px 18px",
            borderRadius: 999,
            border: "2px solid rgba(251,113,133,0.4)",
            background: "rgba(127,29,29,0.2)",
            color: "#fda4af",
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          {getRiskLabel()}
        </div>
      </div>

      <h1
        style={{
          fontSize: 72,
          lineHeight: 1,
          fontWeight: 900,
          marginBottom: 32,
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
          borderRadius: 32,
          padding: 28,
          marginBottom: 28,
        }}
      >
        <div
          style={{
            color: "#cbd5e1",
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: 2,
            marginBottom: 16,
          }}
        >
          OPERATIONAL BRIEFING
        </div>

        <div
          style={{
            fontSize: 22,
            lineHeight: 1.5,
            color: "#e2e8f0",
          }}
        >
          {data?.flight?.number} para{" "}
          {data?.flight?.route?.to?.code} exige margem adicional. A
          recomendação considera risco aeroportuário, estado do voo,
          contexto do passageiro e sinais operacionais ativos.
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: 28,
            padding: 28,
          }}
        >
          <div
            style={{
              color: "#94a3b8",
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            Reliability
          </div>

          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1,
              marginBottom: 12,
            }}
          >
            {reliability?.score || 0}
          </div>

          <div
            style={{
              color: "#facc15",
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            {reliability?.confidence || "Unknown"}
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            borderRadius: 28,
            padding: 28,
          }}
        >
          <div
            style={{
              color: "#94a3b8",
              fontSize: 18,
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            Confidence
          </div>

          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1,
              marginBottom: 12,
            }}
          >
            {Math.max(0, reliability?.score + 25 || 0)}
          </div>

          <div
            style={{
              color: "#60a5fa",
              fontSize: 24,
              fontWeight: 800,
            }}
          >
            Confiança moderada
          </div>
        </div>
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          borderRadius: 28,
          padding: 28,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            color: "#94a3b8",
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          Recommended departure
        </div>

        <div
          style={{
            fontSize: 96,
            lineHeight: 1,
            fontWeight: 900,
            marginBottom: 16,
          }}
        >
          {departureFormatted}
        </div>

        <div
          style={{
            color: "#94a3b8",
            fontSize: 24,
          }}
        >
          Leave home recommendation
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {adjustments.slice(0, 3).map((item, index) => (
          <div
            key={index}
            style={{
              background: "rgba(255,255,255,0.08)",
              padding: "12px 18px",
              borderRadius: 999,
              color: "#e2e8f0",
              fontSize: 16,
            }}
          >
            {item.reason}
          </div>
        ))}
      </div>
    </section>
  );
}
