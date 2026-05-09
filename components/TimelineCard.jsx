function formatTime(value) {
  return new Date(value).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStepStyle(level) {
  if (level === "high") {
    return {
      label: "Risk",
      accent: "#ef4444",
      soft: "#fee2e2",
      border: "rgba(239,68,68,0.28)",
    };
  }

  if (level === "medium") {
    return {
      label: "Buffer",
      accent: "#d97706",
      soft: "#fef3c7",
      border: "rgba(217,119,6,0.28)",
    };
  }

  return {
    label: "Ready",
    accent: "#0284c7",
    soft: "#e0f2fe",
    border: "rgba(2,132,199,0.22)",
  };
}

export default function TimelineCard({ data }) {
  const timeline = data?.timeline || [];

  if (!timeline.length) return null;

  return (
    <section
      style={{
        background: "#f8fafc",
        borderRadius: 34,
        padding: 22,
        boxShadow: "0 20px 60px rgba(15,23,42,0.12)",
      }}
    >
      <div style={{ marginBottom: 22 }}>
        <div
          style={{
            color: "#0f172a",
            fontSize: 34,
            lineHeight: 1,
            fontWeight: 900,
            letterSpacing: "-1.5px",
          }}
        >
          Operational timeline
        </div>

        <div
          style={{
            marginTop: 8,
            color: "#64748b",
            fontSize: 14,
            lineHeight: 1.35,
          }}
        >
          Plano dinâmico por risco, voo, transporte e sinais operacionais.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {timeline.map((item, index) => {
          const style = getStepStyle(item.level);

          return (
            <div
              key={`${item.title}-${index}`}
              style={{
                background: "white",
                borderRadius: 24,
                padding: 14,
                border: `1px solid ${style.border}`,
                boxShadow: "0 8px 24px rgba(15,23,42,0.05)",
                display: "grid",
                gridTemplateColumns: "76px 1fr",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 22,
                  background: style.soft,
                  color: style.accent,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    lineHeight: 1,
                  }}
                >
                  {formatTime(item.time)}
                </div>

                <div
                  style={{
                    marginTop: 6,
                    fontSize: 10,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    opacity: 0.8,
                  }}
                >
                  {style.label}
                </div>
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: "#0f172a",
                    fontSize: 20,
                    lineHeight: 1.08,
                    fontWeight: 900,
                    letterSpacing: "-0.3px",
                  }}
                >
                  {item.title}
                </div>

                <div
                  style={{
                    marginTop: 5,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <Pill text={item.category} />
                  <Pill text={item.source} />
                  <Pill text={item.buffer} strong />
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#64748b",
                    fontSize: 13,
                    lineHeight: 1.35,
                  }}
                >
                  {item.reasoning}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Pill({ text, strong = false }) {
  return (
    <span
      style={{
        background: strong ? "#ecfdf5" : "#f1f5f9",
        color: strong ? "#047857" : "#334155",
        padding: "5px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}
