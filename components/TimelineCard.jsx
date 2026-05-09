export default function TimelineCard({ timeline }) {
  return (
    <div
      style={{
        background: "#f8fafc",
        borderRadius: 32,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <div
        style={{
          fontSize: 34,
          fontWeight: 900,
          color: "#0f172a",
        }}
      >
        Timeline
      </div>

      {timeline.map((item, index) => {
        const risk =
          item.type === "Airport"
            ? "warning"
            : item.type === "Transport"
            ? "attention"
            : "safe";

        const colors = {
          safe: {
            bg: "#ecfeff",
            border: "#67e8f9",
            text: "#155e75",
            badge: "#0ea5e9",
          },
          attention: {
            bg: "#fef9c3",
            border: "#fde047",
            text: "#854d0e",
            badge: "#eab308",
          },
          warning: {
            bg: "#fee2e2",
            border: "#fca5a5",
            text: "#991b1b",
            badge: "#ef4444",
          },
        };

        const current = colors[risk];

        return (
          <div
            key={index}
            style={{
              background: "white",
              borderRadius: 28,
              padding: 18,
              display: "flex",
              gap: 18,
              alignItems: "center",
              border: `2px solid ${current.border}`,
              boxShadow: "0 6px 20px rgba(0,0,0,0.05)",
            }}
          >
            <div
              style={{
                minWidth: 92,
                height: 92,
                borderRadius: 22,
                background: current.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                fontWeight: 900,
                color: current.badge,
              }}
            >
              {item.time}
            </div>

            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  lineHeight: 1.1,
                  fontWeight: 900,
                  color: "#0f172a",
                }}
              >
                {item.title}
              </div>

              <div
                style={{
                  color: "#64748b",
                  fontSize: 16,
                  fontWeight: 500,
                }}
              >
                {item.type}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginTop: 4,
                }}
              >
                <Badge text="Confidence 82%" color={current.badge} />
                <Badge text="Official source" color="#334155" />
                <Badge text="+12 min buffer" color="#0f766e" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Badge({ text, color }) {
  return (
    <div
      style={{
        background: `${color}15`,
        color,
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}
