"use client";

import { useEffect, useState } from "react";

const ENGINE_URL =
  "/api/home2flight?flight=KL1578&origin=Lisboa&airport=LIS&airline=KL&terminal=1&bags=true&kids=true&checkedIn=false&flightType=passport&transport=public&forceManualTime=true&manualDepartureTime=2026-05-20T16:40:00+01:00";

function formatTime(value) {
  if (!value) return "--:--";

  return new Date(value).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusColor(status) {
  if (status === "stable") {
    return "#22c55e";
  }

  if (status === "sensitive") {
    return "#f59e0b";
  }

  return "#ef4444";
}

function getStatusLabel(status) {
  if (status === "stable") {
    return "Plano estável";
  }

  if (status === "sensitive") {
    return "Plano sensível";
  }

  return "Plano frágil";
}

export default function Home() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function load() {
      const response = await fetch(ENGINE_URL, {
        cache: "no-store",
      });

      const json = await response.json();

      setData(json);
    }

    load();
  }, []);

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
          fontFamily: "Arial",
        }}
      >
        Loading Home2Flight...
      </main>
    );
  }

  const status =
    data?.decision?.operationalStatus || "fragile";

  const statusColor =
    getStatusColor(status);

  const timeline =
    data?.timeline || [];

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #0f172a 0%, #020617 60%)",
        padding: "24px 16px 100px",
        fontFamily: "Arial, sans-serif",
        color: "white",
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
        {/* HERO */}

        <section
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
            border:
              "1px solid rgba(255,255,255,0.08)",
            borderRadius: 34,
            padding: 26,
            boxShadow:
              "0 30px 80px rgba(0,0,0,0.35)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 26,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  color: "#94a3b8",
                  fontWeight: 900,
                  marginBottom: 12,
                }}
              >
                Home2Flight
              </div>

              <div
                style={{
                  fontSize: 18,
                  color: "#cbd5e1",
                  marginBottom: 10,
                }}
              >
                Sair de casa
              </div>

              <div
                style={{
                  fontSize: 76,
                  lineHeight: 0.95,
                  fontWeight: 950,
                  letterSpacing: "-5px",
                }}
              >
                {formatTime(
                  data?.decision?.leaveHomeTime
                )}
              </div>
            </div>

            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 999,
                background: statusColor,
                boxShadow: `0 0 24px ${statusColor}`,
                marginTop: 12,
              }}
            />
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.06)",
              border:
                "1px solid rgba(255,255,255,0.06)",
              borderRadius: 999,
              padding: "10px 14px",
              marginBottom: 22,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: statusColor,
              }}
            />

            <div
              style={{
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              {getStatusLabel(status)}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                background:
                  "rgba(255,255,255,0.05)",
                borderRadius: 14,
                padding: "10px 12px",
                fontSize: 13,
                color: "#cbd5e1",
              }}
            >
              ✈️ {data?.flight?.number}
            </div>

            <div
              style={{
                background:
                  "rgba(255,255,255,0.05)",
                borderRadius: 14,
                padding: "10px 12px",
                fontSize: 13,
                color: "#cbd5e1",
              }}
            >
              🛫 {data?.airport}
            </div>

            <div
              style={{
                background:
                  "rgba(255,255,255,0.05)",
                borderRadius: 14,
                padding: "10px 12px",
                fontSize: 13,
                color: "#cbd5e1",
              }}
            >
              🏢 Terminal {data?.journey?.terminal}
            </div>
          </div>

          <div
            style={{
              background:
                "rgba(255,255,255,0.05)",
              border:
                "1px solid rgba(255,255,255,0.06)",
              borderRadius: 22,
              padding: 18,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#94a3b8",
                marginBottom: 8,
                fontWeight: 800,
              }}
            >
              LIVE OPERATIONAL INSIGHT
            </div>

            <div
              style={{
                fontSize: 18,
                lineHeight: 1.45,
                color: "white",
                fontWeight: 700,
              }}
            >
              Segurança com variabilidade moderada.
              Transporte público requer atenção.
            </div>
          </div>
        </section>

        {/* STATUS */}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
          }}
        >
          {[
            {
              label: "Aeroporto",
              value:
                data?.airportIntelligence
                  ?.operationalIntelligence
                  ?.airportRisk || "medium",
            },
            {
              label: "Transporte",
              value:
                data?.routeIntelligence
                  ?.operationalProfile
                  ?.routeRiskLevel || "low",
            },
            {
              label: "Check-in",
              value:
                data?.journey?.profile
                  ?.checkedIn
                  ? "done"
                  : "pending",
            },
            {
              label: "Boarding",
              value: "monitoring",
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background:
                  "rgba(255,255,255,0.05)",
                border:
                  "1px solid rgba(255,255,255,0.06)",
                borderRadius: 24,
                padding: 18,
              }}
            >
              <div
                style={{
                  color: "#94a3b8",
                  fontSize: 13,
                  marginBottom: 12,
                  fontWeight: 700,
                }}
              >
                {item.label}
              </div>

              <div
                style={{
                  fontSize: 16,
                  fontWeight: 900,
                  textTransform: "capitalize",
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </section>

        {/* TIMELINE */}

        <section
          style={{
            background:
              "rgba(255,255,255,0.04)",
            border:
              "1px solid rgba(255,255,255,0.06)",
            borderRadius: 34,
            padding: 22,
          }}
        >
          <div
            style={{
              fontSize: 26,
              fontWeight: 900,
              marginBottom: 24,
              letterSpacing: "-1px",
            }}
          >
            Operational Timeline
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {timeline.map((step, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    width: 12,
                    minWidth: 12,
                    height: 12,
                    borderRadius: 999,
                    marginTop: 8,
                    background:
                      step.category === "transport"
                        ? "#3b82f6"
                        : step.category === "airport"
                        ? "#f59e0b"
                        : step.category === "security"
                        ? "#ef4444"
                        : "#22c55e",
                  }}
                />

                <div
                  style={{
                    flex: 1,
                    background:
                      "rgba(255,255,255,0.04)",
                    border:
                      "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 24,
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      color: "#94a3b8",
                      fontSize: 13,
                      marginBottom: 6,
                      fontWeight: 700,
                    }}
                  >
                    {formatTime(
                      step.recommendedTime
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 900,
                      marginBottom: 10,
                    }}
                  >
                    {step.title}
                  </div>

                  <div
                    style={{
                      color: "#cbd5e1",
                      lineHeight: 1.45,
                      fontSize: 14,
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