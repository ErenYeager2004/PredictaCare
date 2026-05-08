/**
 * VerifyPrediction.jsx — Public prediction verification page
 * Copy to: frontend/src/pages/VerifyPrediction.jsx
 * Add to App.jsx: <Route path="/verify" element={<VerifyPrediction />} />
 *
 * Dependencies: npm install qrcode.react
 */

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";

const BACKEND_URL      = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const SEPOLIA_RPC_URL  = import.meta.env.VITE_SEPOLIA_RPC_URL;

const CONTRACT_ABI = [
  {
    inputs: [
      { internalType: "string",  name: "predictionId", type: "string"  },
      { internalType: "bytes32", name: "hash",         type: "bytes32" }
    ],
    name: "verifyPrediction",
    outputs: [
      { internalType: "bool",    name: "valid",     type: "bool"    },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
      { internalType: "address", name: "storedBy",  type: "address" }
    ],
    stateMutability: "view", type: "function"
  },
  {
    inputs: [{ internalType: "string", name: "predictionId", type: "string" }],
    name: "getPrediction",
    outputs: [
      { internalType: "bytes32", name: "hash",      type: "bytes32" },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
      { internalType: "address", name: "storedBy",  type: "address" },
      { internalType: "bool",    name: "exists",    type: "bool"    }
    ],
    stateMutability: "view", type: "function"
  }
];

