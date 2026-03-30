/**
 * AiSuggestions.jsx
 * Copy to: frontend/src/pages/AiSuggestions.jsx
 *
 * Dependencies needed:
 *   npm install react-markdown remark-gfm
 */

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

// ── Section icon map ──────────────────────────────────────────────────────────
const SECTION_ICONS = {
  "diet":        "🥗",
  "food":        "🥗",
  "nutrition":   "🥗",
  "exercise":    "🏃",
  "physical":    "🏃",
  "lifestyle":   "🌿",
  "daily":       "🌿",
  "sleep":       "😴",
  "stress":      "🧘",
  "mental":      "🧘",
  "warning":     "⚠️",
  "signs":       "⚠️",
  "symptoms":    "⚠️",
  "doctor":      "👨‍⚕️",
  "consult":     "👨‍⚕️",
  "medication":  "💊",
  "monitor":     "📊",
  "checkup":     "📊",
  "summary":     "📋",
  "overview":    "📋",
  "immediate":   "🚨",
  "urgent":      "🚨",
  "hydration":   "💧",
  "water":       "💧",
};

const getSectionIcon = (heading) => {
  const lower = heading.toLowerCase();
  for (const [key, icon] of Object.entries(SECTION_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return "💡";
};

// ── Risk color ────────────────────────────────────────────────────────────────
const RISK_STYLES = {
  HIGH:     { bg: "linear-gradient(135deg, #fef2f2, #fee2e2)", border: "#fca5a5", text: "#dc2626", icon: "🔴" },
  MODERATE: { bg: "linear-gradient(135deg, #fffbeb, #fef3c7)", border: "#fcd34d", text: "#d97706", icon: "🟡" },
  LOW:      { bg: "linear-gradient(135deg, #f0fdf4, #dcfce7)", border: "#86efac", text: "#16a34a", icon: "🟢" },
};

// ── Loading skeleton ──────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div style={{
    background: "#fff", borderRadius: 20, padding: "28px 24px",
    border: "1.5px solid #e2e8f0", marginBottom: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  }}>
    {[80, 60, 90, 70, 55].map((w, i) => (
      <div key={i} style={{
        height: i === 0 ? 20 : 14,
        width: `${w}%`,
        background: "linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)",
        backgroundSize: "200% 100%",
        borderRadius: 8,
        marginBottom: i === 0 ? 16 : 10,
        animation: "shimmer 1.5s infinite",
      }} />
    ))}
  </div>
);

// ── Custom markdown renderers ─────────────────────────────────────────────────
const makeComponents = () => ({
  h1: ({ children }) => null, // suppress top h1 (we render our own title)
  h2: ({ children }) => {
    const text = String(children);
    const icon = getSectionIcon(text);
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        marginTop: 32, marginBottom: 14,
        paddingBottom: 10, borderBottom: "2px solid #f1f5f9",
      }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.01em" }}>
          {text}
        </h2>
      </div>
    );
  },
  h3: ({ children }) => (
    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#334155", margin: "20px 0 8px", letterSpacing: "0.01em" }}>
      {String(children)}
    </h3>
  ),
  p: ({ children }) => (
    <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.75, margin: "0 0 12px" }}>
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: "0 0 16px", paddingLeft: 0, listStyle: "none" }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: "0 0 16px", paddingLeft: 20 }}>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      fontSize: 14, color: "#475569", lineHeight: 1.7, marginBottom: 8,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%", background: "#3b82f6",
        flexShrink: 0, marginTop: 8,
      }} />
      <span>{children}</span>
    </li>
  ),
  strong: ({ children }) => (
    <strong style={{ color: "#1e293b", fontWeight: 700 }}>{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{
      borderLeft: "4px solid #3b82f6", paddingLeft: 16, margin: "16px 0",
      background: "#eff6ff", borderRadius: "0 12px 12px 0", padding: "12px 16px",
      fontSize: 14, color: "#1e40af", fontStyle: "italic",
    }}>
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code style={{
      background: "#f1f5f9", padding: "2px 8px", borderRadius: 6,
      fontSize: 13, color: "#334155", fontFamily: "monospace",
    }}>
      {children}
    </code>
  ),
  hr: () => <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "24px 0" }} />,
});

