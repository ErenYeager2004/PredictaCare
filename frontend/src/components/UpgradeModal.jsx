import React, { useState, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import axios from "axios";
import { AppContext } from "../context/AppContext";

/* ─────────────────────────────────────────────────────────────────────────────
   UpgradeModal — Razorpay ₹299/month premium subscription
   Usage:
     <UpgradeModal isOpen={show} onClose={() => setShow(false)} onSuccess={loadUserProfileData} />
───────────────────────────────────────────────────────────────────────────── */

const FEATURES = [
  { icon: "🧠", label: "Deep Neural Network model (higher accuracy)" },
  { icon: "📊", label: "Unlimited predictions every month" },
  { icon: "🔬", label: "Lab result analysis (HbA1c, ECG, AMH, FSH…)" },
  { icon: "⛓️", label: "Blockchain-verified health certificate" },
  { icon: "👨‍⚕️", label: "Doctor consultation access (coming soon)" },
  { icon: "📥", label: "Downloadable clinical PDF report" },
];

export default function UpgradeModal({ isOpen, onClose, onSuccess }) {
  const { token, backendUrl } = useContext(AppContext);
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!token) { toast.error("Please log in first"); return; }

    setLoading(true);
    try {
      // Step 1 — Create Razorpay order on backend
      const { data } = await axios.post(
        `${backendUrl}/api/user/subscribe/create-order`,
        {},
        { headers: { token } }
      );

      if (!data.success) throw new Error(data.message || "Could not create order");

      const { order } = data;

      // Step 2 — Open Razorpay checkout
      const options = {
        key:          import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount:       order.amount,
        currency:     order.currency,
        name:         "PredictaCare",
        description:  "Premium Subscription — 30 days",
        order_id:     order.id,
        theme:        { color: "#0d9488" },

        handler: async (response) => {
          try {
            // Step 3 — Verify payment on backend → activates premium
            const { data: verifyData } = await axios.post(
              `${backendUrl}/api/user/subscribe/verify`,
              {
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              },
              { headers: { token } }
            );

            if (verifyData.success) {
              toast.success("🎉 Premium activated! Enjoy unlimited predictions.");
              if (onSuccess) onSuccess();   // refresh userData in AppContext
              onClose();
            } else {
              toast.error(verifyData.message || "Payment verification failed");
            }
          } catch (err) {
            toast.error("Verification error — contact support");
          }
        },

        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        toast.error(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });
      rzp.open();

    } catch (err) {
      toast.error(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            initial={{ scale: 0.95, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-teal-600 to-teal-700 px-6 py-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-widest text-teal-200 mb-1">
                Upgrade
              </p>
              <h2 className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                PredictaCare Premium
              </h2>
              <p className="text-teal-100 text-sm mt-0.5">
                Clinical-grade AI predictions — no limits
              </p>
            </div>

            {/* Price */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-100">
              <div className="flex items-end gap-2">
                <span
                  className="text-4xl font-bold text-slate-800"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  ₹299
                </span>
                <span className="text-slate-400 text-sm mb-1.5">/month</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Billed monthly · Cancel anytime
              </p>
            </div>

            {/* Features */}
            <div className="px-6 py-4 space-y-3">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-lg w-6 text-center flex-shrink-0">{f.icon}</span>
                  <span className="text-sm text-slate-600">{f.label}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="px-6 pb-6 pt-2 space-y-3">
              <button
                onClick={handleUpgrade}
                disabled={loading}
                className={`w-full h-12 text-sm font-bold text-white rounded-xl transition-colors
                  ${loading
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-teal-600 hover:bg-teal-700"
                  }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Processing…
                  </span>
                ) : (
                  "Upgrade Now — ₹299/month"
                )}
              </button>

              <button
                onClick={onClose}
                className="w-full h-10 text-sm text-slate-400 hover:text-slate-600 transition-colors"
              >
                Maybe later
              </button>

              <p className="text-center text-xs text-slate-300">
                Secured by Razorpay · 256-bit encryption
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
