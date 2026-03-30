import mongoose from "mongoose";

const researchOrderSchema = new mongoose.Schema(
  {
    // ─── Researcher info ──────────────────────────────────────────────────────
    name:         { type: String, required: true },
    email:        { type: String, required: true },
    institution:  { type: String, required: true },
    purpose:      { type: String, required: true }, // research purpose description

    // ─── Dataset requested ────────────────────────────────────────────────────
    diseases:     { type: [String], default: ["diabetes","heart","pcos","stroke"] },
    recordCount:  { type: Number,  required: true }, // how many records purchased
    tierFilter:   { type: String,  default: "all" }, // "all" | "premium" | "free"

    // ─── Payment ──────────────────────────────────────────────────────────────
    paymentType:  { type: String, enum: ["razorpay", "invoice"], required: true },
    amount:       { type: Number, required: true }, // in paise
    paid:         { type: Boolean, default: false },
    razorpayOrderId:   { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    invoiceRequested:  { type: Boolean, default: false },

    // ─── Access ───────────────────────────────────────────────────────────────
    accessToken:  { type: String, default: null }, // UUID given after payment
    downloadCount:{ type: Number, default: 0 },
    expiresAt:    { type: Date,   default: null }, // 30 days after payment

    status: {
      type:    String,
      enum:    ["pending_payment", "active", "expired", "cancelled"],
      default: "pending_payment",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ResearchOrder", researchOrderSchema);
