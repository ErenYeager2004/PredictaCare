/**
 * blockchainService.js
 * Stores prediction hashes on Sepolia and verifies certificates.
 *
 * Copy to: backend/services/blockchainService.js
 */

import { ethers } from "ethers";
import crypto from "crypto";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load ABI
const ABI = JSON.parse(
  readFileSync(join(__dirname, "../blockchain/PredictaCare.abi.json"), "utf8"),
);

let provider, wallet, contract;

const init = () => {
  if (contract) return; // already initialised

  if (
    !process.env.SEPOLIA_RPC_URL ||
    !process.env.ADMIN_PRIVATE_KEY ||
    !process.env.CONTRACT_ADDRESS
  ) {
    console.warn(
      "⚠️  Blockchain env vars missing — blockchain features disabled",
    );
    return;
  }

  try {
    provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    wallet = new ethers.Wallet(process.env.ADMIN_PRIVATE_KEY, provider);
    contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, wallet);
    console.log("✅ Blockchain service initialised");
  } catch (err) {
    console.error("❌ Blockchain init failed:", err.message);
  }
};

/**
 * Build a deterministic hash from prediction data.
 * Same inputs → same hash → tamper detection.
 */
export const buildPredictionHash = (data) => {
  const payload = JSON.stringify({
    predictionId: data.predictionId,
    userId: data.userId,
    disease: data.disease,
    predictionResult: data.predictionResult,
    probability: data.probability,
    tier: data.tier,
    createdAt: data.createdAt,
  });
  return "0x" + crypto.createHash("sha256").update(payload).digest("hex");
};

/**
 * Store a prediction hash on-chain.
 * Returns { txHash, blockNumber } or null on failure.
 * Never throws — blockchain failure should NOT block the prediction response.
 */
export const storePredictionOnChain = async (predictionId, hashHex) => {
  init();
  if (!contract) return null;

  try {
    const tx = await contract.storePrediction(predictionId, hashHex);
    console.log(`⛓️  Tx sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ On-chain: block ${receipt.blockNumber}, tx ${tx.hash}`);
    return {
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (err) {
    console.error("⚠️  Blockchain store failed (non-fatal):", err.message);
    return null;
  }
};

/**
 * Verify a prediction certificate.
 * Returns { valid, timestamp, txHash }
 */
export const verifyPredictionOnChain = async (predictionId, hashHex) => {
  init();
  if (!contract) return { valid: false, error: "Blockchain not configured" };

  try {
    const [valid, timestamp] = await contract.verifyPrediction(
      predictionId,
      hashHex,
    );
    return {
      valid,
      timestamp: valid
        ? new Date(Number(timestamp) * 1000).toISOString()
        : null,
    };
  } catch (err) {
    console.error("Verify failed:", err.message);
    return { valid: false, error: err.message };
  }
};

/**
 * Get raw record from chain.
 */
export const getPredictionFromChain = async (predictionId) => {
  init();
  if (!contract) return null;

  try {
    const [hash, timestamp, storedBy, exists] =
      await contract.getPrediction(predictionId);
    if (!exists) return null;
    return {
      hash,
      timestamp: new Date(Number(timestamp) * 1000).toISOString(),
      storedBy,
    };
  } catch (err) {
    console.error("Get prediction failed:", err.message);
    return null;
  }
};
