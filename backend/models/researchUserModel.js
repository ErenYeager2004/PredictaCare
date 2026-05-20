/**
 * researchUserModel.js
 * Copy to: backend/models/researchUserModel.js
 */

import mongoose from "mongoose";

const researchUserSchema = new mongoose.Schema({
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  password:     { type: String, required: true },
  institution:  { type: String, required: true },
  researchArea: { type: String, default: "" },
  avatar:       { type: String, default: null },
  verified:     { type: Boolean, default: false },
  totalPurchases:{ type: Number, default: 0 },
  totalSpent:   { type: Number, default: 0 }, // in paise
}, { timestamps: true });

export default mongoose.model("ResearchUser", researchUserSchema);
