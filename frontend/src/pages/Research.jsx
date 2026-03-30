/**
 * Research.jsx — PredictaCare Research Marketplace
 * Copy to: frontend/src/pages/Research.jsx
 * Add route in App.jsx: <Route path="/research" element={<Research />} />
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "react-toastify";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID;

const PRICING = [
  { records: 100,  price: 150,  label: "Starter",    desc: "Perfect for pilot studies" },
  { records: 500,  price: 600,  label: "Standard",   desc: "Mid-scale research projects", popular: true },
  { records: 1000, price: 900,  label: "Professional", desc: "Large cohort studies" },
  { records: 5000, price: 3000, label: "Enterprise",  desc: "Population-level research" },
];

const DISEASES = ["diabetes", "heart", "pcos", "stroke"];

/* ── Stat card ──────────────────────────────────────────────────────────────── */
const StatCard = ({ label, value, sub, color = "#2563eb" }) => (
  <div style={{
    background: "#fff", borderRadius: 16, padding: "20px 24px",
    border: "1.5px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.04)",
  }}>
    <p style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600, margin: "0 0 6px", letterSpacing: "0.04em" }}>{label}</p>
    <p style={{ fontSize: 32, fontWeight: 800, color, margin: "0 0 2px", lineHeight: 1 }}>{value}</p>
    {sub && <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>{sub}</p>}
  </div>
);

