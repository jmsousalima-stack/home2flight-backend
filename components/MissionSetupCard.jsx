// /components/MissionSetupCard.jsx

"use client";

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.07)",
  padding: "15px 14px",
  color: "white",
  fontSize: 15,
  outline: "none",
};

function ToggleButton({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 16,
        padding: "13px 10px",
        border: active
          ? "1px solid rgba(34,197,94,0.55)"
          : "1px solid rgba(255,255,255,0.10)",
        background: active
          ? "rgba(34,197,94,0.14)"
          : "rgba(255,255,255,0.045)",
        color: "white",
        fontWeight: 850,
        fontSize: 13,
      }}
    >
      {label}
    </button>
  );
}

export default function MissionSetupCard({
  mission,
  setMission,
  onGenerate,
  loading,
}) {
  function update(field, value) {
    setMission((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  return (
    <section
      style={{
        borderRadius: 32,
        padding: 22,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.105), rgba(255,255,255,0.04))",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 28px 70px rgba(0,0,0,0.34)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: "#9fb0d1",
          fontWeight: 950,
          marginBottom: 12,
        }}
      >
        Create Mission
      </div>

      <div
        style={{
          fontSize: 34,
          lineHeight: 1,
          fontWeight: 950,
          letterSpacing: "-2px",
          marginBottom: 10,
        }}
      >
        Preparar voo
      </div>

      <div
        style={{
          color: "#cbd5e1",
          fontSize: 15,
          lineHeight: 1.45,
          marginBottom: 22,
        }}
      >
        Cria uma timeline operacional personalizada para chegares ao embarque
        com margem.
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <input
            value={mission.flight}
            onChange={(event) =>
              update("flight", event.target.value.toUpperCase())
            }
            placeholder="Voo"
            style={inputStyle}
          />

          <input
            value={mission.airport}
            onChange={(event) =>
              update("airport", event.target.value.toUpperCase())
            }
            placeholder="Aeroporto"
            style={inputStyle}
          />
        </div>

        <input
          value={mission.origin}
          onChange={(event) => update("origin", event.target.value)}
          placeholder="Origem da jornada"
          style={inputStyle}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <input
            value={mission.terminal}
            onChange={(event) => update("terminal", event.target.value)}
            placeholder="Terminal"
            style={inputStyle}
          />

          <select
            value={mission.transport}
            onChange={(event) => update("transport", event.target.value)}
            style={inputStyle}
          >
            <option value="car">Carro</option>
            <option value="uber">Uber / TVDE</option>
            <option value="public">Transportes públicos</option>
          </select>
        </div>

        <select
          value={mission.flightType}
          onChange={(event) => update("flightType", event.target.value)}
          style={inputStyle}
        >
          <option value="schengen">Schengen / sem passaporte</option>
          <option value="passport">Com controlo de passaporte</option>
        </select>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <ToggleButton
            label="Bagagem"
            active={mission.bags}
            onClick={() => update("bags", !mission.bags)}
          />

          <ToggleButton
            label="Crianças"
            active={mission.kids}
            onClick={() => update("kids", !mission.kids)}
          />

          <ToggleButton
            label="Check-in online"
            active={mission.checkedIn}
            onClick={() => update("checkedIn", !mission.checkedIn)}
          />

          <ToggleButton
            label="Fast track"
            active={mission.fastTrack}
            onClick={() => update("fastTrack", !mission.fastTrack)}
          />

          <ToggleButton
            label="Embarque prioritário"
            active={mission.priorityBoarding}
            onClick={() =>
              update("priorityBoarding", !mission.priorityBoarding)
            }
          />

          <ToggleButton
            label="Hora manual"
            active={mission.useManualTime}
            onClick={() => update("useManualTime", !mission.useManualTime)}
          />
        </div>

        {mission.useManualTime && (
          <input
            type="datetime-local"
            value={mission.departureTime}
            onChange={(event) => update("departureTime", event.target.value)}
            style={inputStyle}
          />
        )}

        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          style={{
            marginTop: 8,
            border: "none",
            borderRadius: 20,
            padding: "17px 20px",
            background: loading
              ? "rgba(37,99,235,0.45)"
              : "linear-gradient(135deg, #2563eb, #1d4ed8)",
            color: "white",
            fontWeight: 950,
            fontSize: 15,
            boxShadow: "0 20px 50px rgba(37,99,235,0.35)",
          }}
        >
          {loading ? "A gerar missão..." : "Generate Operational Plan"}
        </button>
      </div>
    </section>
  );
}