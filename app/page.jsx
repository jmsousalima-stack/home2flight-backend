"use client";

import { useEffect, useState } from "react";

import DepartureDecisionCard from "../components/DepartureDecisionCard";
import LiveOperationalMonitor from "../components/LiveOperationalMonitor";
import ReliabilityCard from "../components/ReliabilityCard";
import TimelineCard from "../components/TimelineCard";

const ENGINE_URL =
  "/api/home2flight?flight=AF1195&airport=LIS&airline=AF&terminal=1&bags=true&kids=true&checkedIn=false&flightType=passport&transport=public";

export default function Home() {
  const [timelineData, setTimelineData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadHome2FlightEngine() {
      try {
        const response = await fetch(ENGINE_URL, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Engine error: ${response.status}`);
        }

        const json = await response.json();

        if (!json?.success) {
          throw new Error(
            json?.error || "Home2Flight engine failed."
          );
        }

        setTimelineData(json);
      } catch (err) {
        setError(err.message);
      }
    }

    loadHome2FlightEngine();
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
            maxWidth: 420,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 24,
            padding: 24,
          }}
        >
          <h1 style={{ margin: "0 0 12px", fontSize: 28 }}>
            Home2Flight Engine offline
          </h1>

          <p style={{ color: "#cbd5e1", lineHeight: 1.5, margin: 0 }}>
            Não foi possível carregar o motor operacional neste momento.
          </p>

          <p
            style={{
              color: "#94a3b8",
              fontSize: 13,
              marginTop: 14,
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
        Loading Home2Flight Engine...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        padding: "20px 14px 80px",
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
        <LiveOperationalMonitor
          monitor={timelineData?.liveOperationalMonitor}
        />

        <DepartureDecisionCard timelineData={timelineData} />

        <ReliabilityCard data={timelineData} />

        <TimelineCard timeline={timelineData?.timeline || []} />
      </div>
    </main>
  );
}