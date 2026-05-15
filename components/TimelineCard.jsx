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
      return "RISCO";
    case "buffer":
      return "BUFFER";
    default:
      return "PRONTO";
  }
}

function getTrustLabel(trustLevel) {
  switch (trustLevel) {
    case "high":
      return "Confiança elevada";
    case "medium":
      return "Confiança moderada";
    case "low":
      return "Confiança reduzida";
    default:
      return "Confiança em análise";
  }
}

function getLiveLabel(item) {
  if (item?.status === "risk") return "Atenção ativa";
  if (item?.status === "buffer") return "Margem ativa";
  if (item?.dynamicStatus === "flight_tracking") return "Voo monitorizado";
  if (item?.dynamicStatus === "airport_monitoring") return "Aeroporto monitorizado";
  if (item?.dynamicStatus === "transport_monitoring") return "Transporte monitorizado";
  return "Ativo";
}

function getPrimaryFlag(item) {
  const flags = item?.intelligenceFlags || item?.operationalSignals || [];
  return flags[0] || null;
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

function formatTimelineTime(item) {
  const rawDate =
    item?.recommendedTime ||
    item?.time ||
    item?.scheduledTime ||
    item?.departureTime ||
    null;

  if (!rawDate) return "--:--";

  const date = new Date(rawDate);

  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getItemKey(item, index) {
  return item?.id || item?.step || `${item?.title || "timeline"}-${index}`;
}

function getStepMood(item) {
  if (item?.status === "risk") return "Ação necessária";
  if (item?.status === "buffer") return "Margem aplicada";
  return "Tudo alinhado";
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
          0% { transform: scale(1); opacity: 0.75; }
          50% { transform: scale(1.85); opacity: 0.14; }
          100% { transform: scale(1); opacity: 0.75; }
        }

        @keyframes h2fGlow {
          0% { box-shadow: 0 18px 38px rgba(15,23,42,0.08); }
          50% { box-shadow: 0 22px 52px rgba(15,23,42,0.15); }
          100% { box-shadow: 0 18px 38px rgba(15,23,42,0.08); }
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

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {timeline.map((item, index) => {
          const status = item?.status || "ready";
          const accent = getAccentColor(status);
          const borderColor = getBorderColor(status);
          const softBg = getSoftBackground(status);
          const isLive = status === "risk" || status === "buffer";
          const confidenceScore = item?.confidenceScore ?? 0;
          const primaryFlag = getPrimaryFlag(item);
          const time = formatTimelineTime(item);

          return (
            <article
              key={getItemKey(item, index)}
              style={{
                background: "#ffffff",
                border: `2px solid ${borderColor}`,
                borderRadius: 30,
                padding: 18,
                boxShadow: isLive
                  ? `0 20px 52px ${accent}24`
                  : "0 14px 36px rgba(15,23,42,0.06)",
                position: "relative",
                overflow: "hidden",
                animation: isLive ? "h2fGlow 3.8s ease-in-out infinite" : "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: `radial-gradient(circle at 92% 0%, ${accent}28 0%, transparent 34%)`,
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: isLive ? 7 : 4,
                  background: accent,
                  opacity: isLive ? 0.95 : 0.32,
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 18,
                  alignItems: "center",
                  position: "relative",
                  zIndex: 1,
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
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <div
                  style={{
                    width: 92,
                    minHeight: 92,
                    borderRadius: 24,
                    background: softBg,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    padding: "10px 6px",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 950,
                      color: accent,
                      lineHeight: 1,
                      marginBottom: 9,
                      textAlign: "center",
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
                    {getStatusLabel(status)}
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
                    {item?.title}
                  </h3>

                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#8b92ab",
                      marginBottom: 14,
                    }}
                  >
                    {item?.category}
                  </div>

                  <MoodPill text={getStepMood(item)} accent={accent} softBg={softBg} />

                  <ExecutiveInsight
                    item={item}
                    accent={accent}
                    confidenceScore={confidenceScore}
                  />

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 7,
                      marginBottom: primaryFlag ? 12 : 14,
                    }}
                  >
                    <Tag text={`${confidenceScore}% confiança`} accent={accent} />
                    <Tag text={getTrustLabel(item?.trustLevel)} />
                    {item?.buffer && item.buffer !== "Pending" && (
                      <Tag text={item.buffer} green />
                    )}
                  </div>

                  {primaryFlag && <SignalPill signal={primaryFlag} />}

                  {item?.reasoning && (
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
                  )}

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
                    Atualizado há {item?.lastUpdatedMinutesAgo ?? 2} min
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

function MoodPill({ text, accent, softBg }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: softBg,
        color: accent,
        borderRadius: 999,
        padding: "7px 11px",
        fontSize: 12,
        fontWeight: 900,
        marginBottom: 12,
      }}
    >
      {text}
    </div>
  );
}

function ExecutiveInsight({ item, accent, confidenceScore }) {
  const insight =
    item?.liveInsight ||
    item?.operationalInsight?.[0] ||
    item?.reasoning ||
    "Etapa calculada pelo motor operacional.";

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        border: "1px solid #e9eef6",
        borderRadius: 20,
        padding: 14,
        marginBottom: 13,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            color: "#64748b",
            fontSize: 11,
            fontWeight: 950,
            letterSpacing: 1.2,
            textTransform: "uppercase",
          }}
        >
          Decisão do motor
        </div>

        <div
          style={{
            color: accent,
            fontSize: 12,
            fontWeight: 950,
            whiteSpace: "nowrap",
          }}
        >
          {confidenceScore}%
        </div>
      </div>

      <div
        style={{
          color: "#263244",
          fontSize: 15,
          lineHeight: 1.38,
          fontWeight: 800,
        }}
      >
        {insight}
      </div>
    </div>
  );
}

function LiveBadge({ item, accent, softBg }) {
  const isLive = item?.status === "risk" || item?.status === "buffer";

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

function SignalPill({ signal }) {
  const signalStyle = getSignalStyle(signal?.severity);

  return (
    <div
      style={{
        display: "inline-flex",
        background: signalStyle.bg,
        color: signalStyle.color,
        padding: "8px 11px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 850,
        lineHeight: 1.2,
        marginBottom: 14,
      }}
    >
      {signal?.label}
    </div>
  );
}

function Tag({ text, green = false, accent }) {
  return (
    <span
      style={{
        padding: "8px 11px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 850,
        background: green ? "#e7f8ef" : "#eef2f7",
        color: green ? "#1f9d61" : accent || "#49566f",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}