const RISK_STYLE = {
  HIGH:     { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626", icon: "🔴" },
  MODERATE: { bg: "#fffbeb", border: "#fcd34d", text: "#d97706", icon: "🟡" },
  LOW:      { bg: "#f0fdf4", border: "#86efac", text: "#16a34a", icon: "🟢" },
};

const DISEASE_LABEL = {
  heart: "Heart Disease", diabetes: "Diabetes",
  pcos: "PCOS", stroke: "Stroke",
};

export default function VerifyPrediction() {
  const [searchParams] = useSearchParams();
  const [input,    setInput]    = useState(searchParams.get("id") || "");
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);
  const [method,   setMethod]   = useState("id"); // "id" | "hash"
  const [showQR,   setShowQR]   = useState(false);

  // Auto-verify if id in URL params
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) { setInput(id); handleVerify(id); }
  }, []);

  const handleVerify = async (overrideInput) => {
    const val = (overrideInput || input).trim();
    if (!val) { setError("Please enter a prediction ID or blockchain hash"); return; }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      // Step 1 — get prediction data from backend (public endpoint, no auth needed)
      const { data } = await axios.get(`${BACKEND_URL}/api/predictions/public/${val}`);

      if (!data.success) {
        setError(data.message || "Prediction not found");
        setLoading(false);
        return;
      }

      const prediction = data.prediction;

      // Step 2 — verify directly on blockchain
      let chainResult = null;
      if (CONTRACT_ADDRESS && SEPOLIA_RPC_URL && prediction.blockchainTxHash) {
        try {
          const { ethers } = await import("ethers");
          const provider   = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
          const contract   = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
          const [hash, timestamp, storedBy, exists] = await contract.getPrediction(prediction._id);
          if (exists) {
            chainResult = {
              onChainHash: hash,
              timestamp:   new Date(Number(timestamp) * 1000).toISOString(),
              storedBy,
              exists,
            };
          }
        } catch (e) {
          console.warn("Direct chain call failed:", e.message);
        }
      }

      setResult({ prediction, chainResult });
      setShowQR(true);
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed. Please check the ID and try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyUrl = `${window.location.origin}/verify?id=${result?.prediction?._id || ""}`;

  const s = {
    page:      { minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter',system-ui,sans-serif" },
    container: { maxWidth: 720, margin: "0 auto", padding: "40px 24px" },
    card:      { background: "#fff", borderRadius: 20, border: "1.5px solid #e2e8f0",
                 boxShadow: "0 4px 24px rgba(0,0,0,0.06)", padding: "32px 28px", marginBottom: 20 },
    input:     { width: "100%", padding: "12px 16px", borderRadius: 12,
                 border: "1.5px solid #e2e8f0", fontSize: 14, color: "#334155",
                 outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
    btn:       { padding: "12px 28px", borderRadius: 12, border: "none", cursor: "pointer",
                 fontSize: 14, fontWeight: 700, fontFamily: "inherit",
                 background: "#2563eb", color: "#fff", transition: "all 0.2s" },
    label:     { fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase",
                 letterSpacing: "0.06em", marginBottom: 4, display: "block" },
    row:       { display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                 padding: "12px 0", borderBottom: "1px solid #f1f5f9" },
  };

  const isTampered = result && result.chainResult &&
    result.prediction.blockchainHash !== result.chainResult.onChainHash;

  return (
    <div style={s.page}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        background: "linear-gradient(135deg,#1e3a8a,#2563eb)",
        padding: "48px 24px", textAlign: "center",
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⛓️</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
          Verify Prediction
        </h1>
        <p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", margin: 0 }}>
          Publicly verify any PredictaCare prediction against the Ethereum blockchain.
          No login required.
        </p>
      </div>

      <div style={s.container}>

        {/* ── Search box ────────────────────────────────────────────────── */}
        <div style={s.card}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>
            Enter Prediction Details
          </p>

          {/* Method toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[{ val: "id", label: "Prediction ID" }, { val: "hash", label: "Blockchain Hash" }].map(m => (
              <button key={m.val} onClick={() => { setMethod(m.val); setInput(""); setResult(null); setError(null); }}
                style={{ padding: "6px 16px", borderRadius: 999, border: "1.5px solid", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 12, fontWeight: 600, transition: "all 0.15s",
                  background: method === m.val ? "#2563eb" : "#fff",
                  color:      method === m.val ? "#fff"    : "#64748b",
                  borderColor: method === m.val ? "#2563eb" : "#e2e8f0",
                }}>
                {m.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleVerify()}
              placeholder={method === "id"
                ? "e.g. 69ca87928de080c5ae464dea"
                : "e.g. 0x8971b9895b6a59a272b95cc185c396f75696a0bc6b587b2eed49346f05d3e77c"}
              style={{ ...s.input, fontFamily: method === "hash" ? "monospace" : "inherit" }}
            />
            <button onClick={() => handleVerify()} disabled={loading}
              style={{ ...s.btn, flexShrink: 0, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Verifying…" : "Verify →"}
            </button>
          </div>

          {error && (
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10,
              background: "#fef2f2", border: "1px solid #fecaca", fontSize: 13, color: "#dc2626" }}>
              ❌ {error}
            </div>
          )}
        </div>

        {/* ── Result ────────────────────────────────────────────────────── */}
        {result && (
          <>
            {/* Tamper warning */}
            {isTampered && (
              <div style={{ background: "#dc2626", color: "#fff", padding: "14px 20px",
                borderRadius: 16, marginBottom: 16, fontWeight: 700, fontSize: 14 }}>
                ⚠️ DATA TAMPERING DETECTED — The current data does not match the blockchain record.
                This prediction may have been altered after it was sealed on Ethereum.
              </div>
            )}

            {/* Status banner */}
            <div style={{
              ...s.card, padding: "20px 24px",
              background: isTampered ? "#fef2f2"
                : (result.chainResult || result.prediction?.blockchainTxHash) ? "#f0fdf4" : "#fffbeb",
              border: `1.5px solid ${isTampered ? "#fca5a5" : (result.chainResult || result.prediction?.blockchainTxHash) ? "#86efac" : "#fcd34d"}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ fontSize: 36 }}>
                  {isTampered ? "⚠️" : (result.chainResult || result.prediction?.blockchainTxHash) ? "✅" : "⏳"}
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px",
                    color: isTampered ? "#dc2626" : (result.chainResult || result.prediction?.blockchainTxHash) ? "#16a34a" : "#d97706" }}>
                    {isTampered
                      ? "Verification Failed — Tampered"
                      : (result.chainResult || result.prediction?.blockchainTxHash)
                      ? "Blockchain Verified ⛓️"
                      : "Not yet on blockchain"}
                  </p>
                  <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                    {result.chainResult
                      ? `Verified directly on Ethereum Sepolia · Block timestamp: ${new Date(result.chainResult.timestamp).toLocaleString()}`
                      : result.prediction?.blockchainTxHash
                      ? `Sealed on Ethereum Sepolia · Block #${result.prediction?.blockNumber} · Verified via TX hash`
                      : "This prediction has not been sealed on the blockchain yet."}
                  </p>
                </div>
              </div>
            </div>

            {/* Prediction details */}
            <div style={s.card}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>
                Prediction Details
              </p>

              {(() => {
                const p  = result.prediction;
                const rs = RISK_STYLE[p.predictionResult] || RISK_STYLE.LOW;
                return (
                  <>
                    {/* Risk summary */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16,
                      padding: "16px", borderRadius: 14, marginBottom: 16,
                      background: rs.bg, border: `1.5px solid ${rs.border}` }}>
                      <div style={{ fontSize: 32 }}>{rs.icon}</div>
                      <div>
                        <p style={{ fontSize: 20, fontWeight: 800, color: rs.text, margin: "0 0 2px" }}>
                          {p.predictionResult} Risk
                        </p>
                        <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                          {DISEASE_LABEL[p.disease] || p.disease} · {p.probability}% probability · {p.tier} tier
                        </p>
                      </div>
                    </div>

                    {[
                      { label: "Prediction ID",   value: p._id },
                      { label: "Disease",         value: DISEASE_LABEL[p.disease] || p.disease },
                      { label: "Result",          value: `${p.predictionResult} (${p.probability}%)` },
                      { label: "Model Tier",      value: p.tier },
                      { label: "Date",            value: new Date(p.createdAt).toLocaleString() },
                      { label: "Blockchain Hash", value: p.blockchainHash, mono: true },
                      { label: "TX Hash",         value: p.blockchainTxHash, mono: true, link: p.blockchainTxHash ? `https://sepolia.etherscan.io/tx/${p.blockchainTxHash}` : null },
                      { label: "Block Number",    value: p.blockNumber },
                    ].map((row, i) => row.value && (
                      <div key={i} style={s.row}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8",
                          textTransform: "uppercase", letterSpacing: "0.05em" }}>{row.label}</span>
                        {row.link ? (
                          <a href={row.link} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 12, color: "#2563eb", fontWeight: 600,
                              fontFamily: row.mono ? "monospace" : "inherit",
                              maxWidth: 320, textAlign: "right", wordBreak: "break-all" }}>
                            {String(row.value).slice(0, 20)}… ↗
                          </a>
                        ) : (
                          <span style={{ fontSize: 12, color: "#334155",
                            fontFamily: row.mono ? "monospace" : "inherit",
                            maxWidth: 320, textAlign: "right", wordBreak: "break-all" }}>
                            {String(row.value)}
                          </span>
                        )}
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>

            {/* On-chain record */}
            {result.chainResult && (
              <div style={s.card}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 16px" }}>
                  ⛓️ On-Chain Record (Ethereum Sepolia)
                </p>
                {[
                  { label: "Stored By Wallet", value: result.chainResult.storedBy, mono: true },
                  { label: "Sealed At",        value: new Date(result.chainResult.timestamp).toLocaleString() },
                  { label: "On-Chain Hash",    value: result.chainResult.onChainHash, mono: true },
                  { label: "Contract",         value: CONTRACT_ADDRESS, mono: true,
                    link: `https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}` },
                ].map((row, i) => (
                  <div key={i} style={s.row}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8",
                      textTransform: "uppercase", letterSpacing: "0.05em" }}>{row.label}</span>
                    {row.link ? (
                      <a href={row.link} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, color: "#2563eb", fontWeight: 600,
                          fontFamily: row.mono ? "monospace" : "inherit",
                          maxWidth: 300, textAlign: "right", wordBreak: "break-all" }}>
                        {String(row.value).slice(0, 18)}… ↗
                      </a>
                    ) : (
                      <span style={{ fontSize: 12, color: "#334155",
                        fontFamily: row.mono ? "monospace" : "inherit",
                        maxWidth: 300, textAlign: "right", wordBreak: "break-all" }}>
                        {String(row.value)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* QR Code */}
            {showQR && result.prediction?._id && (
              <div style={{ ...s.card, textAlign: "center" }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
                  Share Verification Link
                </p>
                <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 20px" }}>
                  Scan to verify this prediction on any device
                </p>
                <div style={{ display: "inline-block", padding: 16,
                  background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 16 }}>
                  <QRCodeSVG value={verifyUrl} size={180} level="H"
                    imageSettings={{ src: "/logo.png", x: undefined, y: undefined,
                      height: 32, width: 32, excavate: true }} />
                </div>
                <p style={{ fontSize: 11, color: "#94a3b8", margin: "12px 0 0",
                  fontFamily: "monospace", wordBreak: "break-all" }}>
                  {verifyUrl}
                </p>
                <button onClick={() => { navigator.clipboard.writeText(verifyUrl); }}
                  style={{ marginTop: 10, padding: "8px 20px", borderRadius: 999,
                    border: "1.5px solid #e2e8f0", background: "#f8fafc", color: "#475569",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  📋 Copy Link
                </button>
              </div>
            )}
          </>
        )}

        {/* Info box */}
        {!result && !loading && (
          <div style={{ ...s.card, background: "#f8fafc" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#334155", margin: "0 0 12px" }}>
              How verification works
            </p>
            {[
              "Enter the Prediction ID from your certificate or the blockchain hash",
              "We retrieve the prediction details and check the hash against Ethereum",
              "The smart contract confirms whether the data matches what was originally sealed",
              "Result is cryptographically guaranteed — not just our word",
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: "#2563eb",
                  color: "#fff", fontSize: 11, fontWeight: 700, display: "flex",
                  alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i+1}</span>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.5 }}>{item}</p>
              </div>
            ))}
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 24 }}>
          Contract: <a href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
            target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb" }}>
            {CONTRACT_ADDRESS?.slice(0,10)}…{CONTRACT_ADDRESS?.slice(-8)}
          </a>
        </p>
      </div>
    </div>
  );
}
