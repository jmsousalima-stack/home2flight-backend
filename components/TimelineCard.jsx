"use client";

function getAccentColor(status) {
  switch (status) {
    case "risk":
      return "#e5485d";
    case "buffer":
      return "#c99700";
    default:
      return "#22a8e8";
  }
}

function getBorderColor(status) {
  switch (status) {
    case "risk":
      return "#f0a6b4";
    case "buffer":
      return "#e6ca69";
    default:
      return "#bdeaff";
  }
}

function getSoftBackground(status) {
  switch (status) {
    case "risk":
      return "#fff5f7";
    case "buffer":
      return "#fff9eb";
    default:
      return "#eefbff";
  }
}

function getStatusLabel(status) {
  switch (status) {
    case "risk":
      return "RISK";
    case "buffer":
      return "BUFFER";
    default:
      return "READY";
  }
}

function getSignalStyle(severity = "medium") {
  switch (severity) {
    case "high":
      return { bg: "#fff1f2", color: "#d92d47" };
    case "medium":
      return { bg: "#fff7e8", color: "#b77900" };
    case "low":
      return { bg: "#edfdf3", color: "#1f9d61" };
    default:
      return { bg: "#eef2f7", color: "#53627c" };
  }
}

export default function TimelineCard({ timeline = [] }) {
  return (
    <section
      style={{
        background: "#f7f8fc",
        borderTopLeftRadius: 42,
        borderTopRightRadius: 42,
        marginTop: 34,
        padding: "34px 18px 120px",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontSize: "clamp(38px, 10vw, 54px)",
            lineHeight: 0.92,
            letterSpacing: "-2.4px",
            fontWeight: 950,
            color: "#03133d",
            margin: "0 0 16px",
          }}
        >
          Operational
          <br />
          timeline
        </h2>

        <p
          style={{
            fontSize: 17,
            lineHeight: 1.42,
            color: "#707b97",
            margin: 0,
            maxWidth: 340,
          }}
        >
          Plano dinâmico por risco, voo, transporte e sinais operacionais.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {timeline.map((item, index) => {
          const accent = getAccentColor(item.status);
          const borderColor = getBorderColor(item.status);
          const softBg = getSoftBackground(item.status);

          const time = new Date(item.time).toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          });

          const isLive = item.status === "risk" || item.status === "buffer";

          return (
            <article
              key={item.id}
              style={{
                background: "#ffffff",
                border: `2px solid ${borderColor}`,
                borderRadius: 30,
                padding: 18,
                boxShadow: "0 14px 36px rgba(15,23,42,0.06)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 5,
                  background: accent,
                  opacity: isLive ? 0.95 : 0.45,
                }}
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#8b92ab",
                    fontSize: 13,
                    fontWeight: 900,
                    letterSpacing: 1.4,
                    textTransform: "uppercase",
                  }}
                >
                  <span
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: 999,
                      background: softBg,
                      border: `2px solid ${borderColor}`,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: accent,
                      fontSize: 12,
                      fontWeight: 950,
                    }}
                  >
                    {index + 1}
                  </span>
                  Step {index + 1}
                </div>

                {isLive && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      background:
                        item.status === "risk"
                          ? "rgba(229,72,93,0.1)"
                          : "rgba(201,151,0,0.1)",
                      color: accent,
                      borderRadius: 999,
                      padding: "7px 11px",
                      fontSize: 10,
                      fontWeight: 950,
                      letterSpacing: 1.3,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: accent,
                        boxShadow: `0 0 10px ${accent}`,
                      }}
                    />
                    LIVE
                  </div>
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "92px 1fr",
                  gap: 16,
                  alignItems: "start",
                }}
              >
                <div
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: 24,
                    background: softBg,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 950,
                      color: accent,
                      lineHeight: 1,
                      marginBottom: 9,
                    }}
                  >
                    {time}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      letterSpacing: 1.5,
                      fontWeight: 950,
                      color: accent,
                    }}
                  >
                    {getStatusLabel(item.status)}
                  </div>
                </div>

                <div style={{ minWidth: 0 }}>
                  <h3
                    style={{
                      fontSize: "clamp(24px, 7vw, 30px)",
                      lineHeight: 1,
                      letterSpacing: "-1px",
                      color: "#04133d",
                      fontWeight: 950,
                      margin: "0 0 8px",
                    }}
                  >
                    {item.title}
                  </h3>

                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#8b92ab",
                      marginBottom: 12,
                    }}
                  >
                    {item.category}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 7,
                      marginBottom: 12,
                    }}
                  >
                    {item.source && <Tag text={item.source} />}
                    {item.confidence && <Tag text={item.confidence} />}
                    {item.buffer && <Tag text={item.buffer} green />}
                  </div>

                  {item.operationalSignals?.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 7,
                        marginBottom: 13,
                      }}
                    >
                      {item.operationalSignals.map((signal, signalIndex) => {
                        const signalStyle = getSignalStyle(signal.severity);

                        return (
                          <span
                            key={signalIndex}
                            style={{
                              background: signalStyle.bg,
                              color: signalStyle.color,
                              padding: "8px 11px",
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 850,
                              lineHeight: 1.2,
                            }}
                          >
                            {signal.label}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <p
                    style={{
                      fontSize: 15,
                      lineHeight: 1.45,
                      color: "#667085",
                      margin: "0 0 14px",
                    }}
                  >
                    {item.reasoning}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: "#98a2b3",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        background: "#22c55e",
                        boxShadow: "0 0 12px rgba(34,197,94,0.8)",
                        flexShrink: 0,
                      }}
                    />
                    Updated 2 min ago
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Tag({ text, green = false }) {
  return (
    <span
      style={{
        padding: "8px 11px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 850,
        background: green ? "#e7f8ef" : "#eef2f7",
        color: green ? "#1f9d61" : "#49566f",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}
