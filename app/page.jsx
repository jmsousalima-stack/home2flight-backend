"use client";

import { useEffect, useState } from "react";

import DepartureDecisionCard from "@/components/DepartureDecisionCard";
import TimelineCard from "@/components/TimelineCard";

export default function Home() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch(
          "/api/timeline?flight=AF1195&bags=true&kids=true&flightType=passport&transport=public"
        );

        const json = await response.json();

        setData(json);
      } catch (error) {
        console.error(error);
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
          fontFamily: "Inter, sans-serif",
        }}
      >
        Loading Home2Flight Engine...
      </main>
    );
  }

  return (
    <main
      style={{
        background: "#020617",
        minHeight: "100vh",
        padding: "24px 0 80px",
      }}
    >
      <DepartureDecisionCard data={data} />

      <TimelineCard data={data} />
    </main>
  );
}
