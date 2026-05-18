"use client";

import { useEffect, useMemo, useState } from "react";

const ENGINE_URL =
  "/api/home2flight?flight=KL1578&origin=Lisboa&airport=LIS&airline=KL&terminal=1&bags=true&kids=true&checkedIn=false&flightType=passport&transport=public&forceManualTime=true&manualDepartureTime=2026-05-20T16:40:00+01:00";

function formatTime(value) {
  if (!value) return "--:--";

  return new Date(value).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getOperationalState(status) {
  if (status === "stable") {
    return {
      label: "Fluxo operacional estável",
      color: "#22c55e",
      glow: "rgba(34,197,94,0.45)",
    };
  }

  if (status === "sensitive") {
    return {
      label: "Monitorização ativa",
      color: "#f59e0b",
      glow: "rgba(245,158,11,0.45)",
    };
  }

  return {
    label: "Plano operacionalmente frágil",
    color: "#ef4444",
    glow: "rgba(239,68,68,0.45)",
  };
}

export default function Home() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch(ENGINE_URL, {
          cache: "no-store",
        });

        const json = await response.json();

        setData(json);
      } catch (error) {
        console.error(error);
      }
    }

    load();
  }, []);

  const operationalState = useMemo(() => {
    return getOperationalState(
      data?.decision?.operationalStatus
    );
  }, [data]);

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

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #13203f 0%, #020617 58%)",
        color: "white",
        padding: "24px 16px 120px",
        fontFamily: "Arial, sans-serif",
        overflow: "hidden",
      }}
    >
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
        {/* HERO */}

        <section
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 38,
            padding: 28,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))",
            border:
              "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "0 40px 120px rgba(0,0,0,0.45)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* glow */}

          <div
            style={{
              position: "absolute",
              top: -120,
              right: -80,
              width: 260,
              height: 260,
              borderRadius: 999,
              background: operationalState.glow,
              filter: "blur(90px)",
              opacity: 0.7,
            }}
          />

          {/* top */}

          <div
            style={{
              position: "relative",
              zIndex: 2,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 24,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    letterSpacing: 4,
                    textTransform: "uppercase",
                    color: "#94a3b8",
                    fontWeight: 900,
                    marginBottom: 16,
                  }}
                >
                  Home2Flight Mission Control
                </div>

                <div
                  style={{
                    color: "#cbd5e1",
                    fontSize: 18,
                    marginBottom: 8,
                  }}
                >
                  Hora recomendada para sair
                </div>

                <div
                  style={{
                    fontSize: 86,
                    lineHeight: 0.9,
                    letterSpacing: "-6px",
                    fontWeight: 950,
                  }}
                >
                  {formatTime(
                    data?.decision?.leaveHomeTime
                  )}
                </div>
              </div>

              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  background:
                    operationalState.color,
                  boxShadow: `0 0 30px ${operationalState.color}`,
                  marginTop: 12,
                }}
              />
            </div>

            {/* operational state */}

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                background:
                  "rgba(255,255,255,0.06)",
                border:
                  "1px solid rgba(255,255,255,0.08)",
                borderRadius: 999,
                padding: "10px 16px",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background:
                    operationalState.color,
                }}
              />

              <div
                style={{
                  fontWeight: 800,
                  fontSize: 13,
                }}
              >
                {operationalState.label}
              </div>
            </div>

            {/* flight strip */}

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 26,
              }}
            >
              {[
                `✈ ${data?.flight?.number}`,
                `🛫 ${data?.airport}`,
                `🏢 T${data?.journey?.terminal}`,
                "📡 Live Monitoring",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    background:
                      "rgba(255,255,255,0.05)",
                    border:
                      "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 16,
                    padding: "10px 14px",
                    fontSize: 13,
                    color: "#dbe4f0",
                  }}
                >
                  {item}
                </div>
              ))}
            </div>

            {/* insight */}

            <div
              style={{
                background:
                  "rgba(255,255,255,0.05)",
                border:
                  "1px solid rgba(255,255,255,0.06)",
                borderRadius: 26,
                padding: 22,
              }}
            >
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 2,
                  marginBottom: 10,
                }}
              >
                LIVE OPERATIONAL INSIGHT
              </div>

              <div
                style={{
                  fontSize: 22,
                  lineHeight: 1.4,
                  fontWeight: 800,
                }}
              >
                Segurança com variabilidade moderada.
                Transporte público sob monitorização
                ativa.
              </div>
            </div>
          </div>
        </section>

        {/* LIVE STATUS */}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          {[
            {
              title: "Aeroporto",
              value: "Fluxo moderado",
            },
            {
              title: "Transporte",
              value: "Trajeto estável",
            },
            {
              title: "Check-in",
              value: "Por confirmar",
            },
            {
              title: "Boarding",
              value: "Monitorização ativa",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                background:
                  "rgba(255,255,255,0.05)",
                border:
                  "1px solid rgba(255,255,255,0.06)",
                borderRadius: 26,
                padding: 20,
                backdropFilter: "blur(14px)",
              }}
            >
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: 13,
                  marginBottom: 14,
                  fontWeight: 700,
                }}
              >
                {item.title}
              </div>

              <div
                style={{
                  fontSize: 18,
                  lineHeight: 1.35,
                  fontWeight: 900,
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </section>

        {/* NEXT STEP */}

        <section
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))",
            border:
              "1px solid rgba(255,255,255,0.06)",
            borderRadius: 34,
            padding: 24,
          }}
        >
          <div
            style={{
              color: "#94a3b8",
              fontSize: 12,
              letterSpacing: 3,
              textTransform: "uppercase",
              fontWeight: 900,
              marginBottom: 14,
            }}
          >
            Next Critical Step
          </div>

          <div
            style={{
              fontSize: 34,
              lineHeight: 1.05,
              letterSpacing: "-2px",
              fontWeight: 950,
              marginBottom: 12,
            }}
          >
            Confirmar check-in online
          </div>

          <div
            style={{
              color: "#cbd5e1",
              lineHeight: 1.6,
              fontSize: 16,
            }}
          >
            A Home2Flight recomenda reduzir
            dependência operacional antes da saída
            para o aeroporto.
          </div>
        </section>

        {/* TIMELINE */}

        <section
          style={{
            position: "relative",
            background:
              "rgba(255,255,255,0.04)",
            border:
              "1px solid rgba(255,255,255,0.06)",
            borderRadius: 38,
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
              top: 110,
              bottom: 40,
              width: 2,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.02))",
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 22,
            }}
          >
            {timeline.map((step, index) => (
              <div
                key={index}
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
                    marginTop: 10,
                    background:
                      step.category === "transport"
                        ? "#3b82f6"
                        : step.category === "airport"
                        ? "#f59e0b"
                        : step.category === "security"
                        ? "#ef4444"
                        : "#22c55e",
                    boxShadow:
                      "0 0 18px rgba(255,255,255,0.3)",
                  }}
                />

                <div
                  style={{
                    flex: 1,
                    background:
                      "rgba(255,255,255,0.04)",
                    border:
                      "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 28,
                    padding: 22,
                    backdropFilter: "blur(14px)",
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
                    {formatTime(
                      step.recommendedTime
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: 26,
                      lineHeight: 1.1,
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
                      lineHeight: 1.6,
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