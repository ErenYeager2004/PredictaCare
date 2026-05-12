/**
 * consultationController.js
 * Copy to: backend/controllers/consultationController.js
 */

import Razorpay from "razorpay";
import crypto from "crypto";
import Consultation from "../models/consultationModel.js";
import User from "../models/userModel.js";
import Prediction from "../models/predictionModel.js";
import { generateAgoraToken, generateChannelName } from "../services/agoraService.js";

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── POST /api/consultations/book ──────────────────────────────────────────────
export const bookConsultation = async (req, res) => {
  try {
    const { userId } = req.body;
    const { predictionId, disease, predictionResult, probability, scheduledDate, scheduledTime } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Create Razorpay order
    const rzpOrder = await razorpay.orders.create({
      amount:   29900, // Rs.299 in paise
      currency: "INR",
      receipt:  `cons_${userId.toString().slice(-8)}_${Date.now()}`.slice(0, 40),
      notes:    { type: "consultation", disease },
    });

    // Create consultation record
    const consultation = await Consultation.create({
      userId,
      userName:      user.name,
      userEmail:     user.email,
      userImage:     user.image,
      predictionId:  predictionId || null,
      disease,
      predictionResult: predictionResult || null,
      probability:   probability || null,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      razorpayOrderId: rzpOrder.id,
      status:        "pending_payment",
    });

    return res.json({
      success: true,
      order:   rzpOrder,
      consultationId: consultation._id,
    });
  } catch (err) {
    console.error("bookConsultation error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/consultations/verify-payment ────────────────────────────────────
export const verifyConsultationPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, consultationId } = req.body;

    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    await Consultation.findByIdAndUpdate(consultationId, {
      paid:              true,
      razorpayPaymentId: razorpay_payment_id,
      status:            "pending_assignment",
    });

    return res.json({ success: true, message: "Payment verified. Admin will assign a doctor shortly." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/consultations/my ─────────────────────────────────────────────────
export const getUserConsultations = async (req, res) => {
  try {
    const { userId } = req.body;
    const consultations = await Consultation.find({ userId }).sort({ createdAt: -1 });
    return res.json({ success: true, consultations });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/consultations/token/:consultationId ──────────────────────────────
// Generate Agora token when user/doctor joins the call
export const getCallToken = async (req, res) => {
  try {
    const { consultationId } = req.params;
    const { userId } = req.body;

    const consultation = await Consultation.findById(consultationId);
    console.log("Consultation status:", consultation?.status);
    if (!consultation) {
      return res.status(404).json({ success: false, message: "Consultation not found" });
    }

    if (consultation.status !== "accepted") {
      return res.status(400).json({ success: false, message: "Consultation not yet accepted by doctor" });
    }

    const channelName = generateChannelName(consultationId);
    const token       = generateAgoraToken(channelName, 0, "publisher");

    // Save channel name to consultation if not already saved
    if (!consultation.agoraChannel) {
      await Consultation.findByIdAndUpdate(consultationId, { agoraChannel: channelName });
    }

    return res.json({
      success: true,
      token,
      channelName,
      appId: process.env.AGORA_APP_ID,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/consultations/complete ─────────────────────────────────────────
export const completeConsultation = async (req, res) => {
  try {
    const { consultationId, doctorNotes, prescription, followUpRequired } = req.body;

    await Consultation.findByIdAndUpdate(consultationId, {
      status: "completed",
      doctorNotes,
      prescription,
      followUpRequired: followUpRequired || false,
    });

    return res.json({ success: true, message: "Consultation completed" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/consultations/rate ──────────────────────────────────────────────
export const rateConsultation = async (req, res) => {
  try {
    const { consultationId, rating, feedback } = req.body;

    await Consultation.findByIdAndUpdate(consultationId, {
      rating,
      userFeedback: feedback,
    });

    return res.json({ success: true, message: "Rating submitted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADMIN: GET /api/consultations/admin/all ───────────────────────────────────
export const getAdminConsultations = async (req, res) => {
  try {
    const consultations = await Consultation.find().sort({ createdAt: -1 });
    return res.json({ success: true, consultations });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── ADMIN: POST /api/consultations/admin/assign ───────────────────────────────
export const assignDoctor = async (req, res) => {
  try {
    const { consultationId, doctorId, doctorName, doctorImage, speciality } = req.body;

    await Consultation.findByIdAndUpdate(consultationId, {
      doctorId,
      doctorName,
      doctorImage,
      speciality,
      status: "assigned",
    });

    return res.json({ success: true, message: "Doctor assigned successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DOCTOR: GET /api/consultations/doctor/my ─────────────────────────────────
export const getDoctorConsultations = async (req, res) => {
  try {
    const { docId } = req.body;
    const consultations = await Consultation.find({ doctorId: docId }).sort({ scheduledDate: 1 });
    return res.json({ success: true, consultations });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── DOCTOR: POST /api/consultations/doctor/respond ───────────────────────────
export const doctorRespond = async (req, res) => {
  try {
    const { consultationId, action, rejectionReason } = req.body;
    // action: "accept" | "reject"

    const update = action === "accept"
      ? { status: "accepted" }
      : { status: "rejected", rejectionReason: rejectionReason || "Doctor unavailable" };

    await Consultation.findByIdAndUpdate(consultationId, update);

    return res.json({
      success: true,
      message: action === "accept" ? "Consultation accepted" : "Consultation rejected",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/consultations/cancel ────────────────────────────────────────────
export const cancelConsultation = async (req, res) => {
  try {
    const { consultationId } = req.body;
    await Consultation.findByIdAndUpdate(consultationId, { status: "cancelled" });
    return res.json({ success: true, message: "Consultation cancelled" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
