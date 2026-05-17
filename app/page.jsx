"use client";

import { useEffect, useState } from "react";

import DepartureDecisionCard from "../components/DepartureDecisionCard";
import OperationalIntelligenceCard from "../components/OperationalIntelligenceCard";
import OperationalPulseCard from "../components/OperationalPulseCard";
import ReliabilityCard from "../components/ReliabilityCard";
import TimelineCard from "../components/TimelineCard";

const ENGINE_URL =
  "/api/engines/journey-planning-engine?flight=KL1578&origin=Lisboa&airport=LIS&airline=KL&terminal=1&transport=public&bags=true&kids=true&checkedIn=false&fastTrack=false&priorityBoarding=false&flightType=passport&forceManualTime=true&departureTime=2026-05-20T16:40:00%2B01:00";

function isFinishedFlight(data) {
  const status = String(data?.flight?.status || "").toLowerCase();
  const firstStep = data?.timeline?.[0]?.step;

  return (
    status === "landed" ||
    status === "finished" ||
    status === "cancelled" ||
    firstStep === "flight_finished"
  );
}

function normalizeJourneyData(data) {
  if (!data) return null;

  return {
    ...data,

    confidence: {
      level: data?.reliability?.trustLevel || "low",
      score:
        data?.airportIntelligence?.operationalIntelligence?.confidenceScore ||
        data?.sources?.route?.confidenceScore ||
        data?.reliability?.score ||
        0,
      strengths: [
        data?.flightIntelligence?.success
          ? "Dados reais de voo disponíveis."
          : "Hora de voo em modo manual/fallback.",
        data?.routeIntelligence?.success
          ? "Rota/trânsito integrados no cálculo."
          : "Rota em fallback conservador.",
        data?.airportIntelligence?.success
          ? "Perfil aeroportuário integrado na timeline."
          : "Perfil aeroportuário indisponível.",
      ],
      weaknesses: [
        ...(data?.airportIntelligence?.limitations || []),
        ...(data?.routeIntelligence?.reliability?.limitations || []),
        ...(data?.eventDisruptionIntelligence?.limitations || []),
      ],
    },

    uiSummary: {
      status: data?.uiSummary?.status || "sensitive",
      headline: data?.uiSummary?.headline || "Plano operacional calculado",
      shortMessage:
        data?.uiSummary?.shortMessage ||
        "Timeline gerada pelo Journey Planning Engine.",
      confidenceLabel:
        data?.reliability?.trustLevel === "high"
          ? "Confiança elevada"
          : data?.reliability?.trustLevel === "medium"
          ? "Confiança moderada"
          : "Confiança reduzida",
      reliabilityLabel:
        data?.reliability?.score >= 70
          ? "Fiável"
          : data?.reliability?.score >= 45
          ? "Sensível"
          : "Frágil",
      readinessLabel:
        data?.reliability?.readiness === "ready"
          ? "Pronta"
          : data?.reliability?.readiness === "sensitive"
          ? "Sensível"
          : "Frágil",
      mainRiskFactors:
        data?.reliability?.adjustments
          ?.filter((item) => item.impact < 0)
          ?.map((item) => item.reason) || [],
      keyActions: [
        !data?.journey?.profile?.checkedIn
          ? "Faz o check-in online assim que possível"
          : null,
        data?.journey?.profile?.bags
          ? "Reserva margem para bag drop"
          : null,
        data?.journey?.transport === "public"
          ? "Confirma transportes antes de sair"
          : null,
      ].filter(Boolean),
    },
  };
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
          throw new Error(json?.error || "Journey Planning Engine failed");
        }

        setTimelineData(normalizeJourneyData(json));
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
            Não foi possível carregar o Journey Planning Engine.
          </p>

          <p
            style={{
              color: "#94a3b8",
              fontSize: 13,
              marginTop: 16,
              wordBreak: "break-word",
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
        Loading Home2Flight Journey Planning Engine...
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