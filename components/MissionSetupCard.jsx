"use client";

export default function MissionSetupCard({
  mission,
  setMission,
  onGenerate,
  loading,
}) {
  function update(field, value) {
    setMission((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  return (
    <section
      style={{
        borderRadius: 36,
        padding: 24,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: "#9fb0d1",
          fontWeight: 900,
          marginBottom: 18,
        }}
      >
        Create Mission
      </div>

      <div
        style={{
          fontSize: 38,
          lineHeight: 1,
          fontWeight: 950,
          marginBottom: 14,
          letterSpacing: "-2px",
        }}
      >
        Preparar voo
      </div>

      <div
        style={{
          color: "#cbd5e1",
          lineHeight: 1.5,
          marginBottom: 28,
          fontSize: 16,
        }}
      >
        Introduz os detalhes da jornada para gerar uma timeline operacional personalizada.
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <input
          value={mission.flight}
          onChange={(e) =>
            update("flight", e.target.value.toUpperCase())
          }
          placeholder="Número do voo"
          style={inputStyle}
        />

        <input
          value={mission.origin}
          onChange={(e) =>
            update("origin", e.target.value)
          }
          placeholder="Origem da jornada"
          style={inputStyle}
        />

        <select
          value={mission.transport}
          onChange={(e) =>
            update("transport", e.target.value)
          }
          style={inputStyle}
        >
          <option value="car">Carro</option>
          <option value="uber">Uber / TVDE</option>
          <option value="public">Transportes públicos</option>
        </select>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          {[
            {
              key: "bags",
              label: "Bagagem",
            },
            {
              key: "kids",
              label: "Crianças",
            },
            {
              key: "checkedIn",
              label: "Check-in online",
            },
            {
              key: "fastTrack",
              label: "Fast track",
            },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() =>
                update(
                  item.key,
                  !mission[item.key]
                )
              }
              style={{
                borderRadius: 18,
                padding: "16px 14px",
                border: mission[item.key]
                  ? "1px solid rgba(34,197,94,0.45)"
                  : "1px solid rgba(255,255,255,0.08)",
                background: mission[item.key]
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(255,255,255,0.04)",
                color: "white",
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          onClick={onGenerate}
          disabled={loading}
          style={{
            marginTop: 10,
            border: "none",
            borderRadius: 22,
            padding: "18px 20px",
            background:
              "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "white",
            fontWeight: 900,
            fontSize: 16,
            boxShadow:
              "0 20px 50px rgba(37,99,235,0.35)",
          }}
        >
          {loading
            ? "A gerar missão..."
            : "Generate Operational Plan"}
        </button>
      </div>
    </section>
  );
}

const inputStyle = {
  width: "100%",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.05)",
  padding: "18px 16px",
  color: "white",
  fontSize: 16,
  outline: "none",
};