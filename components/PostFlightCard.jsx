"use client";

function formatTime(value) {
  if (!value) return "--:--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getFlightMode(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "landed") return "post_flight";
  if (normalized === "departed" || normalized === "active") return "in_flight";

  return "finished";
}

export default function PostFlightCard({ data }) {
  const flight = data?.flight || {};
  const mode = getFlightMode(flight?.status);

  const departureActual =
    flight?.departure?.actual ||
    flight?.departure?.estimated ||
    flight?.departure?.scheduled;

  const arrivalActual =
    flight?.arrival?.actual ||
    flight?.arrival?.estimated ||
    flight?.arrival?.scheduled;

  const routeFrom = flight?.route?.from?.code || "ORIGEM";
  const routeTo = flight?.route?.to?.code || "DESTINO";

  const isLanded = mode === "post_flight";

  return (
    <section
      style={{
        width: "100%",
        maxWidth: 520,
        margin: "0 auto",
        background:
          "linear-gradient(180deg, rgba(15,23,42,0.96), rgba(3,7,18,0.98))",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 34,
        padding: 24,
        color: "#ffffff",
        boxShadow: "0 28px 80px rgba(0,0,0,0.36)",
        fontFamily: "Arial, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -90,
          right: -90,
          width: 220,
          height: 220,
          background:
            "radial-gradient(circle, rgba(34,197,94,0.20) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          fontSize: 12,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: "#93a4c8",
          fontWeight: 950,
          marginBottom: 18,
          position: "relative",
          zIndex: 1,
        }}
      >
        Journey intelligence
      </div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          background: isLanded
            ? "rgba(34,197,94,0.14)"
            : "rgba(59,130,246,0.14)",
          border: isLanded
            ? "1px solid rgba(34,197,94,0.34)"
            : "1px solid rgba(59,130,246,0.34)",
          color: isLanded ? "#86efac" : "#93c5fd",
          borderRadius: 999,
          padding: "8px 12px",
          fontSize: 12,
          fontWeight: 950,
          marginBottom: 22,
          position: "relative",
          zIndex: 1,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: 999,
            background: isLanded ? "#22c55e" : "#3b82f6",
            boxShadow: isLanded
              ? "0 0 16px rgba(34,197,94,0.8)"
              : "0 0 16px rgba(59,130,246,0.8)",
          }}
        />
        {isLanded ? "Pós-voo ativo" : "Voo em curso"}
      </div>

      <h1
        style={{
          fontSize: "clamp(42px, 11vw, 62px)",
          lineHeight: 0.92,
          letterSpacing: "-3px",
          margin: "0 0 18px",
          fontWeight: 950,
          position: "relative",
          zIndex: 1,
        }}
      >
        {isLanded ? (
          <>
            Chegada
            <br />
            operacional
          </>
        ) : (
          <>
            Voo em
            <br />
            monitorização
          </>
        )}
      </h1>

      <p
        style={{
          fontSize: 17,
          lineHeight: 1.45,
          color: "#cbd5e1",
          margin: "0 0 22px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {isLanded
          ? "A Home2Flight pode continuar a ajudar depois da aterragem: saída do aeroporto, bagagem, passaporte, transporte e ligação seguinte."
          : "A Home2Flight muda para modo de acompanhamento: chegada prevista, impacto em ligações, transporte e próximos passos."}
      </p>

      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 26,
          padding: 20,
          marginBottom: 16,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            color: "#94a3b8",
            fontSize: 13,
            fontWeight: 850,
            marginBottom: 10,
          }}
        >
          Voo
        </div>

        <div
          style={{
            fontSize: 32,
            fontWeight: 950,
            letterSpacing: "-1px",
            marginBottom: 8,
          }}
        >
          {flight?.number || "Voo"}
        </div>

        <div
          style={{
            color: "#cbd5e1",
            fontSize: 16,
            fontWeight: 800,
          }}
        >
          {routeFrom} → {routeTo}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 16,
          position: "relative",
          zIndex: 1,
        }}
      >
        <MiniMetric
          title="Partida"
          value={formatTime(departureActual)}
          label={flight?.departure?.actual ? "Real" : "Estimado"}
        />

        <MiniMetric
          title="Chegada"
          value={formatTime(arrivalActual)}
          label={flight?.arrival?.actual ? "Real" : "Estimado"}
        />
      </div>

      <div
        style={{
          background: "rgba(255,255,255,0.045)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 26,
          padding: 18,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            color: "#93a4c8",
            fontSize: 12,
            fontWeight: 950,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Próximas camadas
        </div>

        <ActionRow
          title="Saída do aeroporto"
          description="Estimar tempo até estar fora do terminal."
          active={isLanded}
        />

        <ActionRow
          title="Bagagem e passaporte"
          description="Monitorizar variabilidade pós-aterragem."
          active={isLanded}
        />

        <ActionRow
          title="Transporte após chegada"
          description="Avaliar táxi, TVDE, metro, comboio ou pickup."
          active
        />
      </div>
    </section>
  );
}

function MiniMetric({ title, value, label }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.055)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 22,
        padding: 16,
      }}
    >
      <div
        style={{
          color: "#94a3b8",
          fontSize: 12,
          fontWeight: 850,
          marginBottom: 8,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 30,
          fontWeight: 950,
          lineHeight: 1,
          marginBottom: 8,
        }}
      >
        {value}
      </div>

      <div
        style={{
          color: "#86efac",
          fontSize: 12,
          fontWeight: 900,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function ActionRow({ title, description, active = false }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "12px 0",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: active ? "#22c55e" : "#64748b",
          boxShadow: active ? "0 0 14px rgba(34,197,94,0.75)" : "none",
          marginTop: 5,
          flexShrink: 0,
        }}
      />

      <div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 950,
            color: "#ffffff",
            marginBottom: 3,
          }}
        >
          {title}
        </div>

        <div
          style={{
            fontSize: 13,
            color: "#94a3b8",
            lineHeight: 1.35,
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
}