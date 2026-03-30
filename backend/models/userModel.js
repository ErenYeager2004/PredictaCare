import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // ─── Core ──────────────────────────────────────────────────────────────
    name:     { type: String, required: true },
    email:    { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image:    { type: String, default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png" },
    address:  { type: Object, default: { line1: "", line2: "" } },
    gender:   { type: String, default: "Not Selected" },
    dob:      { type: String, default: "Not Selected" },
    phone:    { type: String, default: "0000000000" },

    // ─── Research consent ──────────────────────────────────────────────────
    // User opted in to share anonymised prediction data with researchers
    dataConsent: { type: Boolean, default: false },

    // ─── Subscription ──────────────────────────────────────────────────────
    subscription: {
      type:    String,
      enum:    ["free", "premium"],
      default: "free",
    },
    subscriptionExpiry: { type: Date, default: null },

    // ─── Prediction Tracking ───────────────────────────────────────────────
    predictionsUsed:     { type: Number, default: 0 },
    predictionsLimit:    { type: Number, default: 5 },
    lastPredictionReset: { type: Date,   default: null },
  },
  { timestamps: true }
);

const userModel = mongoose.models.user || mongoose.model("user", userSchema);
export default userModel;
