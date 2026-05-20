import mongoose from "mongoose";

// ── Downloaded dataset record (permanent, redownloadable) ─────────────────────
const downloadedDatasetSchema = new mongoose.Schema({
  disease:      { type: String, required: true },
  recordCount:  { type: Number, required: true },
  format:       { type: String, required: true },
  amount:       { type: Number, required: true }, // in paise
  downloadedAt: { type: Date, default: Date.now },
  lastDownloadedAt: { type: Date, default: Date.now },
  downloadCount:    { type: Number, default: 1 },
});

// ── Research user schema ───────────────────────────────────────────────────────
const researchUserSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true },
    email:        { type: String, required: true, unique: true },
    password:     { type: String, required: true },
    institution:  { type: String, required: true },
    researchArea: { type: String, default: "" },

    // Permanently owned datasets (populated after first download)
    downloadedDatasets: { type: [downloadedDatasetSchema], default: [] },

    totalPurchases: { type: Number, default: 0 },
    totalSpent:     { type: Number, default: 0 }, // in paise
  },
  { timestamps: true }
);

// ── Research order schema (payment + short-lived token) ───────────────────────
const researchOrderSchema = new mongoose.Schema(
  {
    // ─── Researcher info ──────────────────────────────────────────────────────
    researcherId: { type: mongoose.Schema.Types.ObjectId, ref: "ResearchUser", required: true },
    name:         { type: String, required: true },
    email:        { type: String, required: true },
    institution:  { type: String, required: true },
    purpose:      { type: String, required: true },

    // ─── Dataset requested ────────────────────────────────────────────────────
    diseases:    { type: [String], default: ["diabetes", "heart", "pcos", "stroke"] },
    recordCount: { type: Number, required: true },
    format:      { type: String, default: "csv" },
    tierFilter:  { type: String, default: "all" },

    // ─── Payment ──────────────────────────────────────────────────────────────
    paymentType:       { type: String, enum: ["razorpay", "invoice"], required: true },
    amount:            { type: Number, required: true }, // in paise
    paid:              { type: Boolean, default: false },
    razorpayOrderId:   { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },

    // ─── Short-lived access token (10 min, one-time use) ─────────────────────
    // After first download, token is cleared and dataset is saved to user account
    accessToken:   { type: String, default: null },
    tokenExpiresAt:{ type: Date,   default: null }, // 10 min after payment
    tokenUsed:     { type: Boolean, default: false }, // true after first download

    status: {
      type:    String,
      enum:    ["pending_payment", "paid", "downloaded", "expired"],
      default: "pending_payment",
    },
  },
  { timestamps: true }
);

export const ResearchUser  = mongoose.model("ResearchUser",  researchUserSchema);
export const ResearchOrder = mongoose.model("ResearchOrder", researchOrderSchema);
