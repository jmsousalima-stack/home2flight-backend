export default function TimelineCard({ data }) {
  const timeline = data?.timeline || [];

  const getBorderColor = (level) => {
    if (level === "high") return "#fca5a5";
    if (level === "medium") return "#fde047";
    return "#a5f3fc";
  };

  const getTimeColor = (level) => {
    if (level === "high") return "#dc2626";
    if (level === "medium") return "#ca8a04";
    return "#0284c7";
  };

  const getBackgroundColor = (level) => {
    if (level === "high") return "#fee2e2";
    if (level === "medium") return "#fef9c3";
    return "#ecfeff";
  };

  if (!timeline.length) {
    return null;
  }

  return (
    <section
      style={{
        background: "#f3f4f6",
        borderRadius: 40,
        padding: 28,
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontSize: 44,
            lineHeight: 1,
            fontWeight: 900,
            color: "#020617",
            margin: 0,
            marginBottom: 14,
          }}
        >
          Timeline
        </h2>

        <p
          style={{
            fontSize: 18,
            lineHeight: 1.35,
            color: "#64748b",
            margin: 0,
          }}
        >
          Plano operacional gerado dinamicamente pelo motor Home2Flight.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {timeline.map((item, index) => (
          <div
            key={index}
            style={{
              background: "white",
              borderRadius: 28,
              border: `2px solid ${getBorderColor(item.level)}`,
              padding: 18,
              display: "flex",
              gap: 16,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 86,
                height: 86,
                borderRadius: 22,
                background: getBackgroundColor(item.level),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: getTimeColor(item.level),
                }}
              >
                {new Date(item.time).toLocaleTimeString("pt-PT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <h3
                style={{
                  fontSize: 24,
                  lineHeight: 1.08,
                  fontWeight: 900,
                  color: "#020617",
                  margin: 0,
                  marginBottom: 6,
                }}
              >
                {item.title}
              </h3>

              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#64748b",
                  marginBottom: 12,
                }}
              >
                {item.category}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <Badge text={item.confidence} />
                <Badge text={item.source} />
                <Badge text={item.buffer} />
              </div>

              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.45,
                  color: "#475569",
                  margin: 0,
                }}
              >
                {item.reasoning}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Badge({ text }) {
  return (
    <span
      style={{
        background: "#e5e7eb",
        color: "#334155",
        padding: "7px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}
