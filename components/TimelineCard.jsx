function formatTime(value) {
  return new Date(value).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStyleByLevel(level) {
  if (level === "high") {
    return {
      label: "High risk",
      border: "#fca5a5",
      background: "#fff7f7",
      timeBg: "#fee2e2",
      timeColor: "#dc2626",
      badgeBg: "#fee2e2",
      badgeColor: "#dc2626",
      dot: "#ef4444",
    };
  }

  if (level === "medium") {
    return {
      label: "Attention",
      border: "#fde047",
      background: "#fffdf2",
      timeBg: "#fef3c7",
      timeColor: "#ca8a04",
      badgeBg: "#fef3c7",
      badgeColor: "#ca8a04",
      dot: "#eab308",
    };
  }

  return {
    label: "Stable",
    border: "#a5f3fc",
    background: "#ffffff",
    timeBg: "#ecfeff",
    timeColor: "#0284c7",
    badgeBg: "#ecfeff",
    badgeColor: "#0284c7",
    dot: "#06b6d4",
  };
}

export default function TimelineCard({ data }) {
  const timeline = data?.timeline || [];

  if (!timeline.length) {
    return null;
  }

  return (
    <div
      style={{
        background: "#f8fafc",
        borderRadius: 32,
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        marginTop: 20,
        boxShadow: "0 18px 60px rgba(15,23,42,0.12)",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 900,
            color: "#0f172a",
            lineHeight: 1,
          }}
        >
          Operational Timeline
        </div>

        <div
          style={{
            marginTop: 10,
            color: "#64748b",
            fontSize: 16,
            lineHeight: 1.35,
          }}
        >
          Dynamic departure plan generated from airport risk, route buffer,
          flight state and operational signals.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          position: "relative",
        }}
      >
        {timeline.map((item, index) => {
          const style = getStyleByLevel(item.level);
          const isLast = index === timeline.length - 1;

          return (
            <div
              key={`${item.title}-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: "28px 1fr",
                gap: 12,
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    background: style.dot,
                    marginTop: 32,
                    boxShadow: `0 0 0 6px ${style.dot}22`,
                    zIndex: 2,
                  }}
                />

                {!isLast && (
                  <div
                    style={{
                      position: "absolute",
                      top: 46,
                      bottom: -30,
                      width: 2,
                      background: "#cbd5e1",
                    }}
                  />
                )}
              </div>

              <div
                style={{
                  background: style.background,
                  border: `1.5px solid ${style.border}`,
                  borderRadius: 26,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "82px 1fr",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 82,
                      height: 82,
                      borderRadius: 22,
                      background: style.timeBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: style.timeColor,
                      fontWeight: 900,
                      fontSize: 23,
                    }}
                  >
                    {formatTime(item.time)}
                  </div>

                  <div>
                    <div
                      style={{
                        color: "#0f172a",
                        fontWeight: 900,
                        fontSize: 23,
                        lineHeight: 1.08,
                      }}
                    >
                      {item.title}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        color: "#64748b",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {item.category}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 7,
                    flexWrap: "wrap",
                  }}
                >
                  <Tag
                    label={style.label}
                    background={style.badgeBg}
                    color={style.badgeColor}
                  />
                  <Tag label={item.confidence} background="#e0f2fe" color="#0369a1" />
                  <Tag label={item.source} background="#e5e7eb" color="#334155" />
                  <Tag label={item.buffer} background="#ecfdf5" color="#047857" />
                </div>

                <div
                  style={{
                    background: "rgba(255,255,255,0.72)",
                    borderRadius: 18,
                    padding: 12,
                    color: "#334155",
                    fontSize: 14,
                    lineHeight: 1.45,
                    border: "1px solid rgba(15,23,42,0.05)",
                  }}
                >
                  {item.reasoning}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Tag({ label, background, color }) {
  return (
    <div
      style={{
        padding: "7px 10px",
        borderRadius: 999,
        background,
        color,
        fontWeight: 800,
        fontSize: 12,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}