/* ── Section header ─────────────────────────────────────────────────────────── */
const SectionHeader = ({ badge, title, sub }) => (
  <div style={{ textAlign: "center", marginBottom: 48 }}>
    <span style={{
      display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.15em",
      textTransform: "uppercase", color: "#2563eb", background: "#eff6ff",
      padding: "4px 14px", borderRadius: 999, marginBottom: 14,
      fontFamily: "monospace",
    }}>{badge}</span>
    <h2 style={{ fontSize: 32, fontWeight: 800, color: "#0f172a", margin: "0 0 12px", lineHeight: 1.2 }}>{title}</h2>
    {sub && <p style={{ color: "#64748b", fontSize: 16, margin: 0, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>{sub}</p>}
  </div>
);

export default function Research() {
  const [stats,       setStats]       = useState(null);
  const [preview,     setPreview]     = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [activeTab,   setActiveTab]   = useState("overview"); // overview | pricing | access
  const [showForm,    setShowForm]    = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentType, setPaymentType] = useState("razorpay");
  const [submitting,  setSubmitting]  = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [downloading, setDownloading] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", institution: "", purpose: "",
    diseases: ["diabetes","heart","pcos","stroke"], tierFilter: "all",
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [s, p] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/research/stats`),
          axios.get(`${BACKEND_URL}/api/research/preview`),
        ]);
        setStats(s.data.stats);
        setPreview(p.data.preview);
      } catch { /* silently fail */ }
      finally { setLoadingStats(false); }
    };
    fetchStats();
  }, []);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "diseases") {
      setForm(prev => ({
        ...prev,
        diseases: checked
          ? [...prev.diseases, value]
          : prev.diseases.filter(d => d !== value),
      }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePurchase = async () => {
    if (!form.name || !form.email || !form.institution || !form.purpose) {
      toast.error("Please fill all required fields"); return;
    }
    if (!selectedPlan) { toast.error("Please select a plan"); return; }

    setSubmitting(true);
    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/research/order`, {
        ...form,
        recordCount: selectedPlan.records,
        paymentType,
      });

      if (!data.success) throw new Error(data.message);

      if (paymentType === "invoice") {
        toast.success(data.message);
        setShowForm(false);
        return;
      }

      // Razorpay checkout
      const options = {
        key:      RAZORPAY_KEY,
        amount:   data.amount,
        currency: "INR",
        name:     "PredictaCare Research",
        description: `${selectedPlan.records} anonymised health records`,
        order_id: data.order.id,
        handler: async (response) => {
          try {
            const verify = await axios.post(`${BACKEND_URL}/api/research/verify-payment`, {
              ...response,
              orderId: data.orderId,
            });
            if (verify.data.success) {
              toast.success("Payment successful! Your access token is ready.");
              setAccessToken(verify.data.accessToken);
              setActiveTab("access");
              setShowForm(false);
            }
          } catch { toast.error("Payment verification failed"); }
        },
        prefill:  { name: form.name, email: form.email },
        theme:    { color: "#2563eb" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.message || "Order failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!accessToken.trim()) { toast.error("Enter your access token"); return; }
    setDownloading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/api/research/download?token=${accessToken}`, {
        responseType: "blob",
      });
      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", `predictacare_dataset_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Dataset downloaded!");
    } catch {
      toast.error("Invalid or expired access token");
    } finally {
      setDownloading(false);
    }
  };

  const s = {
    page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', system-ui, sans-serif" },
    hero: {
      background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)",
      padding: "80px 24px 100px", textAlign: "center", position: "relative", overflow: "hidden",
    },
    container: { maxWidth: 1100, margin: "0 auto", padding: "0 24px" },
    tab: (active) => ({
      padding: "10px 24px", borderRadius: 10, border: "none", cursor: "pointer",
      fontSize: 14, fontWeight: 600, transition: "all 0.2s",
      background: active ? "#2563eb" : "transparent",
      color: active ? "#fff" : "#64748b",
    }),
    card: {
      background: "#fff", borderRadius: 20, border: "1.5px solid #e2e8f0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)",
    },
    input: {
      width: "100%", padding: "10px 14px", borderRadius: 10,
      border: "1.5px solid #e2e8f0", fontSize: 14, color: "#334155",
      outline: "none", boxSizing: "border-box", fontFamily: "inherit",
    },
    label: { fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6, display: "block" },
    btn: (variant = "primary") => ({
      padding: "12px 28px", borderRadius: 12, cursor: "pointer",
      fontSize: 14, fontWeight: 700, transition: "all 0.2s", fontFamily: "inherit",
      background: variant === "primary" ? "#2563eb" : variant === "outline" ? "transparent" : "#f1f5f9",
      color: variant === "primary" ? "#fff" : variant === "outline" ? "#2563eb" : "#475569",
      border: variant === "outline" ? "1.5px solid #2563eb" : "none",
    }),
  };

  return (
    <div style={s.page}>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={s.hero}>
        {/* decorative circles */}
        {[[-60,-60,300],[300,40,200],[500,-40,150]].map(([x,y,size],i) => (
          <div key={i} style={{ position:"absolute", top:y, left:x, width:size, height:size,
            borderRadius:"50%", background:"rgba(255,255,255,0.05)", pointerEvents:"none" }} />
        ))}
        <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}>
          <span style={{ display:"inline-block", background:"rgba(255,255,255,0.15)", color:"#fff",
            fontSize:11, fontWeight:700, letterSpacing:"0.15em", padding:"4px 14px",
            borderRadius:999, marginBottom:20, textTransform:"uppercase", fontFamily:"monospace" }}>
            Research Marketplace
          </span>
          <h1 style={{ fontSize:48, fontWeight:800, color:"#fff", margin:"0 0 16px", lineHeight:1.1 }}>
            Verified Health Prediction Data
          </h1>
          <p style={{ fontSize:18, color:"rgba(255,255,255,0.75)", maxWidth:580, margin:"0 auto 32px", lineHeight:1.6 }}>
            Access anonymised, blockchain-verified AI health prediction datasets for clinical research and ML model training.
          </p>
          <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
            <button onClick={() => setActiveTab("pricing")} style={{ ...s.btn("primary"), background:"#fff", color:"#2563eb", padding:"14px 32px", fontSize:15 }}>
              Browse Datasets →
            </button>
            <button onClick={() => setActiveTab("access")} style={{ ...s.btn("outline"), borderColor:"rgba(255,255,255,0.5)", color:"#fff", padding:"14px 32px", fontSize:15 }}>
              Access My Data
            </button>
          </div>
        </motion.div>
      </div>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"32px 24px" }}>
        <div style={{ ...s.container, display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px,1fr))", gap:16 }}>
          {loadingStats ? (
            [1,2,3,4].map(i => <div key={i} style={{ height:80, borderRadius:16, background:"#f1f5f9", animation:"pulse 1.5s infinite" }} />)
          ) : stats ? (
            <>
              <StatCard label="Total Records" value={stats.totalRecords?.toLocaleString() || "0"} sub="Consented by users" />
              <StatCard label="Blockchain Verified" value={stats.blockchainVerified?.toLocaleString() || "0"} sub="Cryptographically sealed" color="#0d9488" />
              <StatCard label="Diseases Covered" value="4" sub="Diabetes · Heart · PCOS · Stroke" color="#7c3aed" />
              <StatCard label="Starting From" value="₹150" sub="For 100 records" color="#d97706" />
            </>
          ) : null}
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"0 24px" }}>
        <div style={{ ...s.container, display:"flex", gap:4, padding:"12px 0" }}>
          {["overview","pricing","access"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={s.tab(activeTab === tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ ...s.container, padding:"48px 24px" }}>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}>
            <SectionHeader badge="Dataset Overview" title="Why choose PredictaCare data?" sub="Every record is AI-generated, user-consented, and cryptographically verified on Ethereum." />

            {/* Feature grid */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:20, marginBottom:48 }}>
              {[
                { icon:"⛓️", title:"Blockchain Verified", desc:"Every prediction hash stored on Ethereum — tamper-proof provenance for your research citations." },
                { icon:"🔒", title:"Fully Anonymised", desc:"All personally identifiable information removed. Names, emails, and images stripped before export." },
                { icon:"✅", title:"User Consented", desc:"Every record is from a user who explicitly opted in during registration. GDPR & HIPAA compliant." },
                { icon:"🤖", title:"AI-Generated Labels", desc:"Predictions from Deep Neural Networks (ROC-AUC 0.93–0.97) and XGBoost models — both included." },
                { icon:"📊", title:"Rich Feature Set", desc:"Clinical inputs: glucose, BMI, ECG, hormones, symptoms — ready for ML training and statistical analysis." },
                { icon:"📥", title:"Instant Download", desc:"JSON format. Download immediately after payment with your unique access token. Valid 30 days." },
              ].map((f, i) => (
                <motion.div key={i} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.07 }}
                  style={{ ...s.card, padding:"28px 24px" }}>
                  <div style={{ fontSize:28, marginBottom:12 }}>{f.icon}</div>
                  <h3 style={{ fontSize:16, fontWeight:700, color:"#0f172a", margin:"0 0 8px" }}>{f.title}</h3>
                  <p style={{ fontSize:13.5, color:"#64748b", margin:0, lineHeight:1.6 }}>{f.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* Disease breakdown */}
            {stats && (
              <>
                <SectionHeader badge="Dataset Breakdown" title="Records by disease" />
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16, marginBottom:48 }}>
                  {DISEASES.map(d => (
                    <div key={d} style={{ ...s.card, padding:"20px 24px" }}>
                      <p style={{ fontSize:12, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em", margin:"0 0 8px" }}>{d}</p>
                      <p style={{ fontSize:28, fontWeight:800, color:"#2563eb", margin:"0 0 4px" }}>{(stats.byDisease?.[d] || 0).toLocaleString()}</p>
                      <p style={{ fontSize:12, color:"#94a3b8", margin:0 }}>records</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Sample data preview */}
            {preview && preview.length > 0 && (
              <>
                <SectionHeader badge="Sample Data" title="Preview dataset format" sub="5 sample records shown below. All fields present in the full download." />
                <div style={{ ...s.card, overflow:"auto", marginBottom:32 }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                    <thead>
                      <tr style={{ borderBottom:"2px solid #e2e8f0", background:"#f8fafc" }}>
                        {["Disease","Result","Probability","Tier","Beta","Inputs"].map(h => (
                          <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontWeight:700, color:"#475569", whiteSpace:"nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((p, i) => (
                        <tr key={i} style={{ borderBottom:"1px solid #f1f5f9" }}>
                          <td style={{ padding:"10px 16px", color:"#334155", fontWeight:600 }}>{p.disease}</td>
                          <td style={{ padding:"10px 16px" }}>
                            <span style={{ padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:700,
                              background: p.predictionResult==="HIGH" ? "#fef2f2" : p.predictionResult==="MODERATE" ? "#fffbeb" : "#f0fdf4",
                              color: p.predictionResult==="HIGH" ? "#dc2626" : p.predictionResult==="MODERATE" ? "#d97706" : "#16a34a",
                            }}>{p.predictionResult}</span>
                          </td>
                          <td style={{ padding:"10px 16px", color:"#334155" }}>{p.probability}%</td>
                          <td style={{ padding:"10px 16px", color:"#334155" }}>{p.tier}</td>
                          <td style={{ padding:"10px 16px", color:"#94a3b8" }}>{p.isBeta ? "Yes" : "No"}</td>
                          <td style={{ padding:"10px 16px", color:"#94a3b8", maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {Object.keys(p.inputs || {}).join(", ")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div style={{ textAlign:"center" }}>
              <button onClick={() => setActiveTab("pricing")} style={{ ...s.btn("primary"), padding:"14px 40px", fontSize:15 }}>
                View Pricing & Purchase →
              </button>
            </div>
          </motion.div>
        )}

        {/* ── PRICING TAB ──────────────────────────────────────────────────── */}
        {activeTab === "pricing" && (
          <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}>
            <SectionHeader badge="Pricing" title="Choose your dataset size" sub="All plans include blockchain-verified records, anonymised inputs, and a 30-day download window." />

            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:20, marginBottom:48 }}>
              {PRICING.map((plan, i) => (
                <motion.div key={i} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.08 }}
                  onClick={() => setSelectedPlan(plan)}
                  style={{
                    ...s.card, padding:"28px 24px", cursor:"pointer", position:"relative",
                    border: selectedPlan?.records === plan.records ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                    transform: selectedPlan?.records === plan.records ? "translateY(-4px)" : "none",
                    transition: "all 0.2s",
                    boxShadow: plan.popular ? "0 8px 32px rgba(37,99,235,0.15)" : undefined,
                  }}>
                  {plan.popular && (
                    <div style={{ position:"absolute", top:0, right:0, background:"#f59e0b", color:"#fff",
                      fontSize:10, fontWeight:700, padding:"5px 14px", borderRadius:"0 18px 0 12px",
                      letterSpacing:"0.06em" }}>POPULAR</div>
                  )}
                  {selectedPlan?.records === plan.records && (
                    <div style={{ position:"absolute", top:12, left:12, width:20, height:20, borderRadius:"50%",
                      background:"#2563eb", display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                  )}
                  <p style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 8px", fontFamily:"monospace" }}>{plan.label}</p>
                  <p style={{ fontSize:32, fontWeight:800, color:"#0f172a", margin:"0 0 2px", lineHeight:1 }}>₹{plan.price.toLocaleString()}</p>
                  <p style={{ fontSize:13, color:"#94a3b8", margin:"0 0 16px" }}>{plan.records.toLocaleString()} records</p>
                  <p style={{ fontSize:13, color:"#64748b", margin:"0 0 16px", lineHeight:1.5 }}>{plan.desc}</p>
                  <p style={{ fontSize:12, color:"#94a3b8", margin:0 }}>₹{(plan.price / plan.records).toFixed(2)} per record</p>
                </motion.div>
              ))}
            </div>

            {/* Custom plan */}
            <div style={{ ...s.card, padding:"24px 28px", marginBottom:40, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
              <div>
                <h3 style={{ fontSize:16, fontWeight:700, color:"#0f172a", margin:"0 0 4px" }}>Need more than 5,000 records?</h3>
                <p style={{ fontSize:13, color:"#64748b", margin:0 }}>Contact us for custom enterprise pricing and tailored dataset filters.</p>
              </div>
              <a href="mailto:adminPredictaCare@gmail.com" style={{ ...s.btn("outline"), textDecoration:"none", whiteSpace:"nowrap" }}>
                Contact Us →
              </a>
            </div>

            {/* Purchase form */}
            <AnimatePresence>
              {selectedPlan && (
                <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }}>
                  <div style={{ ...s.card, padding:"36px 32px" }}>
                    <h3 style={{ fontSize:20, fontWeight:800, color:"#0f172a", margin:"0 0 4px" }}>
                      Purchase {selectedPlan.records.toLocaleString()} records — ₹{selectedPlan.price.toLocaleString()}
                    </h3>
                    <p style={{ fontSize:13, color:"#94a3b8", margin:"0 0 28px" }}>Fill in your details to complete the purchase</p>

                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
                      {[
                        { name:"name", label:"Full Name *", placeholder:"Dr. John Smith" },
                        { name:"email", label:"Email *", placeholder:"john@university.edu" },
                        { name:"institution", label:"Institution *", placeholder:"Harvard Medical School" },
                      ].map(f => (
                        <div key={f.name} style={f.name === "institution" ? { gridColumn:"1/-1" } : {}}>
                          <label style={s.label}>{f.label}</label>
                          <input name={f.name} value={form[f.name]} onChange={handleFormChange}
                            placeholder={f.placeholder} style={s.input} />
                        </div>
                      ))}
                      <div style={{ gridColumn:"1/-1" }}>
                        <label style={s.label}>Research Purpose *</label>
                        <textarea name="purpose" value={form.purpose} onChange={handleFormChange}
                          placeholder="Briefly describe your research project and how you'll use this data..."
                          rows={3} style={{ ...s.input, resize:"vertical" }} />
                      </div>
                    </div>

                    {/* Disease filter */}
                    <div style={{ marginBottom:16 }}>
                      <label style={s.label}>Disease types to include</label>
                      <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                        {DISEASES.map(d => (
                          <label key={d} style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color:"#334155", cursor:"pointer" }}>
                            <input type="checkbox" name="diseases" value={d}
                              checked={form.diseases.includes(d)} onChange={handleFormChange} />
                            {d.charAt(0).toUpperCase() + d.slice(1)}
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Tier filter */}
                    <div style={{ marginBottom:24 }}>
                      <label style={s.label}>Model tier</label>
                      <select name="tierFilter" value={form.tierFilter} onChange={handleFormChange} style={{ ...s.input, width:"auto" }}>
                        <option value="all">All (Premium + Free)</option>
                        <option value="premium">Premium DNN only</option>
                        <option value="free">Free XGBoost only</option>
                      </select>
                    </div>

                    {/* Payment type */}
                    <div style={{ marginBottom:28 }}>
                      <label style={s.label}>Payment method</label>
                      <div style={{ display:"flex", gap:12 }}>
                        {[
                          { val:"razorpay", label:"💳 Pay now (Razorpay)" },
                          { val:"invoice",  label:"🧾 Request invoice" },
                        ].map(opt => (
                          <button key={opt.val} onClick={() => setPaymentType(opt.val)}
                            style={{ padding:"10px 20px", borderRadius:10, cursor:"pointer", fontSize:13, fontWeight:600,
                              background: paymentType === opt.val ? "#eff6ff" : "#f8fafc",
                              border: paymentType === opt.val ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                              color: paymentType === opt.val ? "#2563eb" : "#64748b",
                              fontFamily:"inherit",
                            }}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {paymentType === "invoice" && (
                        <p style={{ fontSize:12, color:"#94a3b8", marginTop:8 }}>
                          We'll email an invoice to your address within 24 hours. Data access granted after payment confirmation.
                        </p>
                      )}
                    </div>

                    <button onClick={handlePurchase} disabled={submitting}
                      style={{ ...s.btn("primary"), padding:"14px 40px", fontSize:15, opacity: submitting ? 0.7 : 1 }}>
                      {submitting ? "Processing…" : paymentType === "invoice" ? "Request Invoice →" : `Pay ₹${selectedPlan.price.toLocaleString()} →`}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── ACCESS TAB ───────────────────────────────────────────────────── */}
        {activeTab === "access" && (
          <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.3 }}>
            <SectionHeader badge="Data Access" title="Download your dataset" sub="Enter your access token to download your purchased dataset." />

            <div style={{ maxWidth:520, margin:"0 auto" }}>
              <div style={{ ...s.card, padding:"36px 32px" }}>
                <label style={s.label}>Access Token</label>
                <input value={accessToken} onChange={e => setAccessToken(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  style={{ ...s.input, marginBottom:16, fontFamily:"monospace" }} />
                <p style={{ fontSize:12, color:"#94a3b8", marginBottom:24, lineHeight:1.6 }}>
                  Your access token was emailed to you after payment. Tokens are valid for 30 days.
                  Each token allows unlimited downloads within the validity period.
                </p>
                <button onClick={handleDownload} disabled={downloading}
                  style={{ ...s.btn("primary"), width:"100%", padding:"13px", fontSize:14, opacity: downloading ? 0.7 : 1 }}>
                  {downloading ? "Downloading…" : "Download Dataset (JSON)"}
                </button>
              </div>

              {/* What's included */}
              <div style={{ ...s.card, padding:"28px 32px", marginTop:20 }}>
                <h3 style={{ fontSize:15, fontWeight:700, color:"#0f172a", margin:"0 0 16px" }}>What's in the download?</h3>
                {[
                  "Anonymised patient inputs (age, BMI, lab results, symptoms)",
                  "AI prediction result (HIGH / MODERATE / LOW)",
                  "Probability score (0–100%)",
                  "Model tier used (Premium DNN or Free XGBoost)",
                  "Blockchain transaction hash for each record",
                  "Metadata: source, license, generated timestamp",
                ].map((item, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:10 }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#2563eb" strokeWidth={2.5} style={{ flexShrink:0, marginTop:1 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                    <p style={{ fontSize:13, color:"#475569", margin:0 }}>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Footer note ───────────────────────────────────────────────────── */}
      <div style={{ borderTop:"1px solid #e2e8f0", padding:"24px", textAlign:"center" }}>
        <p style={{ fontSize:12, color:"#94a3b8", margin:0 }}>
          All data is used strictly for research purposes. Users consented at registration.
          Contact <a href="mailto:adminPredictaCare@gmail.com" style={{ color:"#2563eb" }}>adminPredictaCare@gmail.com</a> for compliance queries.
        </p>
      </div>
    </div>
  );
}