// ── Main Component ────────────────────────────────────────────────────────────
const AISuggestions = () => {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { prompt, disease, risk, probability } = location.state || {};

  const [content,  setContent]  = useState("");
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [copied,   setCopied]   = useState(false);

  const riskStyle = RISK_STYLES[risk] || RISK_STYLES.LOW;

  const buildPrompt = () => `
You are a medical health advisor at PredictaCare. A user just received their AI health prediction result.

PREDICTION DETAILS:
- Disease: ${disease || "General Health"}
- Risk Level: ${risk || "LOW"}
- Probability: ${probability || 0}%

Generate comprehensive, personalised health suggestions in the following EXACT structure using markdown headings (##):

## Summary
Brief 2-sentence overview of what this risk level means for the user.

## Immediate Actions
3-5 specific actions the user should take right now based on their risk level.

## Daily Lifestyle Changes
Practical day-to-day habits to adopt. Be specific (e.g. "Walk 30 minutes every morning").

## Diet & Nutrition
Specific foods to include and avoid. Tailor to ${disease || "general health"}.

## Exercise Recommendations
Specific exercise types, duration, and frequency suited to this risk level.

## Stress & Mental Wellness
Techniques for managing stress and maintaining mental health.

## When to See a Doctor
Clear indicators of when they should seek immediate medical attention.

## Monitoring & Tracking
What metrics or symptoms they should track weekly/monthly.

Rules:
- Be specific and actionable, not generic
- Tailor ALL advice to ${disease || "general health"} specifically
- For HIGH risk: be more urgent and specific
- For LOW risk: focus on prevention and maintenance
- Use **bold** for important points
- Keep language simple and encouraging
- Do NOT mention specific medications or dosages
`.trim();

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!prompt && !disease) {
        setError("No prediction data found. Please run a prediction first.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${BACKEND_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: buildPrompt() }),
        });

        if (!res.ok) throw new Error("Failed to fetch suggestions");
        const data = await res.json();
        setContent(data.reply);
      } catch (err) {
        setError("Failed to generate suggestions. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)",
        padding: "40px 24px 56px", position: "relative", overflow: "hidden",
      }}>
        {[[-40, -40, 240], [300, 20, 180]].map(([x, y, size], i) => (
          <div key={i} style={{ position: "absolute", top: y, left: x, width: size, height: size,
            borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
        ))}
        <div style={{ maxWidth: 760, margin: "0 auto", position: "relative" }}>
          <button onClick={() => navigate(-1)} style={{
            background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)",
            color: "#fff", padding: "6px 16px", borderRadius: 999, fontSize: 13,
            cursor: "pointer", marginBottom: 20, fontFamily: "inherit",
          }}>← Back to Results</button>

          <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", margin: "0 0 12px", lineHeight: 1.2 }}>
            🧠 Your Personalised Health Plan
          </h1>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", margin: 0 }}>
            AI-generated suggestions based on your {disease} prediction
          </p>

          {/* Risk pill */}
          {risk && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8, marginTop: 16,
              background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.25)", borderRadius: 999,
              padding: "8px 18px",
            }}>
              <span style={{ fontSize: 16 }}>{riskStyle.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {risk} Risk
              </span>
              {probability && (
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>· {probability}% probability</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 760, margin: "-24px auto 48px", padding: "0 24px", position: "relative" }}>

        {loading ? (
          <div style={{ animation: "fadeUp 0.4s ease" }}>
            {/* Loading card */}
            <div style={{
              background: "#fff", borderRadius: 20, padding: "32px 28px", marginBottom: 16,
              border: "1.5px solid #e2e8f0", textAlign: "center",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                border: "3px solid #e2e8f0", borderTopColor: "#3b82f6",
                animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
              }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: "#334155", margin: "0 0 6px" }}>
                Generating your health plan…
              </p>
              <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>
                Analysing your {disease} risk profile
              </p>
            </div>
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : error ? (
          <div style={{
            background: "#fff", borderRadius: 20, padding: "40px 28px", textAlign: "center",
            border: "1.5px solid #fee2e2", boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
            <p style={{ fontSize: 15, color: "#dc2626", fontWeight: 600, margin: "0 0 8px" }}>{error}</p>
            <button onClick={() => navigate(-1)} style={{
              marginTop: 16, padding: "10px 24px", borderRadius: 999,
              background: "#2563eb", color: "#fff", border: "none",
              fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>Go Back</button>
          </div>
        ) : (
          <div style={{ animation: "fadeUp 0.5s ease" }}>
            {/* Risk summary banner */}
            <div style={{
              background: riskStyle.bg, border: `1.5px solid ${riskStyle.border}`,
              borderRadius: 20, padding: "20px 24px", marginBottom: 16,
              display: "flex", alignItems: "center", gap: 14,
              boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
            }}>
              <span style={{ fontSize: 32 }}>{riskStyle.icon}</span>
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, color: riskStyle.text, margin: "0 0 2px" }}>
                  {risk} Risk — {disease}
                </p>
                <p style={{ fontSize: 13, color: riskStyle.text, opacity: 0.75, margin: 0 }}>
                  {risk === "HIGH"
                    ? "Immediate attention recommended. Follow the plan below carefully."
                    : risk === "MODERATE"
                    ? "Early intervention can significantly improve your outlook."
                    : "Great news! Focus on prevention and maintaining healthy habits."}
                </p>
              </div>
            </div>

            {/* Main suggestions card */}
            <div style={{
              background: "#fff", borderRadius: 20, padding: "32px 28px",
              border: "1.5px solid #e2e8f0",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
              marginBottom: 16,
            }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={makeComponents()}>
                {content}
              </ReactMarkdown>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={handleCopy} style={{
                padding: "11px 24px", borderRadius: 12, border: "1.5px solid #e2e8f0",
                background: copied ? "#f0fdf4" : "#fff", color: copied ? "#16a34a" : "#475569",
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.2s",
              }}>
                {copied ? "✅ Copied!" : "📋 Copy Plan"}
              </button>
              <button onClick={() => window.print()} style={{
                padding: "11px 24px", borderRadius: 12, border: "1.5px solid #e2e8f0",
                background: "#fff", color: "#475569",
                fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}>
                🖨️ Print
              </button>
              <button onClick={() => navigate("/prediction")} style={{
                padding: "11px 24px", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg, #2563eb, #3b82f6)",
                color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}>
                Run Another Prediction →
              </button>
            </div>

            {/* Disclaimer */}
            <p style={{
              fontSize: 11, color: "#94a3b8", marginTop: 24, lineHeight: 1.6,
              padding: "12px 16px", background: "#f8fafc", borderRadius: 10,
              border: "1px solid #f1f5f9",
            }}>
              ⚕️ These suggestions are for informational purposes only and do not constitute medical advice.
              Always consult a qualified healthcare professional before making changes to your health routine.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AISuggestions;
