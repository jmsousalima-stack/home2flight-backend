export default function TimelineCard({ timeline }) {
  if (!timeline || timeline.length === 0) {
    return null;
  }

  function formatTime(value) {
    return new Date(value).toLocaleTimeString("pt-PT", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getRiskByCategory(category) {
    if (category === "transport") return "attention";
    if (category === "airport") return "warning";
    return "safe";
  }

  function getSourceByCategory(category) {
    if (category === "transport") return "Route";
    if (category === "airport") return "Airport intel";
    if (category === "flight") return "Flight data";
    return "Preparation";
  }

  function getBufferByCategory(category) {
    if (category === "transport") return "+25m";
    if (category === "airport") return "+25m";
    if (category === "flight") return "pending";
    return "prep";
  }

  return (
    <div
      style={{
        background: "#f8fafc",
        borderRadius: 28,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div
        style={{
          fontSize: 30,
          fontWeight: 900,
          color: "#0f172a",
          marginBottom: 4,
        }}
      >
        Timeline
      </div>

      {timeline.map((item, index) => {
        const risk = getRiskByCategory(item.category);

        const colors = {
          safe: {
            bg: "#ecfeff",
            border: "#a5f3fc",
            text: "#0284c7",
          },
          attention: {
            bg: "#fef9c3",
            border: "#fde047",
            text: "#ca8a04",
          },
          warning: {
            bg: "#fee2e2",
            border: "#fca5a5",
            text: "#dc2626",
          },
        };

        const current = colors[risk];

        return (
          <div
            key={item.step || index}
            style={{
              background: "white",
              borderRadius: 22,
              padding: 14,
              display: "grid",
              gridTemplateColumns: "74px 1fr",
              gap: 14,
              alignItems: "center",
              border: `1.5px solid ${current.border}`,
              boxShadow: "0 6px 18px rgba(15,23,42,0.05)",
            }}
          >
            <div
              style={{
                width: 74,
                height: 74,
                borderRadius: 20,
                background: current.bg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 900,
                color: current.text,
              }}
            >
              {formatTime(item.recommendedTime)}
            </div>

            <div
              style={{
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 21,
                  lineHeight: 1.12,
                  fontWeight: 900,
                  color: "#0f172a",
                }}
              >
                {item.title}
              </div>

              <div
                style={{
                  marginTop: 4,
                  color: "#64748b",
                  fontSize: 14,
                  fontWeight: 600,
                  textTransform: "capitalize",
                }}
              >
                {item.category}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  marginTop: 10,
                }}
              >
                <Badge text="Est." color={current.text} />
                <Badge text={getSourceByCategory(item.category)} color="#334155" />
                <Badge text={getBufferByCategory(item.category)} color="#0f766e" />
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
        background: `${color}12`,
        color,
        padding: "5px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
}
