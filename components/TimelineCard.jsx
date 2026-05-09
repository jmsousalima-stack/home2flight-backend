function getCardStyle(item) {
  if (item.level === "high") {
    return {
      border: "#fca5a5",
      background: "#fef2f2",
      badge: "#ef4444",
      timeBg: "#fee2e2",
      timeColor: "#dc2626",
    };
  }

  if (item.level === "medium") {
    return {
      border: "#fde047",
      background: "#fffbeb",
      badge: "#ca8a04",
      timeBg: "#fef3c7",
      timeColor: "#ca8a04",
    };
  }

  return {
    border: "#67e8f9",
    background: "#f8fafc",
    badge: "#0284c7",
    timeBg: "#ecfeff",
    timeColor: "#0284c7",
  };
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TimelineCard({ data }) {
  const timeline = data?.timeline || [];

  return (
    <div
      style={{
        background: "white",
        borderRadius: 32,
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        marginTop: 20,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 58,
            fontWeight: 900,
            color: "#0f172a",
            lineHeight: 1,
          }}
        >
          Timeline
        </div>

        <div
          style={{
            marginTop: 8,
            color: "#64748b",
            fontSize: 16,
            lineHeight: 1.4,
          }}
        >
          Real-time operational planning generated dynamically by the
          Home2Flight Engine.
        </div>
      </div>

      {timeline.map((item, index) => {
        const style = getCardStyle(item);

        return (
          <div
            key={index}
            style={{
              background: style.background,
              border: `2px solid ${style.border}`,
              borderRadius: 28,
              padding: 18,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -40,
                right: -40,
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: `${style.border}20`,
                filter: "blur(18px)",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  minWidth: 108,
                  height: 108,
                  borderRadius: 24,
                  background: style.timeBg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: style.timeColor,
                  fontWeight: 900,
                  fontSize: 28,
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.6)",
                }}
              >
                {formatTime(item.time)}
              </div>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: "#0f172a",
                    fontWeight: 900,
                    fontSize: 28,
                    lineHeight: 1.05,
                  }}
                >
                  {item.title}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#64748b",
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  {item.category}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <Tag
                    label={item.confidence}
                    background={`${style.border}20`}
                    color={style.badge}
                  />

                  <Tag
                    label={item.source}
                    background="#e5e7eb"
                    color="#334155"
                  />

                  <Tag
                    label={item.buffer}
                    background="#ecfdf5"
                    color="#0f766e"
                  />
                </div>
              </div>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.7)",
                borderRadius: 18,
                padding: 14,
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  color: "#0f172a",
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                {item.reasoning}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Tag({ label, background, color }) {
  return (
    <div
      style={{
        padding: "8px 12px",
        borderRadius: 999,
        background,
        color,
        fontWeight: 800,
        fontSize: 13,
        lineHeight: 1,
      }}
    >
      {label}
    </div>
  );
}
