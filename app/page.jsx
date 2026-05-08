"use client";

import { useEffect, useState } from "react";

import DepartureDecisionCard from "../components/DepartureDecisionCard.jsx";
import TimelineCard from "../components/TimelineCard.jsx";

export default function Home() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch(
          "https://home2flight-backend.vercel.app/api/home2flight?flight=AF1195&bags=true&kids=true&flightType=passport&transport=public"
        );

        const json = await response.json();

        setData(json);
      } catch (error) {
        console.error("Home2Flight load error:", error);
      }
    }

    loadData();
  }, []);

  if (!data) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: "#020617",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "Arial",
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
        padding: 24,
        fontFamily: "Arial",
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <DepartureDecisionCard data={data} />

        <TimelineCard timeline={data.timeline} />
      </div>
    </main>
  );
}
