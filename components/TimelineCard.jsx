"use client";

export default function TimelineCard({ timeline = [] }) {
  const getStyle = (status) => {
    switch (status) {
      case "risk":
        return {
          border: "#f3a6ad",
          bg: "#fff5f6",
          text: "#dc2626",
          label: "RISK",
        };

      case "buffer":
        return {
          border: "#f3d76b",
          bg: "#fff9db",
          text: "#b77900",
          label: "BUFFER",
        };

      default:
        return {
          border: "#bfefff",
          bg: "#eefcff",
          text: "#1687b7",
          label: "READY",
        };
    }
  };

  return (
    <section
      style={{
        background: "#f8f8fb",
        borderRadius: 38,
        padding: "30px 18px 56px",
        marginTop: 24,
      }}
    >
      <h2
        style={{
          fontSize: 38,
          fontWeight: 900,
          lineHeight: 1,
          color: "#061235",
          margin: "0 0 12px",
          letterSpacing: "-1.5px",
        }}
      >
        Operational timeline
      </h2>

      <p
        style={{
          fontSize: 16,
          lineHeight: 1.35,
          color: "#6c7894",
          margin: "0 0 26px",
        }}
      >
        Plano dinâmico por risco, voo, transporte e sinais operacionais.
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {timeline.map((item) => {
          const style = getStyle(item.status);

          return (
            <div
              key={item.id}
              style={{
                border: `2px solid ${style.border}`,
                borderRadius: 28,
                background: "#ffffff",
                padding: 16,
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: 22,
                  background: style.bg,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 23,
                    fontWeight: 900,
                    color: style.text,
                    lineHeight: 1,
                  }}
                >
                  {new Date(item.time).toLocaleTimeString("pt-PT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>

                <div
                  style={{
                    marginTop: 7,
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: 1,
                    color: style.text,
                  }}
                >
                  {style.label}
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <h3
                  style={{
                    fontSize: 22,
                    lineHeight: 1.1,
                    fontWeight: 900,
                    color: "#07122f",
                    margin: "0 0 5px",
                    letterSpacing: "-0.4px",
                  }}
                >
                  {item.title}
                </h3>

                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#7b8398",
                    marginBottom: 10,
                  }}
                >
                  {item.category}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    marginBottom: 10,
                  }}
                >
                  <Tag text={item.confidence} />
                  <Tag text={item.source} />
                  <Tag text={item.buffer} green />
                </div>

                <p
                  style={{
                    fontSize: 13,
                    lineHeight: 1.35,
                    color: "#606b86",
                    margin: 0,
                  }}
                >
                  {item.reasoning}
                </p>
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
    <span
      style={{
        padding: "6px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 800,
        background: green ? "#e7f7ee" : "#eef0f6",
        color: green ? "#229b63" : "#44506b",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}
