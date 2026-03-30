import Prediction from "../models/predictionModel.js";
import User from "../models/userModel.js";
import fetch from "node-fetch";
import { buildPredictionHash, storePredictionOnChain } from "../services/blockchainService.js";

const FLASK_URL        = process.env.FLASK_URL || "http://localhost:5000";
const INTERNAL_SECRET  = process.env.INTERNAL_SECRET || "";

// --- Helper: Call Flask ML Server ---------------------------------------------
const callFlask = async (disease, inputData, isPremium) => {
  const response = await fetch(`${FLASK_URL}/predict/${disease}`, {
    method:  "POST",
    headers: {
      "Content-Type":     "application/json",
      "X-Internal-Secret": INTERNAL_SECRET,
    },
    body: JSON.stringify({ ...inputData, isPremium }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Flask error: ${response.status}`);
  }

  return response.json();
};

// --- POST /api/predictions/predict --------------------------------------------
export const predict = async (req, res) => {
  const { disease, userInputs, userSelectedPremium } = req.body;
  const userId = req.body.userId;

  const validDiseases = ["diabetes", "heart", "pcos", "stroke"];
  if (!disease || !validDiseases.includes(disease)) {
    return res.status(400).json({ message: "Invalid or missing disease type" });
  }
  if (!userInputs || typeof userInputs !== "object") {
    return res.status(400).json({ message: "Missing userInputs" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const now = new Date();

    const isPaidPremium =
      user.subscription === "premium" &&
      user.subscriptionExpiry &&
      user.subscriptionExpiry > now;

    if (!isPaidPremium) {
      const lastReset  = user.lastPredictionReset;
      const isNewMonth = !lastReset ||
        lastReset.getMonth()    !== now.getMonth() ||
        lastReset.getFullYear() !== now.getFullYear();

      if (isNewMonth) {
        await User.findByIdAndUpdate(userId, {
          predictionsUsed:     0,
          lastPredictionReset: now,
        });
        user.predictionsUsed = 0;
      }
    }

    const trialUsed    = user.predictionsUsed  || 0;
    const trialLimit   = user.predictionsLimit || 5;
    const hasTrialLeft = trialUsed < trialLimit;

    // Respect what the user manually selected in the UI
    // userSelectedPremium=false means they clicked "Free" — use XGBoost regardless
    const wantsPremium = userSelectedPremium !== false; // default true if not sent
    const isPremium    = wantsPremium && (isPaidPremium || hasTrialLeft);

    // Only consume trial if user actually ran premium (DNN)
    const shouldConsumeTrial = isPremium && !isPaidPremium && hasTrialLeft;

    const flaskResult = await callFlask(disease, userInputs, isPremium);

    if (shouldConsumeTrial) {
      await User.findByIdAndUpdate(userId, { $inc: { predictionsUsed: 1 } });
    }

    const newPrediction = new Prediction({
      disease,
      userData: {
        name:   user.name  || "Unknown",
        dob:    user.dob   || "N/A",
        image:  user.image || "",
        email:  user.email || "",
        inputs: userInputs,
      },
      predictionResult: flaskResult.risk,
      probability:      flaskResult.probability,
      tier:             flaskResult.tier,
      isBeta:           flaskResult.isBeta || false,
    });

    const saved = await newPrediction.save();

    // ── Blockchain: store hash in background (never blocks response) ──────────
    let blockchainData = null;
    try {
      const hashHex = buildPredictionHash({
        predictionId:     saved._id.toString(),
        userId:           userId.toString(),
        disease,
        predictionResult: flaskResult.risk,
        probability:      flaskResult.probability,
        tier:             isPremium ? "premium" : "free",
        createdAt:        saved.createdAt.toISOString(),
      });

      // Fire-and-forget — don't await, never blocks the response
      storePredictionOnChain(saved._id.toString(), hashHex)
        .then(onChain => {
          if (onChain) {
            Prediction.findByIdAndUpdate(saved._id, {
              blockchainTxHash: onChain.txHash,
              blockchainHash:   hashHex,
              blockNumber:      onChain.blockNumber,
            }).catch(() => {});
          }
        })
        .catch(() => {});

      blockchainData = { hash: hashHex, status: "pending" };
    } catch (err) {
      console.warn("Blockchain hash build failed (non-fatal):", err.message);
    }
    // ─────────────────────────────────────────────────────────────────────────

    return res.status(201).json({
      message:         "Prediction complete",
      predictionId:    saved._id,
      disease:         saved.disease,
      risk:            flaskResult.risk,
      probability:     flaskResult.probability,
      tier:            flaskResult.tier,
      displayTier:     isPaidPremium ? "premium" : (isPremium && hasTrialLeft) ? "trial" : "free",
      isBeta:          flaskResult.isBeta || false,
      blockchain:      blockchainData,
      ...(!isPaidPremium && {
        predictionsUsed:      hasTrialLeft ? trialUsed + 1 : trialUsed,
        predictionsLimit:     trialLimit,
        predictionsRemaining: Math.max(0, trialLimit - (hasTrialLeft ? trialUsed + 1 : trialUsed)),
        trialExhausted:       !hasTrialLeft,
      }),
    });

  } catch (error) {
    console.error(`[Prediction Error] ${disease}:`, error.message);

    if (error.message.includes("fetch") || error.message.includes("ECONNREFUSED")) {
      return res.status(503).json({
        message: "ML service is temporarily unavailable. Please try again shortly."
      });
    }
    if (error.message.includes("Missing")) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// --- GET /api/predictions/history ---------------------------------------------
export const getPredictionHistory = async (req, res) => {
  const userId = req.body.userId;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const predictions = await Prediction.find({ "userData.email": user.email })
      .sort({ createdAt: -1 });
    return res.status(200).json(predictions);
  } catch (error) {
    console.error("Error fetching history:", error.message);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// --- GET /api/predictions/remaining -------------------------------------------
export const getPredictionsRemaining = async (req, res) => {
  const userId = req.body.userId;
  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const now       = new Date();
    const isPremium = (
      user.subscription === "premium" &&
      user.subscriptionExpiry &&
      user.subscriptionExpiry > now
    );

    if (isPremium) {
      return res.status(200).json({
        tier:               "premium",
        unlimited:          true,
        subscriptionExpiry: user.subscriptionExpiry,
      });
    }

    return res.status(200).json({
      tier:                 "free",
      predictionsUsed:      user.predictionsUsed || 0,
      predictionsLimit:     user.predictionsLimit || 5,
      predictionsRemaining: (user.predictionsLimit || 5) - (user.predictionsUsed || 0),
    });
  } catch (error) {
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// --- POST /api/predictions/savePrediction (legacy) ----------------------------
export const savePrediction = async (req, res) => {
  const { disease, userInputs, predictionResult, probability } = req.body;
  const userId = req.body.userId;

  if (!disease || !userInputs || !predictionResult || typeof probability !== "number") {
    return res.status(400).json({ message: "Incomplete or invalid data" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const newPrediction = new Prediction({
      disease,
      userData: {
        name:   user.name  || "Unknown",
        dob:    user.dob   || "N/A",
        image:  user.image || "",
        email:  user.email || "",
        inputs: userInputs,
      },
      predictionResult,
      probability,
    });

    const saved = await newPrediction.save();
    return res.status(201).json({
      message:      "Prediction saved",
      predictionId: saved._id,
      disease:      saved.disease,
      result:       saved.predictionResult,
      probability:  saved.probability,
    });
  } catch (error) {
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};

// --- GET /api/predictions/verify/:predictionId --------------------------------
export const verifyPrediction = async (req, res) => {
  const { predictionId } = req.params;

  try {
    const prediction = await Prediction.findById(predictionId);
    if (!prediction) {
      return res.status(404).json({ success: false, message: "Prediction not found" });
    }

    // No blockchain data stored yet
    if (!prediction.blockchainTxHash) {
      return res.json({ success: true, verified: false, status: "pending" });
    }

    // ── Recompute hash from CURRENT data in MongoDB ───────────────────────────
    // If someone tampered with the data, this hash will differ from what
    // is stored on the Ethereum blockchain
    const recomputedHash = buildPredictionHash({
      predictionId: prediction._id.toString(),
      userId:       prediction.userData?.email || "",
      disease:      prediction.disease,
      predictionResult: prediction.predictionResult,
      probability:  prediction.probability,
      tier:         prediction.tier,
      createdAt:    prediction.createdAt.toISOString(),
    });

    // ── Compare recomputed hash against what's on Ethereum ───────────────────
    const { verifyPredictionOnChain, getPredictionFromChain } = await import(
      "../services/blockchainService.js"
    );

    const onChain = await verifyPredictionOnChain(
      prediction._id.toString(),
      recomputedHash,
    );

    if (!onChain.valid) {
      // Hash mismatch — data was tampered
      return res.json({
        success: true,
        verified: false,
        tampered: true,
        message: "⚠️ Data mismatch — this prediction may have been tampered with",
        storedHash:      prediction.blockchainHash,
        recomputedHash,
      });
    }

    // Hash matches — data is intact
    const chainData = await getPredictionFromChain(prediction._id.toString());

    return res.json({
      success:     true,
      verified:    true,
      timestamp:   onChain.timestamp,
      txHash:      prediction.blockchainTxHash,
      blockNumber: prediction.blockNumber,
      storedBy:    chainData?.storedBy || null,
      etherscanUrl: `https://sepolia.etherscan.io/tx/${prediction.blockchainTxHash}`,
    });
  } catch (err) {
    console.error("Verify error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};
