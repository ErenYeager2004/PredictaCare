import React, { useState, useContext } from "react";
import { motion } from "framer-motion";
import { AppContext } from "../context/AppContext";
import UpgradeModal from "./UpgradeModal";

const FREE_FEATURES = [
  { text: "5 free DNN premium trial predictions",       included: true },
  { text: "Unlimited XGBoost predictions after trial",  included: true },
  { text: "AI health suggestions",                      included: true },
  { text: "Downloadable PDF certificate",               included: true },
  { text: "Unlimited Deep Neural Network model",        included: false },
  { text: "Lab result analysis (HbA1c, ECG, AMH…)",    included: false },
  { text: "Blockchain-verified certificates",           included: false },
  { text: "Doctor consultation",                        included: false },
];

const PREMIUM_FEATURES = [
  { text: "Unlimited Deep Neural Network model",        included: true },
  { text: "Lab result analysis (HbA1c, ECG, AMH…)",    included: true },
  { text: "Blockchain-verified certificates",           included: true },
  { text: "AI health suggestions",                      included: true },
  { text: "Downloadable PDF certificate",               included: true },
  { text: "All 4 disease prediction models",            included: true },
  { text: "Priority support",                           included: true },
  { text: "Doctor consultation — ₹299/session",         included: true, soon: true },
];

