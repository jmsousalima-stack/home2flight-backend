import DecisionExplanationCard from "../components/DecisionExplanationCard";
"use client";

import { useEffect, useMemo, useState } from "react";
import LiveOperationalStatusBar from "../components/LiveOperationalStatusBar";

const ENGINE_URL =
  "/api/engines/journey-planning-engine?flight=KL1578&origin=Lisboa&airport=LIS&airline=KL&terminal=1&transport=public&bags=true&kids=true&checkedIn=false&fastTrack=false&priorityBoarding=false&flightType=passport&forceManualTime=true&departureTime=2026-05-20T16:40:00%2B01:00";

function formatTime(value) {
  if (!value) return "--:--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOperationalState(status) {
  if (status === "stable") {
    return {
      label: "Fluxo operacional estável",
      shortLabel: "Estável",
      color: "#22c55e",
      soft: "rgba(34,197,94,0.16)",
      glow: "rgba(34,197,94,0.42)",
    };
  }

  if (status === "sensitive") {
    return {
      label: "Monitorização operacional ativa",
      shortLabel: "Sensível",
      color: "#f59e0b",
      soft: "rgba(245,158,11,0.16)",
      glow: "rgba(245,158,11,0.42)",
    };
  }

  return {
    label: "Plano operacionalmente frágil",
    shortLabel: "Frágil",
    color: "#ef4444",
    soft: "rgba(239,68,68,0.16)",
    glow: "rgba(239,68,68,0.45)",
  };
}

function getStepColor(category) {
  switch (category) {
    case "transport":
      return "#3b82f6";
    case "airport":
      return "#f59e0b";
    case "security":
      return "#ef4444";
    case "passport":
      return "#a855f7";
    case "check-in":
      return "#06b6d4";
    case "gate":
    case "boarding":
      return "#22c55e";
    case "flight":
      return "#60a5fa";
    default:
      return "#94a3b8";
  }
}

function getAirportLabel(data) {
  return (
    data?.journey?.airport ||
    data?.airportIntelligence?.airport?.code ||
    data?.flight?.route?.from?.code ||
    "LIS"
  );
}

function getTerminalLabel(data) {
  return data?.journey?.terminal || data?.flight?.departure?.terminal || "1";
}

function getFlightLabel(data) {
  return data?.flight?.number || data?.journey?.flight || "Flight";
}

