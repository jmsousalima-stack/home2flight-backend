"use client";

import { useEffect, useState } from "react";

import LiveOperationalStatusBar from "../components/LiveOperationalStatusBar";
import MissionSetupCard from "../components/MissionSetupCard";
import OperationalBriefingCard from "../components/OperationalBriefingCard";

function formatTime(value) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMinutesUntil(value) {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  return Math.round((target.getTime() - Date.now()) / 60000);
}

function formatCountdown(minutes) {
  if (minutes === null) return "A calcular";
  if (minutes <= 0) return "Agora";
  if (minutes < 60) return `${minutes} min`;

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

function getStepColor(category) {
  switch (category) {
    case "transport":
      return "#3b82f6";
    case "airport":
      return "#f59e0b";
    case "check-in":
      return "#22d3ee";
    case "security":
      return "#ef4444";
    case "passport":
      return "#a855f7";
    case "gate":
    case "boarding":
      return "#22c55e";
    case "flight":
      return "#60a5fa";
    default:
      return "#94a3b8";
  }
}

function getOperationalTone(score) {
  if (score >= 75) {
    return {
      label: "Plano estável",
      short: "Estável",
      color: "#22c55e",
      glow: "rgba(34,197,94,0.35)",
    };
  }

  if (score >= 50) {
    return {
      label: "Plano sensível",
      short: "Sensível",
      color: "#f59e0b",
      glow: "rgba(245,158,11,0.35)",
    };
  }

  return {
    label: "Plano com margem reforçada",
    short: "Reforçado",
    color: "#ef4444",
    glow: "rgba(239,68,68,0.35)",
  };
}

function getMissionPhase(data) {
  const minutesToLeave = getMinutesUntil(data?.decision?.leaveHomeTime);

  if (minutesToLeave === null) {
    return {
      label: "Planning mode",
      title: "A calcular missão",
      description: "A Home2Flight está a preparar a timeline operacional.",
    };
  }

  if (minutesToLeave > 180) {
    return {
      label: "Preparation mode",
      title: "Missão em preparação",
      description:
        "A Home2Flight mantém monitorização e prepara a margem operacional antes da saída.",
    };
  }

  if (minutesToLeave > 60) {
    return {
      label: "Pre-departure mode",
      title: "Janela pré-saída ativa",
      description:
        "A app está a acompanhar os principais riscos antes da deslocação para o aeroporto.",
    };
  }

  if (minutesToLeave > 0) {
    return {
      label: "Departure mode",
      title: "Preparar saída",
      description:
        "A saída aproxima-se. Confirma check-in, documentos, transporte e margem operacional.",
    };
  }

  return {
    label: "Active journey mode",
    title: "Jornada ativa",
    description:
      "A timeline entrou em modo operacional ativo. Segue o próximo passo recomendado.",
  };
}

function getAirportLabel(data) {
  return data?.journey?.airport || data?.flight?.route?.from?.code || "LIS";
}

function getTerminalLabel(data) {
  return data?.journey?.terminal || data?.flight?.departure?.terminal || "1";
}

function getFlightLabel(data) {
  return data?.flight?.number || data?.journey?.flight || "Flight";
}

function getNextCriticalStep(data) {
  const timeline = data?.timeline || [];

  const futureStep = timeline.find((step) => {
    const minutes = getMinutesUntil(step.recommendedTime);
    return minutes !== null && minutes >= 0;
  });

  const fallback =
    timeline.find((step) => step.step === "checkin_bagdrop") || timeline[0];

  const step = futureStep || fallback;

  if (!step) {
    return {
      title: "Monitorização ativa",
      text: "A Home2Flight está a acompanhar os sinais operacionais da jornada.",
      time: "--:--",
    };
  }

  return {
    title: step.title,
    text:
      step.liveInsight ||
      "A Home2Flight está a acompanhar os sinais operacionais da jornada.",
    time: formatTime(step.recommendedTime),
  };
}

function buildEngineUrl(mission) {
  const params = new URLSearchParams({
    flight: mission.flight || "KL1578",
    origin: mission.origin || "Lisboa",
    airport: mission.airport || "LIS",
    airline: (mission.flight || "KL1578").slice(0, 2),
    terminal: mission.terminal || "1",
    transport: mission.transport || "public",
    bags: String(Boolean(mission.bags)),
    kids: String(Boolean(mission.kids)),
    checkedIn: String(Boolean(mission.checkedIn)),
    fastTrack: String(Boolean(mission.fastTrack)),
    priorityBoarding: String(Boolean(mission.priorityBoarding)),
    flightType: mission.flightType || "passport",
  });

  if (mission.useManualTime && mission.departureTime) {
    params.set("forceManualTime", "true");
    params.set("departureTime", `${mission.departureTime}:00+01:00`);
  }

  return `/api/engines/journey-planning-engine?${params.toString()}`;
}

export default function Home() {
  const [mission, setMission] = useState({
    flight: "KL1578",
    origin: "Lisboa",
    airport: "LIS",
    terminal: "1",
    transport: "public",
    bags: true,
    kids: true,
    checkedIn: false,
    fastTrack: false,
    priorityBoarding: false,
    flightType: "passport",
    useManualTime: true,
    departureTime: "2026-05-20T16:40",
  });

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function generateMission() {
    try {
      setLoading(true);
      setError(null);
      setData(null);

      const response = await fetch(buildEngineUrl(mission), {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Engine error ${response.status}`);
      }

      const json = await response.json();

      if (!json?.success) {
        throw new Error(
          json?.error ||
            "Não foi possível gerar a missão. Ativa a hora manual ou usa um voo com dados disponíveis."
        );
      }

      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    generateMission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timeline = data?.timeline || [];
  const reliabilityScore = data?.reliability?.score ?? 0;
  const confidenceScore =
    data?.airportIntelligence?.operationalIntelligence?.confidenceScore ??
    data?.routeIntelligence?.reliability?.confidenceScore ??
    reliabilityScore;

  const tone = getOperationalTone(reliabilityScore);
  const phase = data ? getMissionPhase(data) : null;
  const nextStep = data ? getNextCriticalStep(data) : null;
  const minutesToLeave = data
    ? getMinutesUntil(data?.decision?.leaveHomeTime)
    : null;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #142449 0%, #071024 42%, #020617 100%)",
        color: "white",
        padding: "24px 16px 120px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <style>{`
        @keyframes h2fBreath {
          0% { opacity: 0.62; transform: scale(1); }
          50% { opacity: 0.92; transform: scale(1.04); }
          100% { opacity: 0.62; transform: scale(1); }
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
        <MissionSetupCard
          mission={mission}
          setMission={setMission}
          onGenerate={generateMission}
          loading={loading}
        />

        {error && (
          <section
            style={{
              borderRadius: 28,
              padding: 22,
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.25)",
              color: "#fecaca",
              fontWeight: 800,
              lineHeight: 1.5,
            }}
          >
            {error}
          </section>
        )}

        {loading && (
          <section
            style={{
              borderRadius: 28,
              padding: 22,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#dbe4ff",
              fontWeight: 800,
            }}
          >
            A gerar plano operacional...
          </section>
        )}

        {data && (
          <>
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
                  background: tone.glow,
                  filter: "blur(90px)",
                  animation: "h2fBreath 4.8s ease-in-out infinite",
                }}
              />

              <div style={{ position: "relative", zIndex: 2 }}>
                <div
                  style={{
                    fontSize: 12,
                    letterSpacing: 4,
                    textTransform: "uppercase",
                    color: "#9fb0d1",
                    fontWeight: 950,
                    marginBottom: 18,
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
                    marginTop: 18,
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
                    background: "rgba(255,255,255,0.06)",
                    border: `1px solid ${tone.color}55`,
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
                      background: tone.color,
                      boxShadow: `0 0 14px ${tone.color}`,
                    }}
                  />
                  <span style={{ fontWeight: 900, fontSize: 13 }}>
                    {tone.label}
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
                position: "relative",
                overflow: "hidden",
                borderRadius: 34,
                padding: 24,
                background:
                  "linear-gradient(180deg, rgba(16,24,52,0.98), rgba(7,14,34,0.98))",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 28px 70px rgba(0,0,0,0.34)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: "#9fb0d1",
                  fontWeight: 950,
                  marginBottom: 16,
                }}
              >
                Mission Status · {phase.label}
              </div>

              <div
                style={{
                  fontSize: 36,
                  lineHeight: 1,
                  fontWeight: 950,
                  letterSpacing: "-2px",
                  marginBottom: 12,
                }}
              >
                {phase.title}
              </div>

              <div
                style={{
                  color: "#cbd5e1",
                  fontSize: 16,
                  lineHeight: 1.5,
                  marginBottom: 22,
                }}
              >
                {phase.description}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 10,
                }}
              >
                {[
                  {
                    title: "Até sair",
                    value: formatCountdown(minutesToLeave),
                  },
                  {
                    title: "Plano",
                    value: tone.short,
                  },
                  {
                    title: "Dados",
                    value: `${confidenceScore}%`,
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    style={{
                      background: "rgba(255,255,255,0.045)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 20,
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        color: "#93a4c8",
                        fontSize: 10,
                        fontWeight: 900,
                        marginBottom: 8,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    >
                      {item.title}
                    </div>

                    <div
                      style={{
                        color: "#ffffff",
                        fontSize: 15,
                        lineHeight: 1.25,
                        fontWeight: 900,
                      }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <OperationalBriefingCard timelineData={data} />

            <section
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.035))",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 36,
                padding: 24,
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
          </>
        )}
      </div>
    </main>
  );
}