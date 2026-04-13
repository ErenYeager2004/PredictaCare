/**
 * PredictionSkeleton.jsx
 * Copy to: frontend/src/components/PredictionSkeleton.jsx
 *
 * Replace the loading spinner in Prediction.jsx with this.
 * Usage: shown while prediction is being calculated.
 */

import React from "react";

const Pulse = ({ w, h, r = 8, mb = 0 }) => (
  <div style={{
    width: w, height: h, borderRadius: r,
    background: "linear-gradient(90deg, #f1f5f9 25%, #e8edf2 50%, #f1f5f9 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.4s infinite",
    marginBottom: mb,
    flexShrink: 0,
  }} />
);

export default function PredictionSkeleton() {
  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>

      {/* Risk gauge + label skeleton */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
        {/* Circular gauge */}
        <div style={{
          width: 144, height: 144, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(90deg, #f1f5f9 25%, #e8edf2 50%, #f1f5f9 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.4s infinite",
        }} />
        <div style={{ flex: 1 }}>
          <Pulse w="40%" h={32} r={8} mb={10} />
          <Pulse w="60%" h={16} r={6} mb={8} />
          <Pulse w="30%" h={22} r={999} mb={0} />
        </div>
      </div>

      {/* Message box skeleton */}
      <div style={{
        borderRadius: 12, padding: "14px 16px", marginBottom: 16,
        background: "linear-gradient(90deg, #f1f5f9 25%, #e8edf2 50%, #f1f5f9 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
        height: 52,
      }} />

      {/* Blockchain badge skeleton */}
      <div style={{
        borderRadius: 12, padding: "14px 18px", marginBottom: 16,
        background: "linear-gradient(90deg, #f1f5f9 25%, #e8edf2 50%, #f1f5f9 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s infinite",
        height: 64,
      }} />

      {/* Buttons skeleton */}
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          borderRadius: 10, height: 40, marginBottom: 10,
          background: "linear-gradient(90deg, #f1f5f9 25%, #e8edf2 50%, #f1f5f9 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.4s infinite",
        }} />
      ))}
    </>
  );
}
