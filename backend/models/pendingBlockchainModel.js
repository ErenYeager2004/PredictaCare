import mongoose from "mongoose";

const pendingBlockchainSchema = new mongoose.Schema(
  {
    predictionId: { type: String, required: true, unique: true },
    hashHex: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    lastAttempt: { type: Date, default: null },
    lastError: { type: String, default: null },
    permanentlyFailed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model("PendingBlockchain", pendingBlockchainSchema);
