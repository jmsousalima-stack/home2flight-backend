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
      return "Elevada";
    case "medium":
      return "Moderada";
    case "low":
      return "Reduzida";
    default:
      return "Pendente";
  }
}

function getLiveLabel(item) {
  if (item?.status === "risk") return "Atenção";
  if (item?.status === "buffer") return "Margem";
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
        padding: "34px 16px 120px",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        @keyframes h2fPulse {
          0% { transform: scale(1); opacity: 0.75; }
          50% { transform: scale(1.75); opacity: 0.12; }
          100% { transform: scale(1); opacity: 0.75; }
        }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontSize: "clamp(38px, 10vw, 54px)",
            lineHeight: 0.92,
            letterSpacing: "-2.4px",
            fontWeight: 950,
            color: "#03133d",
            margin: "0 0 14px",
          }}
        >
          Operational
          <br />
          timeline
        </h2>

        <p
          style={{
            fontSize: 16,
            lineHeight: 1.42,
            color: "#707b97",
            margin: 0,
            maxWidth: 320,
          }}
        >
          Plano operacional recalculado em tempo real.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {timeline.map((item, index) => {
          const status = item?.status || "ready";
          const accent = getAccentColor(status);
          const borderColor = getBorderColor(status);
          const softBg = getSoftBackground(status);
          const isLive = status === "risk" || status === "buffer";
          const isCritical =
            item?.step === "leave_home" || item?.step === "arrive_airport";
          const confidenceScore = item?.confidenceScore ?? 0;
          const primaryFlag = getPrimaryFlag(item);
          const time = formatTimelineTime(item);

          return (
            <article
              key={getItemKey(item, index)}
              style={{
                background: "#ffffff",
                border: isCritical
                  ? `2px solid ${accent}`
                  : `1.5px solid ${borderColor}`,
                borderRadius: 28,
                padding: isCritical ? 20 : 16,
                boxShadow: isCritical
                  ? `0 18px 44px ${accent}22`
                  : isLive
                    ? `0 12px 34px ${accent}18`
                    : "0 10px 28px rgba(15,23,42,0.05)",
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
                  height: isLive ? 5 : 3,
                  background: accent,
                  opacity: isLive ? 0.9 : 0.3,
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    color: "#8b92ab",
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                  }}
                >
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      background: softBg,
                      border: `1.5px solid ${borderColor}`,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: accent,
                      fontSize: 11,
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
                  gridTemplateColumns: "76px 1fr",
                  gap: 14,
                  alignItems: "start",
                }}
              >
                <div
                  style={{
                    width: 76,
                    minHeight: 76,
                    borderRadius: 20,
                    background: softBg,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      fontSize: 21,
                      fontWeight: 950,
                      color: accent,
                      lineHeight: 1,
                      marginBottom: 7,
                    }}
                  >
                    {time}
                  </div>

                  <div
                    style={{
                      fontSize: 10,
                      letterSpacing: 1.2,
                      fontWeight: 950,
                      color: accent,
                    }}
                  >
                    {getStatusLabel(status)}
                  </div>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: isCritical
                          ? "clamp(28px, 7vw, 34px)"
                          : "clamp(22px, 6vw, 28px)",
                        lineHeight: 1,
                        letterSpacing: "-1px",
                        color: "#04133d",
                        fontWeight: 950,
                        margin: 0,
                      }}
                    >
                      {item?.title}
                    </h3>

                    <MoodPill
                      text={getStepMood(item)}
                      accent={accent}
                      softBg={softBg}
                    />
                  </div>

                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#8b92ab",
                      marginBottom: 10,
                    }}
                  >
                    {item?.category}
                  </div>

                  <ExecutiveInsight
                    item={item}
                    accent={accent}
                    confidenceScore={confidenceScore}
                  />

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginBottom: primaryFlag ? 10 : 12,
                    }}
                  >
                    <Tag text={`${confidenceScore}%`} accent={accent} />
                    <Tag text={getTrustLabel(item?.trustLevel)} />

                    {item?.buffer && item.buffer !== "Pending" && (
                      <Tag text={item.buffer} green />
                    )}
                  </div>

                  {primaryFlag && <SignalPill signal={primaryFlag} />}

                  {item?.reasoning && (
                    <p
                      style={{
                        fontSize: 14,
                        lineHeight: 1.4,
                        color: "#667085",
                        margin: "0 0 10px",
                      }}
                    >
                      {item.reasoning}
                    </p>
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      color: "#98a2b3",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 999,
                        background: "#22c55e",
                        flexShrink: 0,
                      }}
                    />
                    Atualizado agora
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
        padding: "5px 9px",
        fontSize: 11,
        fontWeight: 900,
        whiteSpace: "nowrap",
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
        background: "#f8fafc",
        border: "1px solid #edf2f7",
        borderRadius: 18,
        padding: 12,
        marginBottom: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            color: "#64748b",
            fontSize: 10,
            fontWeight: 950,
            letterSpacing: 1.1,
            textTransform: "uppercase",
          }}
        >
          Decisão do motor
        </div>

        <div
          style={{
            color: accent,
            fontSize: 11,
            fontWeight: 950,
          }}
        >
          {confidenceScore}%
        </div>
      </div>

      <div
        style={{
          color: "#263244",
          fontSize: 14,
          lineHeight: 1.35,
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
        gap: 7,
        background: isLive ? softBg : "#eef2f7",
        color: isLive ? accent : "#64748b",
        borderRadius: 999,
        padding: "6px 10px",
        fontSize: 9,
        fontWeight: 950,
        letterSpacing: 1,
        whiteSpace: "nowrap",
        textTransform: "uppercase",
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: isLive ? accent : "#22c55e",
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
        padding: "7px 10px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 850,
        lineHeight: 1.2,
        marginBottom: 10,
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
        padding: "7px 10px",
        borderRadius: 999,
        fontSize: 11,
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