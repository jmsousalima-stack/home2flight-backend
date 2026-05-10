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

function getTrustLabel(trustLevel) {
  switch (trustLevel) {
    case "high":
      return "High trust";
    case "medium":
      return "Medium trust";
    case "low":
      return "Low trust";
    default:
      return "Trust pending";
  }
}

function getRecalculationLabel(status) {
  switch (status) {
    case "risk_adjusted":
      return "Risk adjusted";
    case "recalculated":
      return "Recalculated";
    case "monitoring":
      return "Monitoring";
    case "stable":
      return "Stable";
    default:
      return "Live check";
  }
}

function getLiveLabel(item) {
  if (item.recalculationStatus === "risk_adjusted") return "Risk adjusted";
  if (item.recalculationStatus === "recalculated") return "Recalculated";
  if (item.recalculationStatus === "monitoring") return "Monitoring";
  if (item.status === "risk") return "Live risk";
  if (item.status === "buffer") return "Live buffer";
  return "Active";
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

function getVisibleFlags(item) {
  const flags = item.intelligenceFlags || item.operationalSignals || [];

  return flags.slice(0, item.status === "risk" ? 3 : 2);
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
      <style>{`
        @keyframes h2fPulse {
          0% {
            transform: scale(1);
            opacity: 0.75;
          }
          50% {
            transform: scale(1.9);
            opacity: 0.15;
          }
          100% {
            transform: scale(1);
            opacity: 0.75;
          }
        }

        @keyframes h2fGlow {
          0% {
            box-shadow: 0 18px 38px rgba(15,23,42,0.08);
          }
          50% {
            box-shadow: 0 22px 48px rgba(15,23,42,0.14);
          }
          100% {
            box-shadow: 0 18px 38px rgba(15,23,42,0.08);
          }
        }
      `}</style>

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
          Plano dinâmico recalculado por voo, transporte, aeroporto e confiança
          operacional.
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
          const confidenceScore = item.confidenceScore ?? 0;
          const flags = getVisibleFlags(item);
          const isLive = item.status === "risk" || item.status === "buffer";

          const time = new Date(item.time).toLocaleTimeString("pt-PT", {
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <article
              key={item.id}
              style={{
                background: "#ffffff",
                border: `2px solid ${borderColor}`,
                borderRadius: 30,
                padding: 18,
                boxShadow: isLive
                  ? `0 18px 44px ${accent}1f`
                  : "0 14px 36px rgba(15,23,42,0.06)",
                position: "relative",
                overflow: "hidden",
                animation: isLive ? "h2fGlow 3.8s ease-in-out infinite" : "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: isLive ? 6 : 4,
                  background: accent,
                  opacity: isLive ? 0.95 : 0.36,
                }}
              />

              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 120,
                  height: 120,
                  background: `radial-gradient(circle, ${accent}22 0%, transparent 62%)`,
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 18,
                  alignItems: "center",
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

                <LiveBadge item={item} accent={accent} softBg={softBg} />
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
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      marginBottom: 13,
                    }}
                  >
                    <MiniMetric
                      label="Confidence"
                      value={`${confidenceScore}%`}
                      accent={accent}
                    />

                    <MiniMetric
                      label="Trust"
                      value={getTrustLabel(item.trustLevel)}
                      accent="#64748b"
                    />
                  </div>

                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #eef2f7",
                      borderRadius: 18,
                      padding: 13,
                      marginBottom: 13,
                    }}
                  >
                    <div
                      style={{
                        color: "#64748b",
                        fontSize: 11,
                        fontWeight: 950,
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                        marginBottom: 6,
                      }}
                    >
                      Engine insight
                    </div>

                    <div
                      style={{
                        color: "#334155",
                        fontSize: 14,
                        lineHeight: 1.35,
                        fontWeight: 750,
                      }}
                    >
                      {item.liveInsight || item.reasoning}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 7,
                      marginBottom: flags.length > 0 ? 12 : 14,
                    }}
                  >
                    <Tag text={getRecalculationLabel(item.recalculationStatus)} />
                    {item.source && <Tag text={item.source} />}
                    {item.buffer && item.buffer !== "Pending" && (
                      <Tag text={item.buffer} green />
                    )}
                  </div>

                  {flags.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 7,
                        marginBottom: 14,
                      }}
                    >
                      {flags.map((signal, signalIndex) => {
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
                    Updated {item.lastUpdatedMinutesAgo ?? 2} min ago
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

function LiveBadge({ item, accent, softBg }) {
  const isLive = item.status === "risk" || item.status === "buffer";

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: isLive ? softBg : "#eef2f7",
        color: isLive ? accent : "#64748b",
        borderRadius: 999,
        padding: "7px 11px",
        fontSize: 10,
        fontWeight: 950,
        letterSpacing: 1.1,
        whiteSpace: "nowrap",
        textTransform: "uppercase",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: isLive ? accent : "#22c55e",
          boxShadow: isLive ? `0 0 12px ${accent}` : "none",
          position: "relative",
          display: "inline-block",
        }}
      >
        {isLive && (
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 999,
              background: accent,
              animation: "h2fPulse 1.8s ease-in-out infinite",
            }}
          />
        )}
      </span>
      {getLiveLabel(item)}
    </div>
  );
}

function MiniMetric({ label, value, accent }) {
  return (
    <div
      style={{
        background: "#f8fafc",
        border: "1px solid #eef2f7",
        borderRadius: 16,
        padding: "10px 11px",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: 1,
          color: "#94a3b8",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontSize: 13,
          lineHeight: 1.15,
          fontWeight: 900,
          color: accent,
        }}
      >
        {value}
      </div>
    </div>
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
