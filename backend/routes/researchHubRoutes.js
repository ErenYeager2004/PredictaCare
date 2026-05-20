/**
 * researchHubRoutes.js
 *
 * Flow:
 *  1. User purchases → Razorpay order created
 *  2. Payment verified → 10-min one-time token → emailed to user
 *  3. User pastes token in Download tab → downloads → token marked used + cleared
 *  4. Dataset permanently saved to user account → re-downloadable anytime from My Datasets
 *
 * Drop into: backend/routes/researchHubRoutes.js
 * Register:  app.use("/api/research-hub", researchHubRouter)
 * Deps:      npm install razorpay nodemailer json2csv
 */

import express    from "express";
import bcrypt     from "bcryptjs";
import jwt        from "jsonwebtoken";
import crypto     from "crypto";
import Razorpay   from "razorpay";
import nodemailer from "nodemailer";
import { Parser } from "json2csv";

import { ResearchOrder, ResearchUser } from "../models/researchModel.js";
import Prediction from "../models/predictionModel.js";

const router = express.Router();

// ── Razorpay ──────────────────────────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── Nodemailer ────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── Auth middleware ───────────────────────────────────────────────────────────
const authResearcher = async (req, res, next) => {
  const token = req.headers["rtoken"];
  if (!token) return res.status(401).json({ success: false, message: "Not authorized" });
  try {
    const decoded    = jwt.verify(token, process.env.JWT_SECRET);
    req.researcherId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, institution, researchArea } = req.body;
    if (!name || !email || !password || !institution)
      return res.status(400).json({ success: false, message: "All fields required" });

    if (await ResearchUser.findOne({ email }))
      return res.status(400).json({ success: false, message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user   = await ResearchUser.create({ name, email, password: hashed, institution, researchArea });
    const token  = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      success: true, token,
      user: { name: user.name, email: user.email, institution: user.institution, researchArea: user.researchArea },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await ResearchUser.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password))
      return res.status(400).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    return res.json({
      success: true, token,
      user: { name: user.name, email: user.email, institution: user.institution, researchArea: user.researchArea },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/profile", authResearcher, async (req, res) => {
  try {
    const user = await ResearchUser.findById(req.researcherId).select("-password");
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/profile", authResearcher, async (req, res) => {
  try {
    const { name, institution, researchArea } = req.body;
    const user = await ResearchUser.findByIdAndUpdate(
      req.researcherId, { name, institution, researchArea }, { new: true }
    ).select("-password");
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DATASETS (public)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/datasets", async (req, res) => {
  try {
    const datasets = await Promise.all(
      ["heart", "diabetes", "pcos", "stroke"].map(async (d) => {
        const base  = { consentGiven: true, disease: d };
        const count = await Prediction.countDocuments(base);
        const bc    = await Prediction.countDocuments({ ...base, blockchainTxHash: { $ne: null } });
        const high  = await Prediction.countDocuments({ ...base, predictionResult: "HIGH" });
        const mod   = await Prediction.countDocuments({ ...base, predictionResult: "MODERATE" });
        const low   = await Prediction.countDocuments({ ...base, predictionResult: "LOW" });
        return {
          disease: d, totalRecords: count, blockchainVerified: bc,
          riskBreakdown: { HIGH: high, MODERATE: mod, LOW: low },
          pricing: { 100: 150, 500: 600, 1000: 900, 5000: 3000 },
        };
      })
    );
    return res.json({ success: true, datasets });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/stats", async (req, res) => {
  try {
    const total    = await Prediction.countDocuments({ consentGiven: true });
    const bc       = await Prediction.countDocuments({ consentGiven: true, blockchainTxHash: { $ne: null } });
    const diseases = await Prediction.aggregate([
      { $match: { consentGiven: true } },
      { $group: { _id: "$disease", count: { $sum: 1 } } },
    ]);
    return res.json({
      success: true,
      stats: {
        totalRecords: total, blockchainVerified: bc,
        byDisease: Object.fromEntries(diseases.map((d) => [d._id, d.count])),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/preview/:disease", async (req, res) => {
  try {
    const samples    = await Prediction.find({ consentGiven: true, disease: req.params.disease })
      .limit(5).select("-userData.name -userData.email -userData.image -blockchainHash");
    const anonymised = samples.map((p, i) => ({
      record_id:          `PC-${String(i + 1).padStart(4, "0")}`,
      disease:            p.disease,
      prediction_result:  p.predictionResult,
      probability:        p.probability,
      tier:               p.tier,
      blockchain_verified: !!p.blockchainTxHash,
      date:               p.createdAt,
    }));
    return res.json({ success: true, preview: anonymised });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT
// ─────────────────────────────────────────────────────────────────────────────

const PRICE_MAP = { 100: 150, 500: 600, 1000: 900, 5000: 3000 };

router.post("/create-order", authResearcher, async (req, res) => {
  try {
    const { diseases, recordCount, format } = req.body;
    const priceINR = PRICE_MAP[recordCount];
    if (!priceINR) return res.status(400).json({ success: false, message: "Invalid record count" });

    const user = await ResearchUser.findById(req.researcherId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const rzpOrder = await razorpay.orders.create({
      amount: priceINR * 100, currency: "INR", receipt: `rh_${Date.now()}`,
    });

    const order = await ResearchOrder.create({
      researcherId:    req.researcherId,
      name:            user.name,
      email:           user.email,
      institution:     user.institution,
      purpose:         `Research data purchase – ${diseases.join(", ")}`,
      diseases,
      recordCount:     Number(recordCount),
      paymentType:     "razorpay",
      amount:          priceINR * 100,
      razorpayOrderId: rzpOrder.id,
      format:          format || "csv",
    });

    return res.json({
      success: true, orderId: order._id,
      razorpayOrderId: rzpOrder.id, razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      amount: priceINR * 100,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/verify-payment", authResearcher, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId, format } = req.body;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expected !== razorpay_signature)
      return res.status(400).json({ success: false, message: "Payment verification failed" });

    // 10-minute one-time token
    const accessToken    = crypto.randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const order = await ResearchOrder.findByIdAndUpdate(orderId, {
      paid: true, razorpayPaymentId: razorpay_payment_id,
      accessToken, tokenExpiresAt, tokenUsed: false,
      status: "paid", format: format || "csv",
    }, { new: true });

    await ResearchUser.findByIdAndUpdate(req.researcherId, {
      $inc: { totalPurchases: 1, totalSpent: order.amount },
    });

    // Email the token
    try {
      await transporter.sendMail({
        from:    `"PredictaCare Research Hub" <${process.env.EMAIL_USER}>`,
        to:      order.email,
        subject: "⏱ Your Dataset Token – Valid for 10 Minutes Only",
        html: `
<!DOCTYPE html><html>
<head><style>
  body{font-family:Arial,sans-serif;background:#f8f9ff;margin:0;padding:0}
  .wrap{max-width:540px;margin:32px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(95,111,255,.1)}
  .hdr{background:linear-gradient(135deg,#5f6FFF,#818cf8);padding:28px 32px;color:#fff;text-align:center}
  .hdr h1{margin:0;font-size:20px} .hdr p{margin:6px 0 0;opacity:.85;font-size:13px}
  .body{padding:28px 32px}
  .timer{background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:12px;text-align:center;color:#c2410c;font-weight:700;font-size:16px;margin:20px 0;letter-spacing:.5px}
  .token-box{background:#f3f4f6;border-radius:12px;padding:20px;text-align:center;border:2px dashed #5f6FFF;margin:20px 0}
  .token{font-family:monospace;font-size:14px;color:#5f6FFF;word-break:break-all;font-weight:700;line-height:1.8}
  .row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f3f4f6;font-size:13px}
  .lbl{color:#6b7280} .val{font-weight:600;color:#111}
  .cta{display:block;background:linear-gradient(135deg,#5f6FFF,#818cf8);color:#fff;padding:13px 28px;border-radius:50px;text-decoration:none;font-weight:700;font-size:14px;margin:24px auto;text-align:center;width:fit-content}
  .warn{background:#fffbeb;border-radius:10px;padding:14px;font-size:12px;color:#92400e;border-left:4px solid #f59e0b;margin-top:20px;line-height:1.6}
  .foot{background:#f8f9ff;padding:16px 32px;text-align:center;font-size:11px;color:#9ca3af}
</style></head>
<body>
<div class="wrap">
  <div class="hdr"><h1>🔬 Dataset Access Token</h1><p>PredictaCare Research Hub · Use immediately</p></div>
  <div class="body">
    <p style="color:#374151;font-size:14px">Hi <strong>${order.name}</strong>, payment confirmed!</p>
    <div class="timer">⏱ &nbsp; Token expires in <strong>10 minutes</strong></div>
    <div class="token-box">
      <div style="font-size:11px;color:#9ca3af;margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">Copy this token</div>
      <div class="token">${accessToken}</div>
    </div>
    <div style="margin:20px 0">
      <div class="row"><span class="lbl">Dataset</span><span class="val">${order.diseases.map(d => d.charAt(0).toUpperCase()+d.slice(1)).join(", ")}</span></div>
      <div class="row"><span class="lbl">Records</span><span class="val">${order.recordCount.toLocaleString()}</span></div>
      <div class="row"><span class="lbl">Format</span><span class="val">${(order.format||"csv").toUpperCase()}</span></div>
      <div class="row"><span class="lbl">Amount Paid</span><span class="val">₹${(order.amount/100).toLocaleString()}</span></div>
    </div>
    <a href="${process.env.RESEARCH_HUB_URL||"http://localhost:5175"}/download" class="cta">Go to Download Page →</a>
    <div class="warn">
      <strong>⚠️ One-time use only.</strong> This token expires in 10 minutes and can only be used once.<br/>
      After downloading, your dataset is permanently saved to your account and re-downloadable anytime from <strong>My Datasets</strong>.<br/><br/>
      For research use only. Redistribution prohibited.
    </div>
  </div>
  <div class="foot">PredictaCare Research Hub · Anonymised · Blockchain Verified</div>
</div>
</body></html>`,
      });
    } catch (mailErr) {
      console.error("Email failed (non-fatal):", mailErr.message);
    }

    return res.json({ success: true, message: "Payment verified! Check your email for the 10-minute access token." });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DOWNLOAD  (one-time token → dataset saved to account permanently)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/download", authResearcher, async (req, res) => {
  try {
    const { token, format = "csv" } = req.query;
    if (!token) return res.status(400).json({ success: false, message: "Access token required" });

    const order = await ResearchOrder.findOne({ accessToken: token });

    if (!order)
      return res.status(403).json({ success: false, message: "Invalid token" });
    if (order.tokenUsed)
      return res.status(403).json({ success: false, message: "Token already used. Find your dataset in My Datasets." });
    if (new Date() > order.tokenExpiresAt)
      return res.status(403).json({ success: false, message: "Token expired (10 min limit). Please contact support." });

    // Fetch records
    const predictions = await Prediction.find({
      consentGiven: true,
      disease: { $in: order.diseases },
    }).limit(order.recordCount).select("-userData.name -userData.email -userData.image");

    const dataset = predictions.map((p, i) => ({
      record_id:           `PC-${String(i + 1).padStart(6, "0")}`,
      disease:             p.disease,
      prediction_result:   p.predictionResult,
      probability:         p.probability,
      tier:                p.tier,
      is_beta:             p.isBeta,
      blockchain_verified: !!p.blockchainTxHash,
      blockchain_tx:       p.blockchainTxHash || null,
      date:                p.createdAt,
      ...p.userData?.inputs,
    }));

    // Mark token used and clear it for security
    await ResearchOrder.findByIdAndUpdate(order._id, {
      tokenUsed: true, status: "downloaded", accessToken: null,
    });

    // Permanently save to user account
    const user = await ResearchUser.findById(order.researcherId);
    const existingDataset = user.downloadedDatasets.find(
      (d) => d.disease === order.diseases[0] && d.recordCount === order.recordCount
    );

    if (existingDataset) {
      await ResearchUser.updateOne(
        { _id: order.researcherId, "downloadedDatasets._id": existingDataset._id },
        {
          $inc: { "downloadedDatasets.$.downloadCount": 1 },
          $set: { "downloadedDatasets.$.lastDownloadedAt": new Date() },
        }
      );
    } else {
      await ResearchUser.findByIdAndUpdate(order.researcherId, {
        $push: {
          downloadedDatasets: {
            disease:         order.diseases[0],
            recordCount:     order.recordCount,
            format:          order.format || format,
            amount:          order.amount,
            downloadedAt:    new Date(),
            lastDownloadedAt: new Date(),
            downloadCount:   1,
          },
        },
      });
    }

    // Stream file
    const fmt = format || order.format || "csv";
    if (fmt === "csv") {
      const csv = new Parser().parse(dataset);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="predictacare_${order.diseases.join("_")}_${Date.now()}.csv"`);
      return res.send(csv);
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="predictacare_${order.diseases.join("_")}_${Date.now()}.json"`);
    return res.json({
      metadata: { source: "PredictaCare Research Hub", generated: new Date().toISOString(), records: dataset.length, format: "json", license: "Research use only." },
      data: dataset,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MY DATASETS  (permanently owned — re-downloadable anytime)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/my-datasets", authResearcher, async (req, res) => {
  try {
    const user = await ResearchUser.findById(req.researcherId).select("downloadedDatasets");
    return res.json({ success: true, datasets: user?.downloadedDatasets || [] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/redownload/:datasetId", authResearcher, async (req, res) => {
  try {
    const { format = "csv" } = req.query;
    const user  = await ResearchUser.findById(req.researcherId);
    const owned = user.downloadedDatasets.id(req.params.datasetId);
    if (!owned) return res.status(403).json({ success: false, message: "Dataset not found in your account" });

    const predictions = await Prediction.find({ consentGiven: true, disease: owned.disease })
      .limit(owned.recordCount).select("-userData.name -userData.email -userData.image");

    const dataset = predictions.map((p, i) => ({
      record_id:           `PC-${String(i + 1).padStart(6, "0")}`,
      disease:             p.disease,
      prediction_result:   p.predictionResult,
      probability:         p.probability,
      tier:                p.tier,
      blockchain_verified: !!p.blockchainTxHash,
      blockchain_tx:       p.blockchainTxHash || null,
      date:                p.createdAt,
      ...p.userData?.inputs,
    }));

    await ResearchUser.updateOne(
      { _id: req.researcherId, "downloadedDatasets._id": owned._id },
      { $inc: { "downloadedDatasets.$.downloadCount": 1 }, $set: { "downloadedDatasets.$.lastDownloadedAt": new Date() } }
    );

    const fmt = format || owned.format || "csv";
    if (fmt === "csv") {
      const csv = new Parser().parse(dataset);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="predictacare_${owned.disease}_${Date.now()}.csv"`);
      return res.send(csv);
    }
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="predictacare_${owned.disease}_${Date.now()}.json"`);
    return res.json({ metadata: { source: "PredictaCare Research Hub", generated: new Date().toISOString(), records: dataset.length }, data: dataset });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
