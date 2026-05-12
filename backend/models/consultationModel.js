/**
 * consultationModel.js
 * Copy to: backend/models/consultationModel.js
 */

import mongoose from "mongoose";

const consultationSchema = new mongoose.Schema(
  {
    // ── User ──────────────────────────────────────────────────────────────────
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    userName:    { type: String, required: true },
    userEmail:   { type: String, required: true },
    userImage:   { type: String, default: null },

    // ── Prediction context ────────────────────────────────────────────────────
    predictionId:     { type: mongoose.Schema.Types.ObjectId, ref: "Prediction", default: null },
    disease:          { type: String, required: true },
    predictionResult: { type: String, default: null }, // HIGH / MODERATE / LOW
    probability:      { type: Number, default: null },

    // ── Doctor ────────────────────────────────────────────────────────────────
    doctorId:    { type: mongoose.Schema.Types.ObjectId, ref: "doctor", default: null },
    doctorName:  { type: String, default: null },
    doctorImage: { type: String, default: null },
    speciality:  { type: String, default: null },

    // ── Booking ───────────────────────────────────────────────────────────────
    scheduledDate: { type: Date, required: true },
    scheduledTime: { type: String, required: true }, // "10:30 AM"
    duration:      { type: Number, default: 30 },    // minutes

    // ── Payment ───────────────────────────────────────────────────────────────
    amount:            { type: Number, default: 29900 }, // paise
    paid:              { type: Boolean, default: false },
    razorpayOrderId:   { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },

    // ── Status ────────────────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    ["pending_payment", "pending_assignment", "assigned", "accepted", "rejected", "completed", "cancelled"],
      default: "pending_payment",
    },

    // ── Agora video call ──────────────────────────────────────────────────────
    agoraChannel: { type: String, default: null }, // unique channel name
    agoraToken:   { type: String, default: null }, // generated before call

    // ── Post-call ─────────────────────────────────────────────────────────────
    doctorNotes:       { type: String, default: null },
    prescription:      { type: String, default: null },
    followUpRequired:  { type: Boolean, default: false },
    rating:            { type: Number, default: null }, // 1-5
    userFeedback:      { type: String, default: null },

    // ── Rejection ─────────────────────────────────────────────────────────────
    rejectionReason: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Consultation", consultationSchema);
