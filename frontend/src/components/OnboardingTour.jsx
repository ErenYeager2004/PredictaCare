/**
 * OnboardingTour.jsx
 * Copy to: frontend/src/components/OnboardingTour.jsx
 *
 * Highlight + tooltip combo tour for DiagnoAI first-time users.
 * Shows automatically on first visit, never again after dismissed.
 * No external dependencies needed.
 */

import React, { useState, useEffect, useRef } from "react";

const STEPS = [
  {
    target:  "condition-select",
    title:   "1. Choose a condition",
    desc:    "Select which disease you want to assess — Heart Disease, Diabetes, PCOS, or Stroke.",
    position: "bottom",
  },
  {
    target:  "tier-toggle",
    title:   "2. Free or Premium",
    desc:    "Free uses XGBoost (fast, unlimited). Premium uses a Deep Neural Network for higher accuracy. New users get 5 free premium trials.",
    position: "bottom",
  },
  {
    target:  "input-form",
    title:   "3. Fill in your details",
    desc:    "Enter your health information. Premium users can also add optional lab values for even higher accuracy.",
    position: "right",
  },
  {
    target:  "predict-btn",
    title:   "4. Run prediction",
    desc:    "Click to get your AI-powered risk assessment. Results are sealed on the Ethereum blockchain — tamper-proof forever.",
    position: "top",
  },
];

export default function OnboardingTour({ onComplete }) {
  const [step,    setStep]    = useState(0);
  const [visible, setVisible] = useState(false);
  const [pos,     setPos]     = useState({ top: 0, left: 0, width: 0, height: 0 });
  const overlayRef = useRef(null);

  useEffect(() => {
    const seen = localStorage.getItem("diagnoai_tour_done");
    if (!seen) {
      // Small delay so the page renders first
      setTimeout(() => setVisible(true), 1200);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, [visible, step]);

  const updatePosition = () => {
    const target = document.getElementById(STEPS[step]?.target);
    if (!target) return;
    const rect = target.getBoundingClientRect();
    setPos({
      top:    rect.top    + window.scrollY,
      left:   rect.left   + window.scrollX,
      width:  rect.width,
      height: rect.height,
    });
    // Scroll into view
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
    } else {
      finish();
    }
  };

  const finish = () => {
    localStorage.setItem("diagnoai_tour_done", "1");
    setVisible(false);
    onComplete?.();
  };

  if (!visible) return null;

  const current  = STEPS[step];
  const PAD      = 8;
  const TIP_W    = 300;

  // Calculate tooltip position
  let tipTop  = pos.top + pos.height + PAD + 10;
  let tipLeft = pos.left + pos.width / 2 - TIP_W / 2;

  if (current.position === "top") {
    tipTop  = pos.top - 140 - PAD;
  } else if (current.position === "right") {
    tipTop  = pos.top + pos.height / 2 - 70;
    tipLeft = pos.left + pos.width + PAD + 10;
  }

  // Keep within viewport
  tipLeft = Math.max(16, Math.min(tipLeft, window.innerWidth - TIP_W - 16));

  return (
    <>
      {/* ── Dark overlay with cutout ──────────────────────────────────── */}
      <div ref={overlayRef} style={{
        position:  "fixed", inset: 0, zIndex: 9998,
        pointerEvents: "none",
      }}>
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
          <defs>
            <mask id="cutout">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={pos.left - PAD}
                y={pos.top  - PAD + window.scrollY * -1}
                width={pos.width  + PAD * 2}
                height={pos.height + PAD * 2}
                rx={10}
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#cutout)" />
        </svg>
      </div>

      {/* ── Highlight border ──────────────────────────────────────────── */}
      <div style={{
        position:  "absolute",
        top:       pos.top    - PAD,
        left:      pos.left   - PAD,
        width:     pos.width  + PAD * 2,
        height:    pos.height + PAD * 2,
        borderRadius: 12,
        border:    "2.5px solid #2563eb",
        boxShadow: "0 0 0 4px rgba(37,99,235,0.25)",
        zIndex:    9999,
        pointerEvents: "none",
        transition: "all 0.3s ease",
        animation: "pulse-border 1.5s infinite",
      }} />

      {/* ── Tooltip ───────────────────────────────────────────────────── */}
      <div style={{
        position:  "absolute",
        top:       tipTop,
        left:      tipLeft,
        width:     TIP_W,
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)",
        padding:   "20px 20px 16px",
        zIndex:    10000,
        transition: "all 0.3s ease",
      }}>
        {/* Progress dots */}
        <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: 4, borderRadius: 999, transition: "all 0.3s",
              background: i === step ? "#2563eb" : "#e2e8f0",
              width: i === step ? 20 : 8,
            }} />
          ))}
        </div>

        <p style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>
          {current.title}
        </p>
        <p style={{ fontSize: 12.5, color: "#64748b", margin: "0 0 16px", lineHeight: 1.6 }}>
          {current.desc}
        </p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={finish}
            style={{ fontSize: 12, color: "#94a3b8", background: "none",
              border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0 }}>
            Skip tour
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                style={{ padding: "7px 16px", borderRadius: 8, border: "1.5px solid #e2e8f0",
                  background: "#f8fafc", color: "#475569", fontSize: 12, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit" }}>
                Back
              </button>
            )}
            <button onClick={next}
              style={{ padding: "7px 20px", borderRadius: 8, border: "none",
                background: "#2563eb", color: "#fff", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit" }}>
              {step === STEPS.length - 1 ? "Got it! 🎉" : "Next →"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 4px rgba(37,99,235,0.25); }
          50%       { box-shadow: 0 0 0 8px rgba(37,99,235,0.10); }
        }
      `}</style>
    </>
  );
}
