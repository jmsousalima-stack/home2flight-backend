export default function TimelineCard({ timeline }) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: 32,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 800,
          color: "#0f172a",
          marginBottom: 12,
        }}
      >
        Timeline
      </div>

      {timeline.map((item, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            gap: 18,
            alignItems: "center",
            background: "#f8fafc",
            borderRadius: 24,
            padding: 18,
          }}
        >
          <div
            style={{
              minWidth: 82,
              height: 82,
              borderRadius: 22,
              background: "#dbeafe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0284c7",
              fontWeight: 800,
              fontSize: 28,
            }}
          >
            {new Date(item.recommendedTime).toLocaleTimeString(
              "pt-PT",
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              flex: 1,
            }}
          >
            <div
              style={{
                color: "#0f172a",
                fontSize: 24,
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {item.title}
            </div>

            <div
              style={{
                color: "#64748b",
                fontSize: 18,
                textTransform: "capitalize",
              }}
            >
              {item.category}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
