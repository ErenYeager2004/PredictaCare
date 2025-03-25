import mongoose from "mongoose";

const predictionSchema = new mongoose.Schema(
  {
    disease: { type: String, required: true },
    userData: { type: Object, required: true },
    predictionResult: { type: String, required: true },
    probability: { type: Number, required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "doctor", default: null }, // Assigned doctor
    status: { 
      type: String, 
      enum: ["pending", "reviewing", "approved", "rejected"], 
      default: "pending" 
    }, // Review Status
    reviewedBy: { type: String, default: null }, // Stores doctor's name after review
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Prediction = mongoose.model("Prediction", predictionSchema);
export default Prediction;