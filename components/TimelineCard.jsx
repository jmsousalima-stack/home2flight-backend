export default function TimelineCard({ data }) {
  const timeline = data?.recommendation?.timeline || [];

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

  return (
    <section
      style={{
        background: "#f3f4f6",
        borderRadius: 40,
        padding: 32,
      }}
    >
      <div
        style={{
          marginBottom: 32,
        }}
      >
        <h2
          style={{
            fontSize: 64,
            lineHeight: 1,
            fontWeight: 800,
            color: "#020617",
            marginBottom: 16,
          }}
        >
          Timeline
        </h2>

        <p
          style={{
            fontSize: 24,
            lineHeight: 1.4,
            color: "#64748b",
          }}
        >
          Real-time operational planning generated dynamically by the
          Home2Flight Engine.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {timeline.map((item, index) => (
          <div
            key={index}
            style={{
              background: "white",
              borderRadius: 32,
              border: `4px solid ${getBorderColor(item.level)}`,
              padding: 24,
              display: "flex",
              gap: 24,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 24,
                background: getBackgroundColor(item.level),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: getTimeColor(item.level),
                }}
              >
                {new Date(item.time).toLocaleTimeString("pt-PT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            <div
              style={{
                flex: 1,
              }}
            >
              <h3
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#020617",
                  marginBottom: 8,
                }}
              >
                {item.title}
              </h3>

              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#64748b",
                  marginBottom: 16,
                }}
              >
                {item.category}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    background: "#eff6ff",
                    color: "#0284c7",
                    padding: "8px 14px",
                    borderRadius: 999,
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  {item.confidence}
                </div>

                <div
                  style={{
                    background: "#e5e7eb",
                    color: "#334155",
                    padding: "8px 14px",
                    borderRadius: 999,
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  {item.source}
                </div>

                <div
                  style={{
                    background: "#ecfdf5",
                    color: "#0f766e",
                    padding: "8px 14px",
                    borderRadius: 999,
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  {item.buffer}
                </div>
              </div>

              <p
                style={{
                  fontSize: 16,
                  lineHeight: 1.5,
                  color: "#475569",
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
