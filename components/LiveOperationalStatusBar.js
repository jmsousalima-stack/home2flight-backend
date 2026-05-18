"use client";

import { useEffect, useState } from "react";

export default function LiveOperationalStatusBar({
  timelineData,
}) {
  const [currentIndex, setCurrentIndex] =
    useState(0);

  const signals = buildSignals(timelineData);

  useEffect(() => {
    if (signals.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) =>
        prev === signals.length - 1
          ? 0
          : prev + 1
      );
    }, 3500);

    return () => clearInterval(interval);
  }, [signals.length]);

  const activeSignal =
    signals[currentIndex];

  return (
    <div
      style={{
        marginTop: 18,
        marginBottom: 18,
        background:
          "rgba(255,255,255,0.05)",
        border:
          "1px solid rgba(255,255,255,0.08)",
        borderRadius: 999,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        overflow: "hidden",
        position: "relative",
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 72,
        }}
      >
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background:
              activeSignal.color,
            boxShadow: `0 0 16px ${activeSignal.color}`,
            animation:
              "pulse-live 1.6s infinite",
          }}
        />

        <div
          style={{
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 1.5,
            color: "#ffffff",
          }}
        >
          LIVE
        </div>
      </div>

      <div
        style={{
          color: "#dbe4ff",
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {activeSignal.message}
      </div>

      <style jsx>{`
        @keyframes pulse-live {
          0% {
            transform: scale(1);
            opacity: 1;
          }

          50% {
            transform: scale(1.3);
            opacity: 0.7;
          }

          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

function buildSignals(data) {
  const signals = [];

  const reliability =
    data?.reliability?.score || 0;

  const airportRisk =
    data?.airportIntelligence
      ?.operationalIntelligence
      ?.airportRisk;

  const transportRisk =
    data?.routeIntelligence
      ?.operationalProfile
      ?.routeRiskLevel;

  const checkedIn =
    data?.journey?.profile
      ?.checkedIn;

  const gate =
    data?.flight?.departure?.gate;

  if (reliability < 40) {
    signals.push({
      message:
        "Operational confidence reduced",
      color: "#ff4d6d",
    });
  }

  if (airportRisk === "medium") {
    signals.push({
      message:
        "Monitoring airport variability",
      color: "#ffb020",
    });
  }

  if (airportRisk === "high") {
    signals.push({
      message:
        "Airport congestion risk elevated",
      color: "#ff4d6d",
    });
  }

  if (
    transportRisk === "medium"
  ) {
    signals.push({
      message:
        "Transport route under monitoring",
      color: "#4da3ff",
    });
  }

  if (!checkedIn) {
    signals.push({
      message:
        "Online check-in still pending",
      color: "#ffd166",
    });
  }

  if (!gate) {
    signals.push({
      message:
        "Departure gate not assigned yet",
      color: "#8b5cf6",
    });
  }

  if (signals.length === 0) {
    signals.push({
      message:
        "Operational systems stable",
      color: "#22c55e",
    });
  }

  return signals;
}