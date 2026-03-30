import mongoose from "mongoose";

const predictionSchema = new mongoose.Schema(
  {
    disease: { type: String, required: true },
    userData: { type: Object, required: true },
    predictionResult: {
      type: String,
      enum: ["HIGH", "MODERATE", "LOW"],
      required: true,
    },
    probability: { type: Number, required: true },
    tier: { type: String, enum: ["free", "premium"], default: "free" },
    isBeta: { type: Boolean, default: false },
    date: { type: Date, default: Date.now },

    // ─── Blockchain ──────────────────────────────────────────────────────────
    blockchainHash:   { type: String, default: null },
    blockchainTxHash: { type: String, default: null },
    blockNumber:      { type: Number, default: null },

    // ─── Research consent ────────────────────────────────────────────────────
    // true if user ticked "share anonymised data" during registration
    consentGiven: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model("Prediction", predictionSchema);
