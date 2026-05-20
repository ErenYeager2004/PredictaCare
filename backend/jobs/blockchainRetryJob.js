import cron from "node-cron";
import PendingBlockchain from "../models/pendingBlockchainModel.js";
import Prediction from "../models/predictionModel.js";
import { storePredictionOnChain } from "../services/blockchainService.js";

const MAX_ATTEMPTS = 5;

const runRetryJob = async () => {
  try {
    const pending = await PendingBlockchain.find({
      permanentlyFailed: false,
      attempts: { $lt: MAX_ATTEMPTS },
    });

    if (!pending.length) return;

    console.log(
      `[BlockchainRetry] Processing ${pending.length} pending record(s)...`,
    );

    for (const record of pending) {
      try {
        const onChain = await storePredictionOnChain(
          record.predictionId,
          record.hashHex,
        );

        if (onChain) {
          // Success — update the prediction and remove from queue
          await Prediction.findByIdAndUpdate(record.predictionId, {
            blockchainTxHash: onChain.txHash,
            blockchainHash: record.hashHex,
            blockNumber: onChain.blockNumber,
          });

          await PendingBlockchain.deleteOne({ _id: record._id });
          console.log(`[BlockchainRetry] Success: ${record.predictionId}`);
        } else {
          throw new Error("storePredictionOnChain returned null");
        }
      } catch (err) {
        const newAttempts = record.attempts + 1;
        const permanentlyFailed = newAttempts >= MAX_ATTEMPTS;

        await PendingBlockchain.findByIdAndUpdate(record._id, {
          attempts: newAttempts,
          lastAttempt: new Date(),
          lastError: err.message,
          permanentlyFailed,
        });

        if (permanentlyFailed) {
          // Log for admin monitoring — in production send to Sentry / Slack
          console.error(
            `[BlockchainRetry] PERMANENTLY FAILED after ${MAX_ATTEMPTS} attempts: ${record.predictionId}`,
          );
          // TODO: Send admin alert email / Slack notification here
        } else {
          console.warn(
            `[BlockchainRetry] Attempt ${newAttempts}/${MAX_ATTEMPTS} failed for ${record.predictionId}: ${err.message}`,
          );
        }
      }
    }
  } catch (err) {
    console.error("[BlockchainRetry] Job error:", err.message);
  }
};

// Run every 5 minutes
cron.schedule("*/5 * * * *", runRetryJob);

console.log("[BlockchainRetry] Retry job scheduled (every 5 minutes)");

export { runRetryJob };
