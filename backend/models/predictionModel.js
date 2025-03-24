import mongoose from "mongoose";

const predictionSchema = new mongoose.Schema(
  {
    disease: { type: String, required: true },
    userData: { type: Object, required: true },
    predictionResult: { type: String, required: true },
    probability: { type: Number, required: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Prediction = mongoose.model("Prediction", predictionSchema);

export default Prediction;
