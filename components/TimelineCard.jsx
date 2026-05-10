"use client";

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
      return {
        bg: "#fff1f2",
        color: "#d92d47",
      };

    case "medium":
      return {
        bg: "#fff7e8",
        color: "#b77900",
      };

    case "low":
      return {
        bg: "#edfdf3",
        color: "#1f9d61",
      };

    default:
      return {
        bg: "#eef2f7",
        color: "#53627c",
      };
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
      }}
    >
      <div style={{ marginBottom: 34 }}>
        <h2
          style={{
            fontSize: "clamp(40px, 10vw, 58px)",
            lineHeight: 0.9,
            letterSpacing: "-2.6px",
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
            maxWidth: 320,
          }}
        >
          Plano dinâmico por risco, voo, transporte e sinais operacionais.
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          left: 42,
          top: 220,
          bottom: 70,
          width: 2,
          background:
            "linear-gradient(to bottom, rgba(34,168,232,0.22), rgba(34,168,232,0.04))",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 22,
          position: "relative",
          zIndex: 2,
        }}
      >
        {timeline.map((item) => {
          const borderColor = getBorderColor(item.status);
          const accent = getAccentColor(item.status);
          const softBg = getSoftBackground(item.status);

          const time = new Date(item.time).toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          });

          const isLive =
            item.status === "risk" || item.status === "buffer";

          return (
            <article
              key={item.id}
              style={{
                position: "relative",
                paddingLeft: 34,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 46,
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  background: accent,
                  border: "5px solid white",
                  boxShadow: `0 0 28px ${accent}`,
                  zIndex: 5,
                }}
              />

              <div
                style={{
                  background: "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  border: `2px solid ${borderColor}`,
                  borderRadius: 34,
                  padding: 22,
                  boxShadow:
                    "0 12px 34px rgba(15,23,42,0.06)",
                  position: "relative",
                }}
              >
                {isLive && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      background:
                        item.status === "risk"
                          ? "rgba(229,72,93,0.10)"
                          : "rgba(201,151,0,0.10)",
                      color: accent,
                      borderRadius: 999,
                      padding: "8px 12px",
                      fontSize: 10,
                      fontWeight: 950,
                      letterSpacing: 1.4,
                      marginBottom: 18,
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

                    LIVE STEP
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 18,
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      minWidth: 112,
                      width: 112,
                      height: 112,
                      borderRadius: 30,
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
                        fontSize: 28,
                        fontWeight: 950,
                        color: accent,
                        lineHeight: 1,
                        marginBottom: 10,
                      }}
                    >
                      {time}
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        letterSpacing: 1.8,
                        fontWeight: 950,
                        color: accent,
                      }}
                    >
                      {getStatusLabel(item.status)}
                    </div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        fontSize: 31,
                        lineHeight: 0.98,
                        letterSpacing: "-1.3px",
                        color: "#04133d",
                        fontWeight: 950,
                        margin: "0 0 8px",
                      }}
                    >
                      {item.title}
                    </h3>

                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 800,
                        color: "#8b92ab",
                        marginBottom: 16,
                      }}
                    >
                      {item.category}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginBottom: 14,
                      }}
                    >
                      {item.source && <Tag text={item.source} />}

                      {item.confidence && (
                        <Tag text={item.confidence} />
                      )}

                      {item.buffer && (
                        <Tag text={item.buffer} green />
                      )}
                    </div>

                    {item.operationalSignals?.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          marginBottom: 16,
                        }}
                      >
                        {item.operationalSignals.map(
                          (signal, index) => {
                            const signalStyle =
                              getSignalStyle(signal.severity);

                            return (
                              <span
                                key={index}
                                style={{
                                  background: signalStyle.bg,
                                  color: signalStyle.color,
                                  padding: "10px 13px",
                                  borderRadius: 999,
                                  fontSize: 12,
                                  fontWeight: 850,
                                  lineHeight: 1.2,
                                }}
                              >
                                {signal.label}
                              </span>
                            );
                          }
                        )}
                      </div>
                    )}

                    <p
                      style={{
                        fontSize: 16,
                        lineHeight: 1.48,
                        color: "#667085",
                        margin: "0 0 18px",
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
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: "#22c55e",
                          boxShadow:
                            "0 0 12px rgba(34,197,94,0.8)",
                        }}
                      />

                      Updated 2 min ago
                    </div>
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
        padding: "9px 13px",
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
