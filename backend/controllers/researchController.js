import crypto from "crypto";
import Razorpay from "razorpay";
import Prediction from "../models/predictionModel.js";
import ResearchOrder from "../models/researchModel.js";

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── Pricing tiers ─────────────────────────────────────────────────────────────
// Price per record in paise (₹)
const PRICE_PER_RECORD = {
  100: 150, // ₹1.50 per record  → ₹150  for 100
  500: 120, // ₹1.20 per record  → ₹600  for 500
  1000: 90, // ₹0.90 per record  → ₹900  for 1000
  5000: 60, // ₹0.60 per record  → ₹3000 for 5000
};

const calcAmount = (recordCount) => {
  const tiers = [5000, 1000, 500, 100];
  const tier = tiers.find((t) => recordCount >= t) || 100;
  return recordCount * PRICE_PER_RECORD[tier]; // in paise
};

// ── GET /api/research/stats ───────────────────────────────────────────────────
// Public — shows dataset overview to attract researchers
export const getDatasetStats = async (req, res) => {
  try {
    const totalConsented = await Prediction.countDocuments({
      consentGiven: true,
    });

    const byDisease = await Prediction.aggregate([
      { $match: { consentGiven: true } },
      { $group: { _id: "$disease", count: { $sum: 1 } } },
    ]);

    const byRisk = await Prediction.aggregate([
      { $match: { consentGiven: true } },
      { $group: { _id: "$predictionResult", count: { $sum: 1 } } },
    ]);

    const byTier = await Prediction.aggregate([
      { $match: { consentGiven: true } },
      { $group: { _id: "$tier", count: { $sum: 1 } } },
    ]);

    const blockchainVerified = await Prediction.countDocuments({
      consentGiven: true,
      blockchainTxHash: { $ne: null },
    });

    return res.json({
      success: true,
      stats: {
        totalRecords: totalConsented,
        blockchainVerified,
        byDisease: Object.fromEntries(byDisease.map((d) => [d._id, d.count])),
        byRisk: Object.fromEntries(byRisk.map((d) => [d._id, d.count])),
        byTier: Object.fromEntries(byTier.map((d) => [d._id, d.count])),
        pricing: {
          "100 records": "₹150",
          "500 records": "₹600",
          "1000 records": "₹900",
          "5000 records": "₹3,000",
          custom: "Contact us",
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/research/preview ────────────────────────────────────────────────
// Returns 5 sample anonymised records so researchers can see the format
export const getDataPreview = async (req, res) => {
  try {
    const samples = await Prediction.find({ consentGiven: true })
      .limit(5)
      .select(
        "-_id -userData.name -userData.email -userData.image -blockchainHash -blockchainTxHash",
      );

    const anonymised = samples.map((p) => ({
      disease: p.disease,
      predictionResult: p.predictionResult,
      probability: p.probability,
      tier: p.tier,
      isBeta: p.isBeta,
      inputs: p.userData?.inputs || {},
      date: p.createdAt,
    }));

    return res.json({ success: true, preview: anonymised });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/research/order ──────────────────────────────────────────────────
// Create a research data purchase order
export const createResearchOrder = async (req, res) => {
  try {
    const {
      name,
      email,
      institution,
      purpose,
      diseases,
      recordCount,
      tierFilter,
      paymentType,
    } = req.body;

    if (
      !name ||
      !email ||
      !institution ||
      !purpose ||
      !recordCount ||
      !paymentType
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // Note: orders are accepted even if 0 consented records exist yet (data accumulates over time)
    const requested = recordCount;
    const amount = calcAmount(requested);

    if (paymentType === "invoice") {
      // Manual invoice flow — create order, mark invoiceRequested
      const order = await ResearchOrder.create({
        name,
        email,
        institution,
        purpose,
        diseases: diseases || ["diabetes", "heart", "pcos", "stroke"],
        recordCount: requested,
        tierFilter: tierFilter || "all",
        paymentType: "invoice",
        amount,
        invoiceRequested: true,
        status: "pending_payment",
      });

      return res.json({
        success: true,
        message: "Invoice request received. We'll email you within 24 hours.",
        orderId: order._id,
        amount: `₹${(amount / 100).toFixed(0)}`,
      });
    }

    // Razorpay flow
    const rzpOrder = await razorpayInstance.orders.create({
      amount,
      currency: "INR",
      receipt: `res_${Date.now()}`.slice(0, 40),
      notes: { type: "research_data", email, institution },
    });

    const order = await ResearchOrder.create({
      name,
      email,
      institution,
      purpose,
      diseases: diseases || ["diabetes", "heart", "pcos", "stroke"],
      recordCount: requested,
      tierFilter: tierFilter || "all",
      paymentType: "razorpay",
      amount,
      razorpayOrderId: rzpOrder.id,
      status: "pending_payment",
    });

    return res.json({
      success: true,
      order: rzpOrder,
      orderId: order._id,
      amount,
    });
  } catch (err) {
    console.error("Research order error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST /api/research/verify-payment ────────────────────────────────────────
export const verifyResearchPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    const expectedSig = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSig !== razorpay_signature) {
      return res
        .status(400)
        .json({ success: false, message: "Payment verification failed" });
    }

    const accessToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await ResearchOrder.findByIdAndUpdate(orderId, {
      paid: true,
      razorpayPaymentId: razorpay_payment_id,
      accessToken,
      expiresAt,
      status: "active",
    });

    return res.json({
      success: true,
      accessToken,
      message: "Payment verified! Use accessToken to download data.",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /api/research/download?token=xxx ─────────────────────────────────────
// Returns anonymised dataset as JSON
export const downloadDataset = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token)
      return res
        .status(400)
        .json({ success: false, message: "Access token required" });

    const order = await ResearchOrder.findOne({
      accessToken: token,
      status: "active",
    });
    if (!order)
      return res
        .status(403)
        .json({ success: false, message: "Invalid or expired access token" });

    if (new Date() > order.expiresAt) {
      await ResearchOrder.findByIdAndUpdate(order._id, { status: "expired" });
      return res
        .status(403)
        .json({ success: false, message: "Access token expired" });
    }

    // Build query
    const query = { consentGiven: true };
    if (order.diseases?.length) query.disease = { $in: order.diseases };
    if (order.tierFilter !== "all") query.tier = order.tierFilter;

    const predictions = await Prediction.find(query)
      .limit(order.recordCount)
      .select("-userData.name -userData.email -userData.image");

    // Anonymise
    const dataset = predictions.map((p, i) => ({
      record_id: `PC-${String(i + 1).padStart(6, "0")}`,
      disease: p.disease,
      prediction_result: p.predictionResult,
      probability: p.probability,
      tier: p.tier,
      is_beta: p.isBeta,
      inputs: p.userData?.inputs || {},
      blockchain_verified: !!p.blockchainTxHash,
      blockchain_tx: p.blockchainTxHash || null,
      date: p.createdAt,
    }));

    // Increment download count
    await ResearchOrder.findByIdAndUpdate(order._id, {
      $inc: { downloadCount: 1 },
    });

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="predictacare_dataset_${Date.now()}.json"`,
    );
    return res.json({
      metadata: {
        source: "PredictaCare Research API",
        generated: new Date().toISOString(),
        records: dataset.length,
        diseases: order.diseases,
        tier_filter: order.tierFilter,
        blockchain_verified_count: dataset.filter((d) => d.blockchain_verified)
          .length,
        license: "Research use only. Not for commercial redistribution.",
        contact: "adminPredictaCare@gmail.com",
      },
      data: dataset,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
// ── GET /api/research/admin/orders ──────────────────────────────────────
export const getAdminOrders = async (req, res) => {
  try {
    const orders = await ResearchOrder.find().sort({ createdAt: -1 });
    return res.json({ success: true, orders });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const activateOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await ResearchOrder.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });
    const accessToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await ResearchOrder.findByIdAndUpdate(orderId, { paid: true, accessToken, expiresAt, status: "active" });
    return res.json({ success: true, accessToken, message: "Order activated" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    await ResearchOrder.findByIdAndUpdate(orderId, { status: "cancelled" });
    return res.json({ success: true, message: "Order cancelled" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