export default function SubscriptionCard({ compact = false }) {
  const { userData, loadUserProfileData } = useContext(AppContext);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const isPremiumActive =
    userData?.subscription === "premium" &&
    userData?.subscriptionExpiry &&
    new Date(userData.subscriptionExpiry) > new Date();

  const expiry = userData?.subscriptionExpiry
    ? new Date(userData.subscriptionExpiry).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  const trialUsed      = userData?.predictionsUsed  ?? 0;
  const trialLimit     = userData?.predictionsLimit ?? 5;
  const trialRemaining = Math.max(0, trialLimit - trialUsed);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap');

        .sub-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .sub-card:hover { transform: translateY(-4px); }
        .upgrade-btn:hover { background: #1d4ed8 !important; }
        .free-btn { opacity: 0.6; cursor: default; }
      `}</style>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onSuccess={loadUserProfileData}
      />

      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

        {/* ── Section heading ── */}
        {!compact && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{ textAlign: "center", marginBottom: "48px" }}
          >
            <span style={{
              display: "inline-block",
              fontSize: "11px", fontWeight: 700, letterSpacing: "0.15em",
              textTransform: "uppercase", color: "#2563eb",
              fontFamily: "'JetBrains Mono', monospace",
              background: "#eff6ff", padding: "4px 14px",
              borderRadius: "999px", marginBottom: "16px",
            }}>
              Pricing
            </span>
            <h2 style={{
              fontSize: "36px", fontWeight: 800, color: "#0f172a",
              margin: "0 0 12px", lineHeight: 1.15,
            }}>
              Simple, transparent pricing
            </h2>
            <p style={{ color: "#64748b", fontSize: "16px", margin: 0 }}>
              Start for free. Upgrade when you need clinical-grade precision.
            </p>
          </motion.div>
        )}

        {/* ── Status strip ── */}
        {isPremiumActive ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              marginBottom: "32px", padding: "14px 20px",
              background: "#eff6ff", border: "1px solid #bfdbfe",
              borderRadius: "14px", display: "flex",
              alignItems: "center", justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{
                width: 36, height: 36, borderRadius: "10px",
                background: "#2563eb", display: "flex",
                alignItems: "center", justifyContent: "center",
              }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: "14px", color: "#1e3a8a", margin: 0 }}>
                  Premium Active
                </p>
                <p style={{ fontSize: "12px", color: "#3b82f6", margin: 0 }}>
                  Valid until {expiry}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowUpgrade(true)}
              style={{
                background: "#2563eb", color: "#fff", border: "none",
                fontSize: "13px", fontWeight: 600, padding: "8px 18px",
                borderRadius: "8px", cursor: "pointer",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Renew
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              marginBottom: "32px", padding: "14px 20px",
              background: trialRemaining === 0 ? "#fef2f2" : "#f8fafc",
              border: `1px solid ${trialRemaining === 0 ? "#fecaca" : "#e2e8f0"}`,
              borderRadius: "14px", display: "flex",
              alignItems: "center", justifyContent: "space-between",
            }}
          >
            <div>
              <p style={{
                fontWeight: 700, fontSize: "13px", margin: "0 0 2px",
                color: trialRemaining === 0 ? "#dc2626" : "#334155",
              }}>
                {trialRemaining === 0
                  ? "Free trial exhausted — now on XGBoost model"
                  : `${trialRemaining} of ${trialLimit} free DNN trial predictions remaining`}
              </p>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                {trialRemaining === 0
                  ? "Upgrade to keep using the premium Neural Network model"
                  : "After your trial, you'll stay on the free XGBoost model (unlimited)"}
              </p>
            </div>
            {/* Dot progress */}
            <div style={{ display: "flex", gap: "6px", marginLeft: "16px", flexShrink: 0 }}>
              {Array.from({ length: trialLimit }).map((_, i) => (
                <div key={i} style={{
                  width: 9, height: 9, borderRadius: "50%",
                  background: i < trialUsed
                    ? (trialRemaining === 0 ? "#fca5a5" : "#93c5fd")
                    : "#e2e8f0",
                }} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Cards ── */}
        <div style={{
          display: "flex", gap: "24px",
          justifyContent: compact ? "flex-start" : "center",
          flexWrap: "wrap", alignItems: "stretch",
        }}>

          {/* FREE CARD */}
          <motion.div
            className="sub-card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0 }}
            style={{
              background: "#ffffff",
              border: "1.5px solid #e2e8f0",
              borderRadius: "20px",
              padding: "32px",
              width: "100%", maxWidth: "340px",
              display: "flex", flexDirection: "column",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            {/* Label */}
            <p style={{
              fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "#94a3b8",
              fontFamily: "'JetBrains Mono', monospace", margin: "0 0 8px",
            }}>Free</p>

            {/* Title */}
            <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>
              DiagnoAI Basic
            </h3>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 24px" }}>
              For getting started
            </p>

            {/* Price */}
            <div style={{ marginBottom: "24px", paddingBottom: "24px", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ fontSize: "42px", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>
                FREE
              </span>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                No credit card required
              </p>
            </div>

            {/* Features */}
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", flex: 1, display: "flex", flexDirection: "column", gap: "11px" }}>
              {FREE_FEATURES.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  {f.included ? (
                    <svg width="17" height="17" fill="none" viewBox="0 0 24 24"
                      stroke="#2563eb" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  ) : (
                    <svg width="17" height="17" fill="none" viewBox="0 0 24 24"
                      stroke="#cbd5e1" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  )}
                  <span style={{
                    fontSize: "13.5px",
                    color: f.included ? "#334155" : "#94a3b8",
                  }}>{f.text}</span>
                </li>
              ))}
            </ul>

            <button className="free-btn" style={{
              width: "100%", padding: "13px",
              borderRadius: "12px", border: "1.5px solid #e2e8f0",
              fontSize: "14px", fontWeight: 700,
              background: "#f8fafc", color: "#94a3b8",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              Current Plan
            </button>
          </motion.div>

          {/* PREMIUM CARD */}
          <motion.div
            className="sub-card"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{
              background: "linear-gradient(160deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)",
              borderRadius: "20px",
              padding: "32px",
              width: "100%", maxWidth: "340px",
              display: "flex", flexDirection: "column",
              position: "relative", overflow: "hidden",
              boxShadow: "0 20px 60px rgba(37,99,235,0.35), 0 4px 16px rgba(37,99,235,0.2)",
            }}
          >
            {/* Decorative circle */}
            <div style={{
              position: "absolute", top: -40, right: -40,
              width: 180, height: 180, borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
              pointerEvents: "none",
            }}/>
            <div style={{
              position: "absolute", bottom: -60, left: -30,
              width: 200, height: 200, borderRadius: "50%",
              background: "rgba(255,255,255,0.04)",
              pointerEvents: "none",
            }}/>

            {/* Badge */}
            <div style={{
              position: "absolute", top: 0, right: 0,
              background: "#f59e0b", color: "#fff",
              fontSize: "11px", fontWeight: 700,
              padding: "6px 16px",
              borderRadius: "0 20px 0 14px",
              letterSpacing: "0.06em",
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              POPULAR
            </div>

            {/* Label */}
            <p style={{
              fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.55)",
              fontFamily: "'JetBrains Mono', monospace", margin: "0 0 8px",
            }}>Premium</p>

            {/* Title */}
            <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>
              DiagnoAI Pro
            </h3>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.55)", margin: "0 0 24px" }}>
              Clinical-grade precision
            </p>

            {/* Price */}
            <div style={{ marginBottom: "24px", paddingBottom: "24px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "4px" }}>
                <span style={{ fontSize: "42px", fontWeight: 800, color: "#fff", lineHeight: 1 }}>₹299</span>
                <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.5)", marginBottom: "6px" }}>/month</span>
              </div>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", marginTop: "4px" }}>
                Billed monthly · Cancel anytime
              </p>
            </div>

            {/* Features */}
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", flex: 1, display: "flex", flexDirection: "column", gap: "11px" }}>
              {PREMIUM_FEATURES.map((f, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                  <svg width="17" height="17" fill="none" viewBox="0 0 24 24"
                    stroke="#93c5fd" strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                  <span style={{ fontSize: "13.5px", color: "rgba(255,255,255,0.85)" }}>
                    {f.text}
                    {f.soon && (
                      <span style={{
                        marginLeft: 7, fontSize: "10px", fontWeight: 600,
                        background: "rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.6)",
                        padding: "2px 8px", borderRadius: "999px",
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: "0.05em",
                      }}>SOON</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <button
              className="upgrade-btn"
              onClick={() => setShowUpgrade(true)}
              style={{
                width: "100%", padding: "13px",
                borderRadius: "12px", border: "none",
                fontSize: "14px", fontWeight: 700,
                background: "#ffffff", color: "#2563eb",
                cursor: "pointer",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                transition: "background 0.2s ease",
                position: "relative", zIndex: 1,
              }}
            >
              Upgrade Now →
            </button>
          </motion.div>
        </div>
      </div>
    </>
  );
}
