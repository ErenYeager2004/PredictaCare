/**
 * MyPredictions.jsx
 * Copy to: frontend/src/pages/MyPredictions.jsx
 * Add to App.jsx: <Route path="/my-predictions" element={<ProtectedRoute><MyPredictions /></ProtectedRoute>} />
 * Add to Navbar dropdown: <p onClick={() => navigate('my-predictions')}>My Predictions</p>
 *
 * Dependencies: npm install jspdf  (already installed)
 */

import React, { useContext, useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import jsPDF from "jspdf";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

// ── Constants ─────────────────────────────────────────────────────────────────
const RISK_STYLE = {
  HIGH:     { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626", dot: "#dc2626" },
  MODERATE: { bg: "#fffbeb", border: "#fcd34d", text: "#d97706", dot: "#d97706" },
  LOW:      { bg: "#f0fdf4", border: "#86efac", text: "#16a34a", dot: "#16a34a" },
};

const DISEASE_LABEL = {
  heart: "Heart Disease", diabetes: "Diabetes",
  pcos: "PCOS", stroke: "Stroke",
};

const DISEASE_ICON = {
  heart: "❤️", diabetes: "🩸", pcos: "🔬", stroke: "🧠",
};

// ── Verify a single prediction against blockchain ─────────────────────────────
const verifyOne = async (predictionId, token) => {
  try {
    const { data } = await axios.get(
      `${BACKEND_URL}/api/predictions/verify/${predictionId}`,
      { headers: { token } }
    );
    return data;
  } catch {
    return { verified: false, failed: true };
  }
};

// ── Single Prediction Card ────────────────────────────────────────────────────
const PredictionCard = ({ prediction, token, onDownload }) => {
  const navigate   = useNavigate();
  const [verify, setVerify]     = useState(null); // null=loading, object=done
  const [expanded, setExpanded] = useState(false);
  const hasFetched = useRef(false);

  const risk  = prediction.predictionResult;
  const rs    = RISK_STYLE[risk] || RISK_STYLE.LOW;
  const label = DISEASE_LABEL[prediction.disease] || prediction.disease;
  const icon  = DISEASE_ICON[prediction.disease] || "💊";
  const date  = new Date(prediction.createdAt);

  useEffect(() => {
    if (hasFetched.current) return;
    if (!prediction.blockchainTxHash) {
      setVerify({ verified: false, pending: true });
      return;
    }
    hasFetched.current = true;
    verifyOne(prediction._id, token).then(setVerify);
  }, [prediction._id]);

  // ── Blockchain badge ────────────────────────────────────────────────────────
  const BlockBadge = () => {
    if (!verify) return (
      <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#94a3b8" }}>
        <div style={{ width:8,height:8,borderRadius:"50%",background:"#e2e8f0",
          animation:"pulse 1.5s infinite" }} />
        Checking…
      </div>
    );
    if (verify.pending) return (
      <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#94a3b8" }}>
        <div style={{ width:8,height:8,borderRadius:"50%",background:"#94a3b8" }} />
        Not on blockchain yet
      </div>
    );
    if (verify.tampered) return (
      <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11,
        color:"#dc2626", fontWeight:700 }}>
        <div style={{ width:8,height:8,borderRadius:"50%",background:"#dc2626" }} />
        ⚠️ Tampered
      </div>
    );
    if (verify.verified) return (
      <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#16a34a", fontWeight:600 }}>
        <div style={{ width:8,height:8,borderRadius:"50%",background:"#16a34a" }} />
        ⛓️ Verified
      </div>
    );
    return (
      <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"#94a3b8" }}>
        <div style={{ width:8,height:8,borderRadius:"50%",background:"#94a3b8" }} />
        Unavailable
      </div>
    );
  };

  const isTampered = verify?.tampered;

  return (
    <div style={{
      background: isTampered ? "#fff5f5" : "#fff",
      borderRadius: 16,
      border: isTampered ? "2px solid #fca5a5" : "1.5px solid #e2e8f0",
      overflow: "hidden",
      boxShadow: isTampered
        ? "0 0 0 3px rgba(220,38,38,0.08), 0 2px 12px rgba(0,0,0,0.06)"
        : "0 2px 12px rgba(0,0,0,0.05)",
      transition: "all 0.2s",
    }}>

      {/* ── Tamper warning banner ───────────────────────────────────────────── */}
      {isTampered && (
        <div style={{
          background: "#dc2626", color: "#fff", padding: "8px 20px",
          fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          DATA TAMPERING DETECTED — This prediction's result has been altered after blockchain sealing
        </div>
      )}

      {/* ── Main card content ───────────────────────────────────────────────── */}
      <div style={{ padding: "18px 20px" }}>
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>

          {/* Left — disease + result */}
          <div style={{ display:"flex", alignItems:"center", gap:14, flex:1 }}>
            {/* Disease icon */}
            <div style={{
              width:48, height:48, borderRadius:14, flexShrink:0,
              background: rs.bg, border:`1.5px solid ${rs.border}`,
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:22,
            }}>
              {icon}
            </div>

            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                <p style={{ fontSize:15, fontWeight:700, color:"#0f172a", margin:0 }}>{label}</p>
                <span style={{
                  fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:999,
                  background: rs.bg, color: rs.text, border:`1px solid ${rs.border}`,
                  textTransform:"uppercase", letterSpacing:"0.05em",
                }}>
                  {risk}
                </span>
                {prediction.isBeta && (
                  <span style={{ fontSize:10, fontWeight:600, padding:"2px 7px", borderRadius:999,
                    background:"#fffbeb", color:"#d97706", border:"1px solid #fcd34d" }}>
                    Beta
                  </span>
                )}
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
                <span style={{ fontSize:13, color:"#64748b" }}>
                  <strong style={{ color:"#334155" }}>{prediction.probability}%</strong> probability
                </span>
                <span style={{ fontSize:12, color:"#94a3b8" }}>
                  {date.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
                  {" · "}
                  {date.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
                </span>
                <span style={{
                  fontSize:11, padding:"1px 7px", borderRadius:999,
                  background: prediction.tier==="premium" ? "#fffbeb" : "#f0fdf4",
                  color: prediction.tier==="premium" ? "#d97706" : "#16a34a",
                  fontWeight:600,
                }}>
                  {prediction.tier === "premium" ? "✨ Premium" : "Free"}
                </span>
              </div>
            </div>
          </div>

          {/* Right — blockchain badge + actions */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8, flexShrink:0 }}>
            <BlockBadge />
            <div style={{ display:"flex", gap:6 }}>
              {verify?.verified && (
                <a href={verify.etherscanUrl} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize:11, color:"#2563eb", textDecoration:"none", fontWeight:600,
                    padding:"3px 8px", borderRadius:6, border:"1px solid #bfdbfe", background:"#eff6ff" }}>
                  Etherscan →
                </a>
              )}
              <button onClick={() => onDownload(prediction)}
                style={{ fontSize:11, color:"#475569", fontWeight:600, padding:"3px 8px",
                  borderRadius:6, border:"1px solid #e2e8f0", background:"#f8fafc",
                  cursor:"pointer", fontFamily:"inherit" }}>
                📄 PDF
              </button>
              {isTampered && (
                <button onClick={() => setExpanded(!expanded)}
                  style={{ fontSize:11, color:"#dc2626", fontWeight:700, padding:"3px 8px",
                    borderRadius:6, border:"1px solid #fca5a5", background:"#fef2f2",
                    cursor:"pointer", fontFamily:"inherit" }}>
                  {expanded ? "Hide Details" : "View Details"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Tamper detail panel ──────────────────────────────────────────── */}
        {isTampered && expanded && (
          <div style={{
            marginTop:14, padding:"14px 16px", borderRadius:12,
            background:"#fef2f2", border:"1px solid #fca5a5",
          }}>
            <p style={{ fontSize:12, fontWeight:700, color:"#dc2626", margin:"0 0 10px" }}>
              ⚠️ What was changed:
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div style={{ background:"#fff", borderRadius:8, padding:"10px 12px", border:"1px solid #fecaca" }}>
                <p style={{ fontSize:10, fontWeight:700, color:"#dc2626", margin:"0 0 4px", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  Current (possibly altered)
                </p>
                <p style={{ fontSize:13, fontWeight:700, color:"#dc2626", margin:"0 0 2px" }}>
                  {prediction.predictionResult} risk
                </p>
                <p style={{ fontSize:12, color:"#64748b", margin:0 }}>
                  {prediction.probability}% probability
                </p>
              </div>
              <div style={{ background:"#fff", borderRadius:8, padding:"10px 12px", border:"1px solid #86efac" }}>
                <p style={{ fontSize:10, fontWeight:700, color:"#16a34a", margin:"0 0 4px", textTransform:"uppercase", letterSpacing:"0.05em" }}>
                  Original (blockchain sealed)
                </p>
                <p style={{ fontSize:12, color:"#64748b", margin:"0 0 4px" }}>
                  Sealed on Ethereum at:
                </p>
                <p style={{ fontSize:11, color:"#475569", margin:"0 0 4px", fontFamily:"monospace", wordBreak:"break-all" }}>
                  Block #{prediction.blockNumber}
                </p>
                <p style={{ fontSize:11, color:"#475569", margin:0, fontFamily:"monospace", wordBreak:"break-all" }}>
                  Hash: {prediction.blockchainHash?.slice(0,18)}…
                </p>
              </div>
            </div>
            <p style={{ fontSize:11, color:"#dc2626", margin:"10px 0 0", lineHeight:1.6 }}>
              The hash of the current data does not match the hash stored on Ethereum Sepolia
              (Block #{prediction.blockNumber}). This is cryptographic proof that the data
              was altered after it was sealed. Contact{" "}
              <a href="mailto:adminPredictaCare@gmail.com" style={{ color:"#dc2626", fontWeight:700 }}>
                adminPredictaCare@gmail.com
              </a>{" "}
              immediately.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MyPredictions() {
  const { token, userData } = useContext(AppContext);
  const navigate = useNavigate();

  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filter, setFilter]           = useState("all");

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await axios.get(`${BACKEND_URL}/api/predictions/history`, {
          headers: { token },
        });
        setPredictions(Array.isArray(data) ? data : []);
      } catch {
        toast.error("Failed to load prediction history");
      } finally {
        setLoading(false);
      }
    };
    if (token) fetch();
  }, [token]);

  const filtered = predictions.filter(p => {
    if (filter === "all")      return true;
    if (filter === "premium")  return p.tier === "premium";
    if (filter === "free")     return p.tier === "free";
    if (filter === "high")     return p.predictionResult === "HIGH";
    return p.disease === filter;
  });

  const handleDownload = (prediction) => {
    const doc = new jsPDF();
    const date = new Date(prediction.createdAt);
    doc.setFontSize(18); doc.setFont("helvetica","bold");
    doc.text("PredictaCare — Prediction Certificate", 105, 20, { align:"center" });
    doc.setFontSize(10); doc.setFont("helvetica","normal"); doc.setTextColor(100);
    doc.text(`Generated: ${date.toLocaleString()}`, 105, 28, { align:"center" });
    doc.line(15, 33, 195, 33);
    doc.setTextColor(0); doc.setFontSize(11); doc.setFont("helvetica","bold");
    doc.text("Prediction Details", 15, 42);
    doc.setFont("helvetica","normal"); doc.setFontSize(10);
    doc.text(`Disease: ${DISEASE_LABEL[prediction.disease] || prediction.disease}`, 15, 52);
    doc.text(`Result: ${prediction.predictionResult}`, 15, 60);
    doc.text(`Probability: ${prediction.probability}%`, 15, 68);
    doc.text(`Model Tier: ${prediction.tier}`, 15, 76);
    doc.text(`Date: ${date.toLocaleDateString()}  ${date.toLocaleTimeString()}`, 15, 84);
    if (prediction.blockchainTxHash) {
      doc.line(15, 90, 195, 90);
      doc.setFont("helvetica","bold"); doc.setFontSize(11);
      doc.text("Blockchain Record", 15, 99);
      doc.setFont("helvetica","normal"); doc.setFontSize(9);
      doc.text(`TX Hash: ${prediction.blockchainTxHash}`, 15, 108);
      doc.text(`Block: ${prediction.blockNumber}`, 15, 116);
      doc.text(`Hash: ${prediction.blockchainHash}`, 15, 124, { maxWidth:180 });
    }
    doc.line(15, 275, 195, 275);
    doc.setFontSize(8); doc.setTextColor(130);
    doc.text("AI screening only — not a medical diagnosis. Consult a qualified healthcare professional.", 105, 282, { align:"center" });
    doc.save(`PredictaCare_${prediction.disease}_${date.toISOString().slice(0,10)}.pdf`);
  };

  // Stats
  const total    = predictions.length;
  const high     = predictions.filter(p => p.predictionResult === "HIGH").length;
  const verified = predictions.filter(p => p.blockchainTxHash).length;

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc", fontFamily:"'Inter',system-ui,sans-serif" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{
        background:"linear-gradient(135deg,#1e3a8a,#2563eb,#3b82f6)",
        padding:"40px 24px 56px",
      }}>
        <div style={{ maxWidth:900, margin:"0 auto" }}>
          <button onClick={() => navigate(-1)} style={{
            background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)",
            color:"#fff", padding:"6px 16px", borderRadius:999, fontSize:12,
            cursor:"pointer", marginBottom:16, fontFamily:"inherit",
          }}>← Back</button>
          <h1 style={{ fontSize:28, fontWeight:800, color:"#fff", margin:"0 0 6px" }}>
            My Predictions
          </h1>
          <p style={{ fontSize:14, color:"rgba(255,255,255,0.7)", margin:0 }}>
            Your full health prediction history with blockchain verification
          </p>
        </div>
      </div>

      <div style={{ maxWidth:900, margin:"-28px auto 48px", padding:"0 24px" }}>

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:20 }}>
          {[
            { label:"Total Predictions", value:total,    color:"#2563eb" },
            { label:"High Risk",         value:high,     color:"#dc2626" },
            { label:"Blockchain Sealed", value:verified, color:"#16a34a" },
          ].map((s,i) => (
            <div key={i} style={{ background:"#fff", borderRadius:14, padding:"16px 18px",
              border:"1.5px solid #e2e8f0", boxShadow:"0 2px 8px rgba(0,0,0,0.04)" }}>
              <p style={{ fontSize:11, color:"#94a3b8", fontWeight:600, margin:"0 0 4px",
                textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</p>
              <p style={{ fontSize:26, fontWeight:800, color:s.color, margin:0 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Filters ───────────────────────────────────────────────────── */}
        <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
          {[
            { key:"all",      label:"All" },
            { key:"high",     label:"High Risk" },
            { key:"premium",  label:"Premium" },
            { key:"heart",    label:"❤️ Heart" },
            { key:"diabetes", label:"🩸 Diabetes" },
            { key:"pcos",     label:"🔬 PCOS" },
            { key:"stroke",   label:"🧠 Stroke" },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{
                padding:"6px 14px", borderRadius:999, fontSize:12, fontWeight:600,
                cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s",
                background: filter===f.key ? "#2563eb" : "#fff",
                color: filter===f.key ? "#fff" : "#64748b",
                border: filter===f.key ? "1.5px solid #2563eb" : "1.5px solid #e2e8f0",
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* ── List ──────────────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ height:90, borderRadius:16, background:"#fff",
                border:"1.5px solid #e2e8f0", animation:"pulse 1.5s infinite" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:"60px 24px", background:"#fff",
            borderRadius:20, border:"1.5px solid #e2e8f0" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>🔬</div>
            <p style={{ fontSize:16, fontWeight:700, color:"#334155", margin:"0 0 8px" }}>
              No predictions yet
            </p>
            <p style={{ fontSize:13, color:"#94a3b8", margin:"0 0 20px" }}>
              Run your first DiagnoAI prediction to see results here
            </p>
            <button onClick={() => navigate("/prediction")}
              style={{ padding:"10px 24px", borderRadius:12, background:"#2563eb",
                color:"#fff", border:"none", fontSize:13, fontWeight:600,
                cursor:"pointer", fontFamily:"inherit" }}>
              Go to DiagnoAI →
            </button>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {filtered.map(p => (
              <PredictionCard
                key={p._id}
                prediction={p}
                token={token}
                onDownload={handleDownload}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
