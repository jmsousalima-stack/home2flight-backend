"use client";

function getBorderColor(status) {
  switch (status) {
    case "risk":
      return "#f3a6b2";

    case "buffer":
      return "#ead27a";

    default:
      return "#b9ecff";
  }
}

function getAccentColor(status) {
  switch (status) {
    case "risk":
      return "#e5485d";

    case "buffer":
      return "#c99600";

    default:
      return "#1da9e8";
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

function getSignalStyle(type = "neutral") {
  switch (type) {
    case "risk":
      return {
        bg: "#fff1f2",
        color: "#dc3545",
      };

    case "warning":
      return {
        bg: "#fff8e6",
        color: "#b77900",
      };

    case "good":
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
        background: "#f7f7fb",
        borderTopLeftRadius: 44,
        borderTopRightRadius: 44,
        marginTop: 34,
        padding: "42px 22px 140px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          marginBottom: 36,
        }}
      >
        <h2
          style={{
            fontSize: "clamp(48px, 12vw, 72px)",
            lineHeight: 0.92,
            letterSpacing: "-3px",
            fontWeight: 950,
            color: "#04133a",
            marginBottom: 18,
          }}
        >
          Operational timeline
        </h2>

        <p
          style={{
            fontSize: 19,
            lineHeight: 1.45,
            color: "#707b97",
            maxWidth: 500,
          }}
        >
          Plano dinâmico por risco, voo, transporte e sinais operacionais.
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          left: 72,
          top: 220,
          bottom: 80,
          width: 2,
          background:
            "linear-gradient(to bottom, rgba(29,169,232,0.25), rgba(29,169,232,0.06))",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 26,
          position: "relative",
          zIndex: 2,
        }}
      >
        {timeline.map((item, index) => {
          const borderColor = getBorderColor(item.status);
          const accent = getAccentColor(item.status);

          const time = new Date(item.time).toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          });

          const isCurrent =
            item.status === "risk" || item.status === "buffer";

          return (
            <div
              key={item.id}
              style={{
                position: "relative",
                paddingLeft: 34,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 18,
                  top: 54,
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  background: accent,
                  boxShadow: `0 0 22px ${accent}`,
                  border: "3px solid white",
                  zIndex: 3,
                }}
              />

              <div
                style={{
                  background: "rgba(255,255,255,0.88)",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  border: `2px solid ${borderColor}`,
                  borderRadius: 34,
                  padding: 22,
                  boxShadow:
                    "0 10px 30px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.6)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {isCurrent && (
                  <div
                    style={{
                      position: "absolute",
                      top: 18,
                      right: 18,
                      background:
                        item.status === "risk"
                          ? "rgba(229,72,93,0.12)"
                          : "rgba(201,150,0,0.12)",
                      color:
                        item.status === "risk"
                          ? "#d7263d"
                          : "#b77900",
                      borderRadius: 999,
                      padding: "8px 12px",
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: 1,
                    }}
                  >
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
                      minWidth: 104,
                      height: 104,
                      borderRadius: 28,
                      background: `${borderColor}33`,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 24,
                        lineHeight: 1,
                        fontWeight: 950,
                        color: accent,
                        marginBottom: 10,
                      }}
                    >
                      {time}
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 900,
                        letterSpacing: 1.4,
                        color: accent,
                      }}
                    >
                      {getStatusLabel(item.status)}
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 12,
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            fontSize: 24,
                            lineHeight: 1.02,
                            fontWeight: 900,
                            color: "#061235",
                            marginBottom: 8,
                          }}
                        >
                          {item.title}
                        </h3>

                        <div
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: "#8189a1",
                          }}
                        >
                          {item.category}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 10,
                        marginBottom: 16,
                      }}
                    >
                      {item.source && (
                        <Tag text={item.source} />
                      )}

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
                          marginBottom: 18,
                        }}
                      >
                        {item.operationalSignals.map((signal, signalIndex) => {
                          const signalStyle = getSignalStyle(signal.type);

                          return (
                            <div
                              key={signalIndex}
                              style={{
                                background: signalStyle.bg,
                                color: signalStyle.color,
                                padding: "10px 14px",
                                borderRadius: 999,
                                fontSize: 13,
                                fontWeight: 800,
                              }}
                            >
                              {signal.label}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <p
                      style={{
                        fontSize: 18,
                        lineHeight: 1.48,
                        color: "#667085",
                        marginBottom: 18,
                      }}
                    >
                      {item.reasoning}
                    </p>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        color: "#94a3b8",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: "#22c55e",
                          boxShadow: "0 0 10px rgba(34,197,94,0.7)",
                        }}
                      />

                      Updated 2 min ago
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Tag({ text, green = false }) {
  return (
    <div
      style={{
        padding: "10px 14px",
        borderRadius: 999,
        fontSize: 14,
        fontWeight: 800,
        background: green ? "#e7f8ef" : "#eef2f7",
        color: green ? "#1f9d61" : "#4b5875",
      }}
    >
      {text}
    </div>
  );
}
