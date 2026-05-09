"use client";

export default function TimelineCard({ timeline = [] }) {
  const getBorderColor = (status) => {
    switch (status) {
      case "risk":
        return "#f4b6bd";

      case "buffer":
        return "#f3d76b";

      default:
        return "#bfefff";
    }
  };

  const getBadgeColor = (status) => {
    switch (status) {
      case "risk":
        return "#e85b6b";

      case "buffer":
        return "#d49b00";

      default:
        return "#2eaadc";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "risk":
        return "RISK";

      case "buffer":
        return "BUFFER";

      default:
        return "READY";
    }
  };

  return (
    <section
      style={{
        background: "#f8f8fb",
        borderTopLeftRadius: 48,
        borderTopRightRadius: 48,
        padding: "42px 24px 120px",
        marginTop: 32,
      }}
    >
      <h2
        style={{
          fontSize: 58,
          fontWeight: 800,
          lineHeight: 1,
          color: "#061235",
          marginBottom: 18,
        }}
      >
        Operational timeline
      </h2>

      <p
        style={{
          fontSize: 18,
          lineHeight: 1.4,
          color: "#6c7894",
          marginBottom: 36,
        }}
      >
        Plano dinâmico por risco, voo, transporte e sinais operacionais.
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {timeline.map((item) => {
          const borderColor = getBorderColor(item.status);
          const badgeColor = getBadgeColor(item.status);

          return (
            <div
              key={item.id}
              style={{
                border: `3px solid ${borderColor}`,
                borderRadius: 36,
                background: "#ffffff",
                padding: 24,
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 22,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    minWidth: 112,
                    height: 112,
                    borderRadius: 24,
                    background: `${borderColor}33`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: badgeColor,
                    }}
                  >
                    {new Date(item.time).toLocaleTimeString("pt-PT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: 1,
                      color: badgeColor,
                    }}
                  >
                    {getStatusLabel(item.status)}
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      fontSize: 28,
                      lineHeight: 1.1,
                      fontWeight: 800,
                      color: "#07122f",
                      marginBottom: 10,
                    }}
                  >
                    {item.title}
                  </h3>

                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#7b8398",
                      marginBottom: 18,
                    }}
                  >
                    {item.category}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 10,
                      marginBottom: 18,
                    }}
                  >
                    <Tag text={item.confidence} />
                    <Tag text={item.source} />
                    <Tag text={item.buffer} green />
                  </div>

                  <p
                    style={{
                      fontSize: 18,
                      lineHeight: 1.5,
                      color: "#606b86",
                    }}
                  >
                    {item.reasoning}
                  </p>
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
        padding: "10px 16px",
        borderRadius: 999,
        fontSize: 15,
        fontWeight: 700,
        background: green ? "#e7f7ee" : "#eef0f6",
        color: green ? "#229b63" : "#44506b",
      }}
    >
      {text}
    </div>
  );
}
