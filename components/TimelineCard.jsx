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

function getSoftBackground(status) {
  switch (status) {
    case "risk":
      return "#fff4f6";
    case "buffer":
      return "#fff9e6";
    default:
      return "#eefcff";
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
        color: "#dc3545",
      };
    case "medium":
      return {
        bg: "#fff8e6",
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
        background: "#f7f7fb",
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
            fontSize: "clamp(38px, 10vw, 58px)",
            lineHeight: 0.94,
            letterSpacing: "-2.2px",
            fontWeight: 950,
            color: "#04133a",
            margin: "0 0 16px",
          }}
        >
          Operational timeline
        </h2>

        <p
          style={{
            fontSize: 17,
            lineHeight: 1.42,
            color: "#707b97",
            margin: 0,
          }}
        >
          Plano dinâmico por risco, voo, transporte e sinais operacionais.
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          left: 38,
          top: 178,
          bottom: 84,
          width: 2,
          background:
            "linear-gradient(to bottom, rgba(29,169,232,0.25), rgba(29,169,232,0.05))",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
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

          const isLiveStep =
            item.status === "risk" || item.status === "buffer";

          return (
            <article
              key={item.id}
              style={{
                position: "relative",
                paddingLeft: 28,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 38,
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  background: accent,
                  boxShadow: `0 0 22px ${accent}`,
                  border: "4px solid #ffffff",
                  zIndex: 4,
                }}
              />

              <div
                style={{
                  background: "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  border: `2px solid ${borderColor}`,
                  borderRadius: 32,
                  padding: 20,
                  boxShadow:
                    "0 12px 34px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.7)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {isLiveStep && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      background:
                        item.status === "risk"
                          ? "rgba(229,72,93,0.1)"
                          : "rgba(201,150,0,0.1)",
                      color: accent,
                      borderRadius: 999,
                      padding: "8px 11px",
                      fontSize: 10,
                      fontWeight: 950,
                      letterSpacing: 1.2,
                      marginBottom: 16,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: accent,
                        boxShadow: `0 0 12px ${accent}`,
                      }}
                    />
                    LIVE STEP
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 18,
                  }}
                >
                  <div
                    style={{
                      width: 112,
                      height: 112,
                      borderRadius: 30,
                      background: softBg,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 26,
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
                        fontWeight: 950,
                        letterSpacing: 1.6,
                        color: accent,
                      }}
                    >
                      {getStatusLabel(item.status)}
                    </div>
                  </div>

                  <div style={{ width: "100%" }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        marginBottom: 14,
                      }}
                    >
                      <h3
                        style={{
                          fontSize: 28,
                          lineHeight: 1.02,
                          fontWeight: 950,
                          color: "#061235",
                          margin: 0,
                          letterSpacing: "-0.8px",
                        }}
                      >
                        {item.title}
                      </h3>

                      <div
                        style={{
                          fontSize: 17,
                          fontWeight: 800,
                          color: "#8189a1",
                        }}
                      >
                        {item.category}
                      </div>
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
                      {item.confidence && <Tag text={item.confidence} />}
                      {item.buffer && <Tag text={item.buffer} green />}
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
                        {item.operationalSignals.map((signal, index) => {
                          const signalStyle = getSignalStyle(signal.severity);

                          return (
                            <span
                              key={index}
                              style={{
                                background: signalStyle.bg,
                                color: signalStyle.color,
                                padding: "9px 12px",
                                borderRadius: 999,
                                fontSize: 12,
                                lineHeight: 1.2,
                                fontWeight: 850,
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
                        fontSize: 16,
                        lineHeight: 1.45,
                        color: "#667085",
                        margin: "0 0 16px",
                      }}
                    >
                      {item.reasoning}
                    </p>

                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        color: "#94a3b8",
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
                          boxShadow: "0 0 10px rgba(34,197,94,0.75)",
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
        padding: "8px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 850,
        background: green ? "#e7f8ef" : "#eef2f7",
        color: green ? "#1f9d61" : "#4b5875",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}
