/**
 * ConsultModal.jsx — Updated booking modal with Razorpay payment
 * Copy to: frontend/src/components/ConsultModal.jsx
 */

import React, { useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID;

const SPECIALIST = {
  heart: "Cardiologist",
  diabetes: "Endocrinologist",
  pcos: "Gynaecologist / Endocrinologist",
  stroke: "Neurologist",
};

const ALL_TIME_SLOTS = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
];



export default function ConsultModal({
  disease,
  predictionId,
  predictionResult,
  probability,
  onClose,
}) {
  const { token, userData } = useContext(AppContext);
  const [step, setStep] = useState(1); // 1=select slot, 2=confirm, 3=success
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [consultation, setConsultation] = useState(null);

  const today = new Date().toISOString().split("T")[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 14);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  const getAvailableSlots = () => {
  if (!selectedDate) return ALL_TIME_SLOTS;
  if (selectedDate !== today) return ALL_TIME_SLOTS; // future date, show all

  const now = new Date();
  return ALL_TIME_SLOTS.filter((slot) => {
    // Parse "09:30 AM" into a Date object for today
    const [time, period] = slot.split(" ");
    let [hours, minutes] = time.split(":").map(Number);
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    const slotTime = new Date();
    slotTime.setHours(hours, minutes, 0, 0);

    return slotTime > now; // only future slots
  });
};

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select date and time");
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/consultations/book`,
        {
          predictionId,
          disease,
          predictionResult,
          probability,
          scheduledDate: selectedDate,
          scheduledTime: selectedTime,
        },
        { headers: { token } },
      );

      if (!data.success) throw new Error(data.message);

      // Open Razorpay
      const options = {
        key: RAZORPAY_KEY,
        amount: data.order.amount,
        currency: "INR",
        name: "PredictaCare",
        description: `Doctor Consultation — ${SPECIALIST[disease] || "Specialist"}`,
        order_id: data.order.id,
        handler: async (response) => {
          try {
            const verify = await axios.post(
              `${BACKEND_URL}/api/consultations/verify-payment`,
              { ...response, consultationId: data.consultationId },
              { headers: { token } },
            );
            if (verify.data.success) {
              setConsultation({
                id: data.consultationId,
                date: selectedDate,
                time: selectedTime,
              });
              setStep(3);
            }
          } catch {
            toast.error("Payment verification failed");
          }
        },
        prefill: { name: userData?.name, email: userData?.email },
        theme: { color: "#0d9488" },
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      toast.error(err.message || "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  const s = {
    overlay: {
      position: "fixed",
      inset: 0,
      zIndex: 50,
      background: "rgba(0,0,0,0.45)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
    },
    modal: {
      background: "#fff",
      borderRadius: 24,
      padding: "32px 28px",
      maxWidth: 460,
      width: "100%",
      boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      fontFamily: "'Inter',system-ui,sans-serif",
    },
    label: {
      fontSize: 12,
      fontWeight: 700,
      color: "#94a3b8",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      marginBottom: 6,
      display: "block",
    },
    input: {
      width: "100%",
      padding: "10px 14px",
      borderRadius: 10,
      border: "1.5px solid #e2e8f0",
      fontSize: 14,
      color: "#334155",
      outline: "none",
      boxSizing: "border-box",
      fontFamily: "inherit",
    },
    btn: (variant = "primary") => ({
      padding: "12px 24px",
      borderRadius: 12,
      border: "none",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 700,
      fontFamily: "inherit",
      transition: "all 0.2s",
      background: variant === "primary" ? "#0d9488" : "#f1f5f9",
      color: variant === "primary" ? "#fff" : "#475569",
    }),
  };

  return (
    <motion.div
      style={s.overlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        style={s.modal}
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#0f172a",
                margin: 0,
              }}
            >
              Book Consultation
            </h2>
            <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0" }}>
              {SPECIALIST[disease] || "Specialist"} · 30 min · ₹299
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              color: "#94a3b8",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Prediction context */}
        {predictionResult && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              marginBottom: 20,
              background:
                predictionResult === "HIGH"
                  ? "#fef2f2"
                  : predictionResult === "MODERATE"
                    ? "#fffbeb"
                    : "#f0fdf4",
              border: `1px solid ${predictionResult === "HIGH" ? "#fca5a5" : predictionResult === "MODERATE" ? "#fcd34d" : "#86efac"}`,
              fontSize: 13,
              color: "#334155",
            }}
          >
            <strong>{predictionResult} Risk</strong> of {disease} detected (
            {probability}%) — consult a {SPECIALIST[disease]}
          </div>
        )}

        {/* Step 1 — Select slot */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={s.label}>Select Date</label>
              <input
                type="date"
                min={today}
                max={maxDateStr}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTime("");
                }}
                style={s.input}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={s.label}>Select Time Slot</label>
              {(() => {
                const slots = getAvailableSlots();
                return slots.length === 0 ? (
                  <div
                    style={{
                      padding: "14px",
                      borderRadius: 10,
                      background: "#fef2f2",
                      border: "1px solid #fca5a5",
                      fontSize: 13,
                      color: "#dc2626",
                      textAlign: "center",
                    }}
                  >
                    ⚠️ No slots available for today. Please select a future
                    date.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 8,
                    }}
                  >
                    {slots.map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        style={{
                          padding: "8px 4px",
                          borderRadius: 8,
                          border: "1.5px solid",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          background: selectedTime === t ? "#0d9488" : "#fff",
                          color: selectedTime === t ? "#fff" : "#475569",
                          borderColor:
                            selectedTime === t ? "#0d9488" : "#e2e8f0",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={onClose}
                style={{ ...s.btn("secondary"), flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  selectedDate && selectedTime
                    ? setStep(2)
                    : toast.error("Select date and time")
                }
                style={{ ...s.btn("primary"), flex: 2 }}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Confirm */}
        {step === 2 && (
          <div>
            <div
              style={{
                background: "#f8fafc",
                borderRadius: 14,
                padding: "16px 18px",
                marginBottom: 20,
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#0f172a",
                  margin: "0 0 12px",
                }}
              >
                Booking Summary
              </p>
              {[
                ["Specialist", SPECIALIST[disease] || "Doctor"],
                ["Disease", disease.toUpperCase()],
                [
                  "Date",
                  new Date(selectedDate).toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }),
                ],
                ["Time", selectedTime],
                ["Duration", "30 minutes"],
                ["Amount", "₹299"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ color: "#94a3b8", fontWeight: 600 }}>{k}</span>
                  <span style={{ color: "#334155", fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                background: "#fffbeb",
                border: "1px solid #fcd34d",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 20,
                fontSize: 12,
                color: "#92400e",
              }}
            >
              ℹ️ Admin will assign an available doctor after payment. You'll be
              notified once a doctor accepts your request.
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setStep(1)}
                style={{ ...s.btn("secondary"), flex: 1 }}
              >
                ← Back
              </button>
              <button
                onClick={handleBook}
                disabled={loading}
                style={{
                  ...s.btn("primary"),
                  flex: 2,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Processing…" : "Pay ₹299 →"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Success */}
        {step === 3 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "#0f172a",
                margin: "0 0 8px",
              }}
            >
              Booking Confirmed!
            </h3>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 6px" }}>
              {new Date(selectedDate).toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}{" "}
              at {selectedTime}
            </p>
            <p
              style={{
                fontSize: 12,
                color: "#94a3b8",
                margin: "0 0 24px",
                lineHeight: 1.6,
              }}
            >
              We're assigning an available {SPECIALIST[disease]}. You'll be
              notified once the doctor accepts your request.
            </p>
            <button
              onClick={onClose}
              style={{ ...s.btn("primary"), width: "100%", padding: "13px" }}
            >
              Done
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
