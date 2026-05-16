"use client";

import { useEffect, useState } from "react";

import DepartureDecisionCard from "../components/DepartureDecisionCard";
import OperationalIntelligenceCard from "../components/OperationalIntelligenceCard";
import OperationalPulseCard from "../components/OperationalPulseCard";
import ReliabilityCard from "../components/ReliabilityCard";
import TimelineCard from "../components/TimelineCard";

const ENGINE_URL =
  "/api/home2flight?flight=TP1367&origin=Lisboa&airport=LIS&airline=TP&terminal=1&bags=true&kids=true&checkedIn=false&flightType=passport&transport=public";

function isFinishedFlight(data) {
  const status = String(data?.flight?.status || "").toLowerCase();
  const firstStep = data?.timeline?.[0]?.step;

  return (
    status === "landed" ||
    status === "finished" ||
    firstStep === "flight_finished"
  );
}

export default function Home() {
  const [timelineData, setTimelineData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadEngine() {
      try {
        const response = await fetch(ENGINE_URL, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Engine error: ${response.status}`);
        }

        const json = await response.json();

        if (!json?.success) {
          throw new Error(json?.error || "Engine failed");
        }

        setTimelineData(json);
      } catch (err) {
        setError(err.message);
      }
    }

    loadEngine();
  }, []);

  if (error) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 24,
            padding: 24,
            maxWidth: 420,
          }}
        >
          <h1
            style={{
              marginTop: 0,
              fontSize: 28,
            }}
          >
            Home2Flight Engine Error
          </h1>

          <p
            style={{
              color: "#cbd5e1",
              lineHeight: 1.5,
            }}
          >
            Não foi possível carregar o motor operacional.
          </p>

          <p
            style={{
              color: "#94a3b8",
              fontSize: 13,
              marginTop: 16,
            }}
          >
            {error}
          </p>
        </div>
      </main>
    );
  }

  if (!timelineData) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Loading Home2Flight Operational Engine...
      </main>
    );
  }

  if (isFinishedFlight(timelineData)) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top, #10204a 0%, #020617 58%)",
          color: "white",
          padding: "28px 16px 80px",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <section
          style={{
            width: "100%",
            maxWidth: 520,
            margin: "0 auto",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 34,
            padding: 28,
            boxShadow: "0 28px 80px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: "#93a4c8",
              fontWeight: 900,
              marginBottom: 18,
            }}
          >
            Home2Flight Operational AI
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(34,197,94,0.14)",
              border: "1px solid rgba(34,197,94,0.35)",
              color: "#86efac",
              borderRadius: 999,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 900,
              marginBottom: 24,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "#22c55e",
                boxShadow: "0 0 16px rgba(34,197,94,0.8)",
              }}
            />
            Voo concluído
          </div>

          <h1
            style={{
              fontSize: "clamp(44px, 12vw, 66px)",
              lineHeight: 0.92,
              letterSpacing: "-3px",
              margin: "0 0 20px",
              fontWeight: 950,
            }}
          >
            Esta timeline
            <br />
            já terminou
          </h1>

          <p
            style={{
              fontSize: 18,
              lineHeight: 1.45,
              color: "#cbd5e1",
              margin: "0 0 26px",
            }}
          >
            O voo {timelineData?.flight?.number || ""} já saiu ou chegou ao
            destino. A Home2Flight não gera uma recomendação pré-voo normal
            para voos concluídos.
          </p>

          <div
            style={{
              background: "rgba(15,23,42,0.72)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 24,
              padding: 20,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                color: "#94a3b8",
                fontSize: 13,
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              Estado do voo
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 950,
                marginBottom: 8,
              }}
            >
              {String(timelineData?.flight?.status || "concluído").toUpperCase()}
            </div>

            <div
              style={{
                color: "#cbd5e1",
                fontSize: 15,
                lineHeight: 1.4,
              }}
            >
              {timelineData?.flight?.route?.from?.code || "Origem"} →{" "}
              {timelineData?.flight?.route?.to?.code || "Destino"}
            </div>
          </div>

          <div
            style={{
              background: "rgba(15,23,42,0.72)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 24,
              padding: 20,
            }}
          >
            <div
              style={{
                color: "#94a3b8",
                fontSize: 13,
                fontWeight: 800,
                marginBottom: 8,
              }}
            >
              Próxima ação
            </div>

            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                lineHeight: 1.25,
                marginBottom: 8,
              }}
            >
              Usa um voo futuro para gerar uma nova timeline operacional.
            </div>

            <p
              style={{
                color: "#cbd5e1",
                margin: 0,
                lineHeight: 1.45,
                fontSize: 15,
              }}
            >
              Este comportamento protege o utilizador de uma recomendação
              operacional incorreta.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #0f172a 0%, #020617 52%)",
        padding: "22px 14px 80px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <OperationalPulseCard data={timelineData} />

        <ReliabilityCard data={timelineData} />

        <OperationalIntelligenceCard
          reliability={timelineData?.reliability}
          confidence={timelineData?.confidence}
          airportIntelligence={timelineData?.airportIntelligence}
        />

        <DepartureDecisionCard timelineData={timelineData} />

        <TimelineCard timeline={timelineData?.timeline || []} />
      </div>
    </main>
  );
}