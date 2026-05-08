export default function TimelineCard({ timeline }) {
  if (!timeline || timeline.length === 0) return null;

  return (
    <div
      style={{
        background: "white",
        borderRadius: 24,
        padding: 24,
        border: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>
        Timeline
      </h2>

      {timeline.map((item) => (
        <div
          key={item.step}
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            padding: 16,
            borderRadius: 18,
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              minWidth: 72,
              height: 72,
              borderRadius: 18,
              background: "#e0f2fe",
              color: "#0284c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 18,
            }}
          >
            {new Date(item.recommendedTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              {item.title}
            </div>

            <div
              style={{
                marginTop: 6,
                color: "#64748b",
                fontSize: 14,
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
