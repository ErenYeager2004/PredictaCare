import express from "express";
import authUser from "../middlewares/authUser.js";
import {
  predict,
  getPredictionHistory,
  getPredictionsRemaining,
  savePrediction,
} from "../controllers/predictionController.js";
import {
  buildPredictionHash,
  verifyPredictionOnChain,
  getPredictionFromChain,
} from "../services/blockchainService.js";
import Prediction from "../models/predictionModel.js";
import mongoose from "mongoose";

const predictionRouter = express.Router();

predictionRouter.post("/predict", authUser, predict);
predictionRouter.get("/history", authUser, getPredictionHistory);
predictionRouter.get("/remaining", authUser, getPredictionsRemaining);
predictionRouter.post("/savePrediction", authUser, savePrediction);

// ── Blockchain verification ────────────────────────────────────────────────
predictionRouter.get("/verify/:predictionId", authUser, async (req, res) => {
  try {
    const { predictionId } = req.params;

    const prediction = await Prediction.findById(predictionId);
    if (!prediction) {
      return res
        .status(404)
        .json({ success: false, message: "Prediction not found" });
    }

    if (!prediction.blockchainTxHash) {
      return res.json({
        success: true,
        verified: false,
        message: "No blockchain record yet — may still be confirming",
      });
    }

    // ── Recompute hash using same fields as when it was originally built ────
    // Must match exactly what predictionController used when storing on chain:
    // userId = MongoDB _id of user (looked up via email)
    const user = await (
      await import("../models/userModel.js")
    ).default.findOne({ email: prediction.userData?.email });
    const userId = user
      ? user._id.toString()
      : prediction.userData?.email || "";

    const recomputedHash = buildPredictionHash({
      predictionId: prediction._id.toString(),
      userId,
      disease: prediction.disease,
      predictionResult: prediction.predictionResult,
      probability: prediction.probability,
      tier: prediction.tier,
      createdAt: prediction.createdAt.toISOString(),
    });

    const onChain = await verifyPredictionOnChain(predictionId, recomputedHash);

    // Hash mismatch — tampered
    if (!onChain.valid) {
      return res.json({
        success: true,
        verified: false,
        tampered: true,
        message:
          "⚠️ Data mismatch — this prediction may have been tampered with",
        storedHash: prediction.blockchainHash,
        recomputedHash,
      });
    }

    // Hash matches — data is intact
    const record = await getPredictionFromChain(predictionId);

    return res.json({
      success: true,
      verified: true,
      timestamp: onChain.timestamp,
      txHash: prediction.blockchainTxHash,
      blockNumber: prediction.blockNumber,
      storedBy: record?.storedBy,
      etherscanUrl: `https://sepolia.etherscan.io/tx/${prediction.blockchainTxHash}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * PATCH — Add public verify endpoint to predictionRoutes.js
 * No auth required — anyone can verify a prediction
 */

// Add this route to predictionRoutes.js:

predictionRouter.get("/public/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;
    let prediction = null;

    // Detect if input is a MongoDB ObjectId or a blockchain hash
    const isObjectId =
      mongoose.Types.ObjectId.isValid(identifier) && identifier.length === 24;
    const isBlockchainHash =
      identifier.startsWith("0x") && identifier.length === 66;

    if (isObjectId) {
      // Search by prediction ID
      prediction = await Prediction.findById(identifier).select(
        "-userData.name -userData.email -userData.image",
      );
    } else if (isBlockchainHash) {
      // Search by blockchain hash
      prediction = await Prediction.findOne({
        blockchainHash: identifier,
      }).select("-userData.name -userData.email -userData.image");
    } else {
      return res.status(400).json({
        success: false,
        message:
          "Invalid input. Please enter a valid Prediction ID (24 characters) or Blockchain Hash (0x... 66 characters).",
      });
    }

    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: isBlockchainHash
          ? "No prediction found with this blockchain hash."
          : "Prediction not found. Please check the ID and try again.",
      });
    }

    return res.json({
      success: true,
      prediction: {
        _id: prediction._id,
        disease: prediction.disease,
        predictionResult: prediction.predictionResult,
        probability: prediction.probability,
        tier: prediction.tier,
        isBeta: prediction.isBeta,
        blockchainHash: prediction.blockchainHash,
        blockchainTxHash: prediction.blockchainTxHash,
        blockNumber: prediction.blockNumber,
        createdAt: prediction.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default predictionRouter;
