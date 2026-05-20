/**
 * ResearchHub.jsx — Full Research Marketplace (Kaggle-style)
 * Copy to: frontend/src/pages/ResearchHub.jsx
 * Add to App.jsx:
 *   import ResearchHub from "./pages/ResearchHub";
 *   <Route path="/research-hub/*" element={<ResearchHub />} />
 *
 * Install: npm install json2csv (backend)
 */

import React, { useState, useEffect, useContext } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const BACKEND_URL  = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID;

// ── Colours & helpers ─────────────────────────────────────────────────────────
const DISEASE_META = {
  heart:    { label: "Heart Disease", icon: "❤️",  color: "#dc2626", light: "#fef2f2" },
  diabetes: { label: "Diabetes",      icon: "🩸",  color: "#d97706", light: "#fffbeb" },
  pcos:     { label: "PCOS",          icon: "🔬",  color: "#7c3aed", light: "#f5f3ff" },
  stroke:   { label: "Stroke",        icon: "🧠",  color: "#2563eb", light: "#eff6ff" },
};

const PRICING = [
  { records: 100,  price: 150,  label: "Starter" },
  { records: 500,  price: 600,  label: "Standard", popular: true },
  { records: 1000, price: 900,  label: "Professional" },
  { records: 5000, price: 3000, label: "Enterprise" },
];

const useResearcher = () => {
  const [researcher, setResearcher] = useState(() => {
    try { return JSON.parse(localStorage.getItem("rh_user") || "null"); } catch { return null; }
  });
  const [rToken, setRToken] = useState(() => localStorage.getItem("rh_token") || null);

  const login = (user, token) => {
    setResearcher(user);
    setRToken(token);
    localStorage.setItem("rh_user", JSON.stringify(user));
    localStorage.setItem("rh_token", token);
  };

  const logout = () => {
    setResearcher(null);
    setRToken(null);
    localStorage.removeItem("rh_user");
    localStorage.removeItem("rh_token");
  };

  return { researcher, rToken, login, logout };
};

// ── Shared styles ─────────────────────────────────────────────────────────────
const S = {
  page:  { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter',system-ui,sans-serif" },
  nav:   { background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 40 },
  card:  { background: "#fff", borderRadius: 18, border: "1.5px solid #e2e8f0", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", overflow: "hidden" },
  btn:   (v="primary") => ({
    padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 700, fontFamily: "inherit", transition: "all 0.15s",
    background: v==="primary" ? "#2563eb" : v==="teal" ? "#0d9488" : v==="ghost" ? "transparent" : "#f1f5f9",
    color: v==="primary"||v==="teal" ? "#fff" : v==="ghost" ? "#2563eb" : "#475569",
    border: v==="ghost" ? "1.5px solid #2563eb" : "none",
  }),
  input: { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, color: "#334155", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
  label: { fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5, display: "block" },
};

// ── Navbar ────────────────────────────────────────────────────────────────────
const HubNav = ({ researcher, logout }) => {
  const navigate = useNavigate();
  return (
    <div style={S.nav}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => navigate("/research-hub")}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#1e40af,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🔬</div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", margin: 0, lineHeight: 1 }}>PredictaCare</p>
          <p style={{ fontSize: 10, color: "#94a3b8", margin: 0, letterSpacing: "0.08em", fontWeight: 600 }}>RESEARCH HUB</p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button onClick={() => navigate("/research-hub")} style={{ ...S.btn("ghost"), padding: "7px 14px", fontSize: 12 }}>Datasets</button>
        {researcher ? (
          <>
            <button onClick={() => navigate("/research-hub/profile")} style={{ ...S.btn("ghost"), padding: "7px 14px", fontSize: 12 }}>My Profile</button>
            <button onClick={() => navigate("/research-hub/orders")} style={{ ...S.btn("ghost"), padding: "7px 14px", fontSize: 12 }}>My Orders</button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 10, background: "#f8fafc", border: "1.5px solid #e2e8f0" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 700 }}>
                {researcher.name?.[0]?.toUpperCase()}
              </div>
              <span style={{ fontSize: 13, color: "#334155", fontWeight: 600 }}>{researcher.name.split(" ")[0]}</span>
            </div>
            <button onClick={logout} style={{ ...S.btn(), padding: "7px 14px", fontSize: 12 }}>Logout</button>
          </>
        ) : (
          <>
            <button onClick={() => navigate("/research-hub/login")}    style={{ ...S.btn(),          padding: "7px 16px", fontSize: 12 }}>Login</button>
            <button onClick={() => navigate("/research-hub/register")} style={{ ...S.btn("primary"), padding: "7px 16px", fontSize: 12 }}>Sign Up Free</button>
          </>
        )}
      </div>
    </div>
  );
};