function getNextCriticalStep(data) {
  const timeline = data?.timeline || [];

  const checkIn = timeline.find((item) => item.step === "checkin_bagdrop");
  const leaveHome = timeline.find((item) => item.step === "leave_home");

  if (checkIn && data?.journey?.profile?.checkedIn === false) {
    return {
      title: "Confirmar check-in online",
      text: "Reduz dependência operacional antes da saída para o aeroporto.",
      time: formatTime(checkIn.recommendedTime),
    };
  }

  if (leaveHome) {
    return {
      title: "Preparar saída",
      text: "A Home2Flight está a monitorizar rota, aeroporto e margem operacional.",
      time: formatTime(leaveHome.recommendedTime),
    };
  }

  return {
    title: "Monitorização ativa",
    text: "A Home2Flight está a acompanhar os sinais operacionais da jornada.",
    time: "--:--",
  };
}

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(ENGINE_URL, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Engine error ${response.status}`);
        }

        const json = await response.json();

        if (!json?.success) {
          throw new Error(json?.error || "Journey engine failed");
        }

        setData(json);
      } catch (err) {
        setError(err.message);
      }
    }

    load();
  }, []);

  const operationalState = useMemo(() => {
    return getOperationalState(data?.decision?.operationalStatus);
  }, [data]);

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
            maxWidth: 420,
            padding: 24,
            borderRadius: 28,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <h1 style={{ margin: "0 0 12px", fontSize: 28 }}>
            Home2Flight Engine Error
          </h1>
          <p style={{ color: "#cbd5e1", lineHeight: 1.5 }}>{error}</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "white",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Loading Home2Flight Mission Control...
      </main>
    );
  }

  const timeline = data?.timeline || [];
  const nextStep = getNextCriticalStep(data);
  const reliabilityScore = data?.reliability?.score ?? 0;
  const confidenceScore =
    data?.airportIntelligence?.operationalIntelligence?.confidenceScore ??
    data?.routeIntelligence?.reliability?.confidenceScore ??
    reliabilityScore;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #142449 0%, #071024 42%, #020617 100%)",
        color: "white",
        padding: "24px 16px 120px",
        fontFamily: "Arial, sans-serif",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes h2fPulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.8); opacity: 0.14; }
          100% { transform: scale(1); opacity: 0.8; }
        }

        @keyframes h2fBreath {
          0% { opacity: 0.62; transform: scale(1); }
          50% { opacity: 0.92; transform: scale(1.04); }
          100% { opacity: 0.62; transform: scale(1); }
        }

        @keyframes h2fFloat {
          0% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0); }
        }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: 540,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 22,
        }}
      >
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 42,
            padding: 28,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.105), rgba(255,255,255,0.045))",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 44px 130px rgba(0,0,0,0.48)",
            backdropFilter: "blur(22px)",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -120,
              right: -90,
              width: 280,
              height: 280,
              borderRadius: 999,
              background: operationalState.glow,
              filter: "blur(90px)",
              animation: "h2fBreath 4.8s ease-in-out infinite",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: 24,
              right: 24,
              width: 18,
              height: 18,
              borderRadius: 999,
              background: operationalState.color,
              boxShadow: `0 0 30px ${operationalState.color}`,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 999,
                background: operationalState.color,
                animation: "h2fPulse 2.2s ease-in-out infinite",
              }}
            />
          </div>

          <div style={{ position: "relative", zIndex: 2 }}>
            <div
              style={{
                fontSize: 12,
                letterSpacing: 4,
                textTransform: "uppercase",
                color: "#9fb0d1",
                fontWeight: 950,
                marginBottom: 22,
              }}
            >
              Home2Flight Mission Control
            </div>

            <LiveOperationalStatusBar timelineData={data} />

            <div
              style={{
                color: "#dbe4f0",
                fontSize: 18,
                marginBottom: 8,
              }}
            >
              Hora recomendada para sair
            </div>

            <div
              style={{
                fontSize: 88,
                lineHeight: 0.9,
                letterSpacing: "-6px",
                fontWeight: 950,
                marginBottom: 22,
              }}
            >
              {formatTime(data?.decision?.leaveHomeTime)}
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background: operationalState.soft,
                border: `1px solid ${operationalState.color}44`,
                borderRadius: 999,
                padding: "10px 16px",
                marginBottom: 24,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: operationalState.color,
                }}
              />
              <span style={{ fontWeight: 900, fontSize: 13 }}>
                {operationalState.label}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 24,
              }}
            >
              {[
                `✈ ${getFlightLabel(data)}`,
                `🛫 ${getAirportLabel(data)}`,
                `🏢 Terminal ${getTerminalLabel(data)}`,
                "📡 Monitoring live",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    background: "rgba(255,255,255,0.055)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 18,
                    padding: "11px 13px",
                    fontSize: 13,
                    color: "#dbe4f0",
                    fontWeight: 700,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.075)",
                borderRadius: 28,
                padding: 22,
              }}
            >
              <div
                style={{
                  color: "#9fb0d1",
                  fontSize: 12,
                  fontWeight: 950,
                  letterSpacing: 2.4,
                  marginBottom: 12,
                }}
              >
                LIVE OPERATIONAL INSIGHT
              </div>

              <div
                style={{
                  fontSize: 22,
                  lineHeight: 1.38,
                  fontWeight: 900,
                }}
              >
                Segurança com variabilidade moderada. Transporte público sob
                monitorização ativa.
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          {[
            {
              title: "Fiabilidade",
              value: `${reliabilityScore}%`,
              sub: operationalState.shortLabel,
            },
            {
              title: "Confiança",
              value: `${confidenceScore}%`,
              sub: "Modelo ativo",
            },
            {
              title: "Aeroporto",
              value:
                data?.airportIntelligence?.operationalIntelligence
                  ?.airportRisk === "medium"
                  ? "Fluxo moderado"
                  : "Monitorizado",
              sub: getAirportLabel(data),
            },
            {
              title: "Check-in",
              value: data?.journey?.profile?.checkedIn
                ? "Confirmado"
                : "Por confirmar",
              sub: data?.journey?.profile?.bags ? "Com bagagem" : "Sem bagagem",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background: "rgba(255,255,255,0.055)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 28,
                padding: 20,
                backdropFilter: "blur(14px)",
              }}
            >
              <div
                style={{
                  color: "#9fb0d1",
                  fontSize: 13,
                  marginBottom: 12,
                  fontWeight: 800,
                }}
              >
                {item.title}
              </div>

              <div
                style={{
                  fontSize: 22,
                  lineHeight: 1.1,
                  fontWeight: 950,
                  marginBottom: 8,
                }}
              >
                {item.value}
              </div>

              <div
                style={{
                  color: "#94a3b8",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {item.sub}
              </div>
            </div>
          ))}
        </section>
        
<DecisionExplanationCard data={data} />

        <section
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 36,
            padding: 24,
            animation: "h2fFloat 6s ease-in-out infinite",
          }}
        >
          <div
            style={{
              color: "#9fb0d1",
              fontSize: 12,
              letterSpacing: 3,
              textTransform: "uppercase",
              fontWeight: 950,
              marginBottom: 14,
            }}
          >
            Next Critical Step · {nextStep.time}
          </div>

          <div
            style={{
              fontSize: 34,
              lineHeight: 1.02,
              letterSpacing: "-2px",
              fontWeight: 950,
              marginBottom: 14,
            }}
          >
            {nextStep.title}
          </div>

          <div
            style={{
              color: "#cbd5e1",
              lineHeight: 1.55,
              fontSize: 16,
            }}
          >
            {nextStep.text}
          </div>
        </section>

        <section
          style={{
            position: "relative",
            background: "rgba(255,255,255,0.045)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 40,
            padding: 26,
          }}
        >
          <div
            style={{
              fontSize: 34,
              letterSpacing: "-2px",
              fontWeight: 950,
              marginBottom: 30,
            }}
          >
            Operational Journey
          </div>

          <div
            style={{
              position: "absolute",
              left: 31,
              top: 112,
              bottom: 44,
              width: 2,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.24), rgba(255,255,255,0.02))",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {timeline.map((step, index) => (
              <div
                key={`${step.step}-${index}`}
                style={{
                  display: "flex",
                  gap: 18,
                  alignItems: "flex-start",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    width: 12,
                    minWidth: 12,
                    height: 12,
                    borderRadius: 999,
                    marginTop: 12,
                    background: getStepColor(step.category),
                    boxShadow: `0 0 18px ${getStepColor(step.category)}`,
                  }}
                />

                <div
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.045)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 30,
                    padding: 22,
                    backdropFilter: "blur(14px)",
                  }}
                >
                  <div
                    style={{
                      color: "#9fb0d1",
                      fontSize: 13,
                      fontWeight: 900,
                      marginBottom: 8,
                    }}
                  >
                    {formatTime(step.recommendedTime)}
                  </div>

                  <div
                    style={{
                      fontSize: 25,
                      lineHeight: 1.08,
                      fontWeight: 950,
                      letterSpacing: "-1px",
                      marginBottom: 14,
                    }}
                  >
                    {step.title}
                  </div>

                  <div
                    style={{
                      color: "#cbd5e1",
                      lineHeight: 1.58,
                      fontSize: 15,
                    }}
                  >
                    {step.liveInsight}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}