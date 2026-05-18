"use client";

import { useEffect, useMemo, useState } from "react";

function buildSignals(data) {
  const signals = [];

  const reliability = data?.reliability?.score || 0;

  const airportRisk =
    data?.airportIntelligence?.operationalIntelligence?.airportRisk;

  const transportRisk =
    data?.routeIntelligence?.operationalProfile?.routeRiskLevel;

  const checkedIn = data?.journey?.profile?.checkedIn;

  const gate = data?.flight?.departure?.gate;

  if (reliability < 40) {
    signals.push({
      message: "Operational confidence reduced",
      color: "#ef4444",
    });
  }

  if (airportRisk === "medium") {
    signals.push({
      message: "Monitoring airport variability",
      color: "#f59e0b",
    });
  }

  if (airportRisk === "high") {
    signals.push({
      message: "Airport operational pressure elevated",
      color: "#ef4444",
    });
  }

  if (transportRisk === "medium" || transportRisk === "high") {
    signals.push({
      message: "Transport route under monitoring",
      color: "#3b82f6",
    });
  }

  if (!checkedIn) {
    signals.push({
      message: "Online check-in still pending",
      color: "#f59e0b",
    });
  }

  if (!gate) {
    signals.push({
      message: "Departure gate not assigned yet",
      color: "#8b5cf6",
    });
  }

  if (signals.length === 0) {
    signals.push({
      message: "Operational systems stable",
      color: "#22c55e",
    });
  }

  return signals;
}

export default function LiveOperationalStatusBar({ timelineData }) {
  const signals = useMemo(() => buildSignals(timelineData), [timelineData]);

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (signals.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((previousIndex) =>
        previousIndex === signals.length - 1 ? 0 : previousIndex + 1
      );
    }, 3500);

    return () => clearInterval(interval);
  }, [signals.length]);

  const activeSignal = signals[currentIndex] || signals[0];

  return (
    <div
      style={{
        marginBottom: 18,
        background: "rgba(255,255,255,0.055)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 999,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        overflow: "hidden",
        backdropFilter: "blur(12px)",
      }}
    >
      <style>{`
        @keyframes h2fLiveStatusPulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.35); opacity: 0.65; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: activeSignal.color,
          boxShadow: `0 0 16px ${activeSignal.color}`,
          animation: "h2fLiveStatusPulse 1.8s infinite",
          flexShrink: 0,
        }}
      />

      <div
        style={{
          fontSize: 11,
          fontWeight: 950,
          letterSpacing: 1.6,
          color: "#ffffff",
          flexShrink: 0,
        }}
      >
        LIVE
      </div>

      <div
        style={{
          color: "#dbe4ff",
          fontSize: 13,
          fontWeight: 800,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {activeSignal.message}
      </div>
    </div>
  );
}