// ── Home / Dataset Browser ────────────────────────────────────────────────────
const HubHome = ({ researcher, rToken }) => {
  const navigate = useNavigate();
  const [datasets,   setDatasets]   = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [disease,    setDisease]    = useState("all");
  const [tier,       setTier]       = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [d, s] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/research-hub/datasets?disease=${disease}&tier=${tier}`),
          axios.get(`${BACKEND_URL}/api/research-hub/stats`),
        ]);
        if (d.data.success) setDatasets(d.data.datasets);
        if (s.data.success) setStats(s.data.stats);
      } catch { toast.error("Failed to load datasets"); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [disease, tier]);

  return (
    <div>
      {/* Hero */}
      <div style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb,#3b82f6)", padding: "60px 24px 80px", textAlign: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", color: "#93c5fd", textTransform: "uppercase", display: "block", marginBottom: 12, fontFamily: "monospace" }}>
          PredictaCare Research Hub
        </span>
        <h1 style={{ fontSize: 40, fontWeight: 800, color: "#fff", margin: "0 0 14px", lineHeight: 1.15 }}>
          Blockchain-Verified Health Datasets
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", maxWidth: 560, margin: "0 auto 32px", lineHeight: 1.6 }}>
          Access anonymised, AI-generated health prediction datasets with cryptographic proof of integrity. Built for clinical research and ML model training.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => document.getElementById("datasets-section").scrollIntoView({ behavior: "smooth" })}
            style={{ ...S.btn("primary"), background: "#fff", color: "#2563eb", padding: "13px 28px", fontSize: 14 }}>
            Browse Datasets →
          </button>
          {!researcher && (
            <button onClick={() => navigate("/research-hub/register")}
              style={{ ...S.btn("ghost"), borderColor: "rgba(255,255,255,0.5)", color: "#fff", padding: "13px 28px", fontSize: 14 }}>
              Create Free Account
            </button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16 }}>
            {[
              { label: "Total Records",       value: stats.totalRecords?.toLocaleString() || "0", color: "#2563eb" },
              { label: "Blockchain Verified", value: stats.blockchainVerified?.toLocaleString() || "0", color: "#0d9488" },
              { label: "Diseases Covered",    value: "4", color: "#7c3aed" },
              { label: "Starting From",       value: "₹150", color: "#d97706" },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: s.color, margin: "0 0 4px" }}>{s.value}</p>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: 0, fontWeight: 600 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dataset browser */}
      <div id="datasets-section" style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 }}>Available Datasets</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <select value={disease} onChange={e => setDisease(e.target.value)} style={{ ...S.input, width: "auto", padding: "8px 12px" }}>
              <option value="all">All Diseases</option>
              {Object.entries(DISEASE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={tier} onChange={e => setTier(e.target.value)} style={{ ...S.input, width: "auto", padding: "8px 12px" }}>
              <option value="all">All Tiers</option>
              <option value="premium">Premium DNN</option>
              <option value="free">Free XGBoost</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 20 }}>
            {[1,2,3,4].map(i => <div key={i} style={{ height: 280, borderRadius: 18, background: "#f1f5f9", animation: "pulse 1.5s infinite" }} />)}
          </div>
        ) : datasets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", background: "#fff", borderRadius: 18, border: "1.5px solid #e2e8f0" }}>
            <p style={{ fontSize: 16, color: "#94a3b8" }}>No datasets available yet. Check back soon!</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 20 }}>
            {datasets.map(d => {
              const meta = DISEASE_META[d.disease] || {};
              return (
                <div key={d.disease} style={{ ...S.card, cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s" }}
                  onClick={() => navigate(`/research-hub/dataset/${d.disease}`)}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                  {/* Card header */}
                  <div style={{ padding: "20px 20px 16px", background: meta.light, borderBottom: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fff", border: `1.5px solid ${meta.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                        {meta.icon}
                      </div>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: 0 }}>{meta.label}</p>
                        <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0", fontWeight: 600 }}>
                          {d.totalRecords.toLocaleString()} records
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: "16px 20px" }}>
                    {/* Risk breakdown */}
                    <div style={{ marginBottom: 14 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Risk Distribution</p>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[
                          { k: "HIGH",     color: "#dc2626", light: "#fef2f2" },
                          { k: "MODERATE", color: "#d97706", light: "#fffbeb" },
                          { k: "LOW",      color: "#16a34a", light: "#f0fdf4" },
                        ].map(r => (
                          <div key={r.k} style={{ flex: 1, textAlign: "center", padding: "6px 4px", borderRadius: 8, background: r.light }}>
                            <p style={{ fontSize: 14, fontWeight: 800, color: r.color, margin: 0 }}>{d.riskBreakdown[r.k] || 0}</p>
                            <p style={{ fontSize: 9, color: r.color, margin: 0, fontWeight: 700 }}>{r.k}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Blockchain badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
                      <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700 }}>
                        ⛓️ {d.blockchainVerified} blockchain verified
                      </span>
                    </div>

                    {/* Price */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>Starting from</p>
                      <p style={{ fontSize: 18, fontWeight: 800, color: "#2563eb", margin: 0 }}>₹150</p>
                    </div>
                  </div>

                  <div style={{ padding: "12px 20px", borderTop: "1px solid #f1f5f9" }}>
                    <button style={{ ...S.btn("primary"), width: "100%", padding: "10px" }}>View Dataset →</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
};

// ── Dataset Detail Page ───────────────────────────────────────────────────────
const DatasetDetail = ({ researcher, rToken }) => {
  const navigate    = useNavigate();
  const disease     = window.location.pathname.split("/").pop();
  const meta        = DISEASE_META[disease] || {};
  const [preview,   setPreview]   = useState([]);
  const [dataset,   setDataset]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [selPlan,   setSelPlan]   = useState(null);
  const [paying,    setPaying]    = useState(false);
  const [form,      setForm]      = useState({ name: researcher?.name||"", email: researcher?.email||"", institution: researcher?.institution||"", purpose: "" });
  const [payType,   setPayType]   = useState("razorpay");
  const [format,    setFormat]    = useState("json");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [p, d] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/research-hub/preview/${disease}`),
          axios.get(`${BACKEND_URL}/api/research-hub/datasets?disease=${disease}`),
        ]);
        if (p.data.success) setPreview(p.data.preview);
        if (d.data.success) setDataset(d.data.datasets[0]);
      } catch {}
      finally { setLoading(false); }
    };
    fetchData();
  }, [disease]);

  const handlePurchase = async () => {
    if (!researcher) { toast.error("Please login to purchase"); navigate("/research-hub/login"); return; }
    if (!selPlan) { toast.error("Please select a plan"); return; }
    if (!form.purpose) { toast.error("Please describe your research purpose"); return; }

    setPaying(true);
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/research/order`, {
        ...form, diseases: [disease], recordCount: selPlan.records,
        tierFilter: "all", paymentType: payType,
      });
      if (!data.success) throw new Error(data.message);

      if (payType === "invoice") {
        toast.success("Invoice request sent! We'll email you within 24 hours.");
        return;
      }

      const options = {
        key: RAZORPAY_KEY, amount: data.amount, currency: "INR",
        name: "PredictaCare Research Hub",
        description: `${selPlan.records} ${meta.label} records`,
        order_id: data.order.id,
        handler: async (response) => {
          const verify = await axios.post(`${BACKEND_URL}/api/research/verify-payment`, { ...response, orderId: data.orderId });
          if (verify.data.success) {
            toast.success("Payment successful! Access token emailed.");
            navigate("/research-hub/orders");
          }
        },
        prefill: { name: form.name, email: form.email },
        theme:   { color: "#2563eb" },
      };
      new window.Razorpay(options).open();
    } catch (err) {
      toast.error(err.message || "Purchase failed");
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: "80px", color: "#94a3b8" }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
      {/* Back */}
      <button onClick={() => navigate("/research-hub")} style={{ ...S.btn(), marginBottom: 20, fontSize: 12 }}>← Back to Datasets</button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, alignItems: "start" }}>
        {/* Left */}
        <div>
          {/* Header */}
          <div style={{ ...S.card, padding: "24px", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: meta.light, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{meta.icon}</div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>{meta.label} Dataset</h1>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                  {dataset?.totalRecords?.toLocaleString() || 0} records · {dataset?.blockchainVerified || 0} blockchain verified
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Anonymised", "Blockchain Certified", "AI-Generated", "Research Ready", "JSON + CSV"].map(tag => (
                <span key={tag} style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: "#eff6ff", color: "#2563eb" }}>{tag}</span>
              ))}
            </div>
          </div>

          {/* Preview table */}
          <div style={{ ...S.card, marginBottom: 20 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9" }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: 0 }}>Sample Data Preview (5 records)</h3>
            </div>
            <div style={{ overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["ID", "Disease", "Result", "Probability", "Tier", "Blockchain"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#475569", whiteSpace: "nowrap", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 14px", fontFamily: "monospace", color: "#94a3b8" }}>{p.record_id}</td>
                      <td style={{ padding: "10px 14px", textTransform: "capitalize", color: "#334155" }}>{p.disease}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700,
                          background: p.prediction_result==="HIGH"?"#fef2f2":p.prediction_result==="MODERATE"?"#fffbeb":"#f0fdf4",
                          color: p.prediction_result==="HIGH"?"#dc2626":p.prediction_result==="MODERATE"?"#d97706":"#16a34a" }}>
                          {p.prediction_result}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#334155" }}>{p.probability}%</td>
                      <td style={{ padding: "10px 14px", color: "#334155", textTransform: "capitalize" }}>{p.tier}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{ color: p.blockchain_verified ? "#16a34a" : "#94a3b8", fontWeight: 600, fontSize: 11 }}>
                          {p.blockchain_verified ? "⛓️ Yes" : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* What's included */}
          <div style={{ ...S.card, padding: "20px 24px" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 14px" }}>What's Included</h3>
            {["Anonymised clinical inputs (age, BMI, lab values, symptoms)",
              "AI prediction result (HIGH/MODERATE/LOW) with probability score",
              "Model tier (Premium DNN or Free XGBoost)",
              "Blockchain transaction hash per record (cryptographic proof)",
              "Download in JSON or CSV format",
              "30-day access window, unlimited downloads",
              "Research-use license"].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <span style={{ color: "#16a34a", fontWeight: 700, flexShrink: 0 }}>✓</span>
                <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Purchase panel */}
        <div style={{ position: "sticky", top: 80 }}>
          <div style={{ ...S.card, padding: "20px 20px 24px" }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: "0 0 16px" }}>Purchase Dataset</h3>

            {/* Plans */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {PRICING.map(plan => (
                <div key={plan.records} onClick={() => setSelPlan(plan)}
                  style={{ padding: "12px 14px", borderRadius: 12, cursor: "pointer", transition: "all 0.15s",
                    border: selPlan?.records === plan.records ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                    background: selPlan?.records === plan.records ? "#eff6ff" : "#fff",
                    display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
                  {plan.popular && (
                    <span style={{ position: "absolute", top: -8, right: 10, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: "#f59e0b", color: "#fff" }}>POPULAR</span>
                  )}
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 2px" }}>{plan.label}</p>
                    <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{plan.records.toLocaleString()} records</p>
                  </div>
                  <p style={{ fontSize: 16, fontWeight: 800, color: "#2563eb", margin: 0 }}>₹{plan.price}</p>
                </div>
              ))}
            </div>

            {/* Format */}
            <label style={S.label}>Download Format</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {["json","csv"].map(f => (
                <button key={f} onClick={() => setFormat(f)}
                  style={{ flex: 1, padding: "8px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                    background: format===f ? "#2563eb" : "#f8fafc", color: format===f ? "#fff" : "#64748b",
                    border: format===f ? "1.5px solid #2563eb" : "1.5px solid #e2e8f0" }}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Research purpose */}
            <label style={S.label}>Research Purpose *</label>
            <textarea value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))}
              placeholder="Briefly describe your research..." rows={2}
              style={{ ...S.input, resize: "vertical", marginBottom: 14, fontSize: 13 }} />

            {/* Institution (if not logged in) */}
            {!researcher && (
              <>
                <label style={S.label}>Your Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Dr. John Smith" style={{ ...S.input, marginBottom: 10 }} />
                <label style={S.label}>Email *</label>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@university.edu" style={{ ...S.input, marginBottom: 10 }} />
                <label style={S.label}>Institution *</label>
                <input value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="Harvard Medical School" style={{ ...S.input, marginBottom: 14 }} />
              </>
            )}

            {/* Payment type */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {[{ val: "razorpay", label: "💳 Pay Now" }, { val: "invoice", label: "🧾 Invoice" }].map(o => (
                <button key={o.val} onClick={() => setPayType(o.val)}
                  style={{ flex: 1, padding: "8px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                    background: payType===o.val ? "#eff6ff" : "#f8fafc", color: payType===o.val ? "#2563eb" : "#64748b",
                    border: payType===o.val ? "2px solid #2563eb" : "1.5px solid #e2e8f0" }}>
                  {o.label}
                </button>
              ))}
            </div>

            <button onClick={handlePurchase} disabled={paying || !selPlan}
              style={{ ...S.btn("primary"), width: "100%", padding: "13px", fontSize: 14, opacity: paying||!selPlan ? 0.7 : 1 }}>
              {paying ? "Processing…" : selPlan ? `${payType==="invoice"?"Request Invoice":"Pay"} ₹${selPlan.price}` : "Select a Plan"}
            </button>

            <p style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", margin: "10px 0 0" }}>
              Access token valid 30 days · Unlimited downloads
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Login ─────────────────────────────────────────────────────────────────────
const HubLogin = ({ onLogin }) => {
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/research-hub/login`, form);
      if (data.success) { onLogin(data.user, data.token); toast.success("Welcome back!"); navigate("/research-hub"); }
      else toast.error(data.message);
    } catch (err) { toast.error(err.response?.data?.message || "Login failed"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 60px)", padding: 24 }}>
      <div style={{ ...S.card, padding: "36px 32px", maxWidth: 420, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔬</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>Researcher Login</h2>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Access your datasets and orders</p>
        </div>
        {[{ name: "email", label: "Email", type: "email", placeholder: "you@institution.edu" },
          { name: "password", label: "Password", type: "password", placeholder: "••••••••" }].map(f => (
          <div key={f.name} style={{ marginBottom: 14 }}>
            <label style={S.label}>{f.label}</label>
            <input type={f.type} value={form[f.name]} onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
              placeholder={f.placeholder} style={S.input}
              onKeyDown={e => e.key === "Enter" && handleSubmit()} />
          </div>
        ))}
        <button onClick={handleSubmit} disabled={loading} style={{ ...S.btn("primary"), width: "100%", padding: "13px", marginTop: 6, opacity: loading ? 0.7 : 1 }}>
          {loading ? "Logging in…" : "Login"}
        </button>
        <p style={{ fontSize: 13, textAlign: "center", color: "#64748b", marginTop: 16 }}>
          Don't have an account?{" "}
          <span onClick={() => navigate("/research-hub/register")} style={{ color: "#2563eb", fontWeight: 700, cursor: "pointer" }}>Sign up free</span>
        </p>
      </div>
    </div>
  );
};

// ── Register ──────────────────────────────────────────────────────────────────
const HubRegister = ({ onLogin }) => {
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ name: "", email: "", password: "", institution: "", researchArea: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password || !form.institution) { toast.error("Fill all required fields"); return; }
    setLoading(true);
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/research-hub/register`, form);
      if (data.success) { onLogin(data.user, data.token); toast.success("Account created!"); navigate("/research-hub"); }
      else toast.error(data.message);
    } catch (err) { toast.error(err.response?.data?.message || "Registration failed"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 60px)", padding: 24 }}>
      <div style={{ ...S.card, padding: "36px 32px", maxWidth: 480, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔬</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: "0 0 4px" }}>Create Researcher Account</h2>
          <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Free account · Access to all datasets</p>
        </div>
        {[
          { name: "name",         label: "Full Name *",    type: "text",     placeholder: "Dr. Jane Smith" },
          { name: "email",        label: "Email *",        type: "email",    placeholder: "jane@university.edu" },
          { name: "password",     label: "Password *",     type: "password", placeholder: "Min. 8 characters" },
          { name: "institution",  label: "Institution *",  type: "text",     placeholder: "Harvard Medical School" },
          { name: "researchArea", label: "Research Area",  type: "text",     placeholder: "Cardiology, Diabetes, etc." },
        ].map(f => (
          <div key={f.name} style={{ marginBottom: 12 }}>
            <label style={S.label}>{f.label}</label>
            <input type={f.type} value={form[f.name]} onChange={e => setForm(p => ({ ...p, [f.name]: e.target.value }))}
              placeholder={f.placeholder} style={S.input} />
          </div>
        ))}
        <button onClick={handleSubmit} disabled={loading} style={{ ...S.btn("primary"), width: "100%", padding: "13px", marginTop: 8, opacity: loading ? 0.7 : 1 }}>
          {loading ? "Creating…" : "Create Free Account"}
        </button>
        <p style={{ fontSize: 13, textAlign: "center", color: "#64748b", marginTop: 14 }}>
          Already have an account?{" "}
          <span onClick={() => navigate("/research-hub/login")} style={{ color: "#2563eb", fontWeight: 700, cursor: "pointer" }}>Login</span>
        </p>
      </div>
    </div>
  );
};

// ── Orders / Profile page ─────────────────────────────────────────────────────
const HubOrders = ({ researcher, rToken }) => {
  const navigate = useNavigate();
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [dlToken,  setDlToken]  = useState("");
  const [dlFormat, setDlFormat] = useState("json");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!researcher) { navigate("/research-hub/login"); return; }
    axios.get(`${BACKEND_URL}/api/research-hub/my-orders`, { headers: { rtoken: rToken } })
      .then(r => { if (r.data.success) setOrders(r.data.orders); })
      .catch(() => toast.error("Failed to load orders"))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (token, format) => {
    setDownloading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/research-hub/download?token=${token}&format=${format}`, { responseType: "blob" });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", `predictacare_dataset_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`Dataset downloaded as .${format.toUpperCase()}`);
    } catch { toast.error("Download failed — check your token"); }
    finally { setDownloading(false); }
  };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 24px" }}>My Orders</h2>

      {/* Download by token */}
      <div style={{ ...S.card, padding: "20px 24px", marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 14px" }}>Download Dataset</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input value={dlToken} onChange={e => setDlToken(e.target.value)} placeholder="Enter access token..."
            style={{ ...S.input, flex: 1, minWidth: 200, fontFamily: "monospace", fontSize: 13 }} />
          <div style={{ display: "flex", gap: 8 }}>
            {["json","csv"].map(f => (
              <button key={f} onClick={() => setDlFormat(f)}
                style={{ padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                  background: dlFormat===f ? "#2563eb" : "#f8fafc", color: dlFormat===f ? "#fff" : "#64748b",
                  border: dlFormat===f ? "1.5px solid #2563eb" : "1.5px solid #e2e8f0" }}>
                {f.toUpperCase()}
              </button>
            ))}
          </div>
          <button onClick={() => handleDownload(dlToken, dlFormat)} disabled={downloading || !dlToken}
            style={{ ...S.btn("primary"), opacity: downloading||!dlToken ? 0.7 : 1 }}>
            {downloading ? "Downloading…" : "Download"}
          </button>
        </div>
      </div>

      {/* Orders list */}
      {loading ? <p style={{ color: "#94a3b8", textAlign: "center", padding: "40px" }}>Loading…</p>
       : orders.length === 0 ? (
        <div style={{ ...S.card, padding: "48px", textAlign: "center" }}>
          <p style={{ fontSize: 16, color: "#94a3b8", margin: "0 0 16px" }}>No orders yet</p>
          <button onClick={() => navigate("/research-hub")} style={S.btn("primary")}>Browse Datasets →</button>
        </div>
       ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {orders.map(o => {
            const statusColor = o.status==="active" ? "#16a34a" : o.status==="pending_payment" ? "#d97706" : "#94a3b8";
            const statusBg    = o.status==="active" ? "#f0fdf4"  : o.status==="pending_payment" ? "#fffbeb"  : "#f8fafc";
            return (
              <div key={o._id} style={{ ...S.card, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" }}>
                      {o.diseases?.map(d => DISEASE_META[d]?.label || d).join(", ")} — {o.recordCount?.toLocaleString()} records
                    </p>
                    <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 6px" }}>
                      {new Date(o.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      {o.expiresAt && ` · Expires ${new Date(o.expiresAt).toLocaleDateString("en-IN")}`}
                    </p>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: statusBg, color: statusColor }}>
                      {o.status?.replace("_"," ").toUpperCase()}
                    </span>
                  </div>
                  {o.status === "active" && o.accessToken && (
                    <div style={{ display: "flex", gap: 8 }}>
                      {["json","csv"].map(f => (
                        <button key={f} onClick={() => handleDownload(o.accessToken, f)} disabled={downloading}
                          style={{ ...S.btn("primary"), padding: "8px 14px", fontSize: 12, opacity: downloading ? 0.7 : 1 }}>
                          ↓ {f.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Profile page ──────────────────────────────────────────────────────────────
const HubProfile = ({ researcher, rToken, logout }) => {
  const navigate = useNavigate();
  if (!researcher) { navigate("/research-hub/login"); return null; }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 24px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 24px" }}>My Profile</h2>
      <div style={{ ...S.card, padding: "28px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#fff", fontWeight: 700 }}>
            {researcher.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "0 0 2px" }}>{researcher.name}</p>
            <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>{researcher.institution}</p>
          </div>
        </div>
        {[
          ["Email",        researcher.email],
          ["Institution",  researcher.institution],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f1f5f9" }}>
            <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>{k}</span>
            <span style={{ fontSize: 13, color: "#334155" }}>{v}</span>
          </div>
        ))}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={() => navigate("/research-hub/orders")} style={{ ...S.btn("primary"), flex: 1 }}>My Orders</button>
          <button onClick={logout} style={{ ...S.btn(), flex: 1 }}>Logout</button>
        </div>
      </div>
    </div>
  );
};

// ── Root component ────────────────────────────────────────────────────────────
export default function ResearchHub() {
  const { researcher, rToken, login, logout } = useResearcher();

  return (
    <div style={S.page}>
      <HubNav researcher={researcher} logout={logout} />
      <Routes>
        <Route path="/"                  element={<HubHome       researcher={researcher} rToken={rToken} />} />
        <Route path="/dataset/:disease"  element={<DatasetDetail researcher={researcher} rToken={rToken} />} />
        <Route path="/login"             element={<HubLogin      onLogin={login} />} />
        <Route path="/register"          element={<HubRegister   onLogin={login} />} />
        <Route path="/orders"            element={<HubOrders     researcher={researcher} rToken={rToken} />} />
        <Route path="/profile"           element={<HubProfile    researcher={researcher} rToken={rToken} logout={logout} />} />
      </Routes>
    </div>
  );
}
