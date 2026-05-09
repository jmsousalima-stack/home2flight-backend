"use client";

import { useEffect, useState } from "react";

import DepartureDecisionCard from "../components/DepartureDecisionCard";
import TimelineCard from "../components/TimelineCard";

export default function Home() {
  const [timelineData, setTimelineData] = useState(null);

  useEffect(() => {
    async function loadTimeline() {
      const response = await fetch("/api/timeline");
      const json = await response.json();
      setTimelineData(json);
    }

    loadTimeline();
  }, []);

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
          gap: 24,
        }}
      >
        <DepartureDecisionCard timelineData={timelineData} />

        <TimelineCard timeline={timelineData.timeline} />
      </div>
    </main>
  );
}
