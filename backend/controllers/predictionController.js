import Prediction from "../models/predictionModel.js";

// Save user data & prediction result
export const savePrediction = async (req, res) => {
  const { disease, userData, predictionResult, probability } = req.body;

  if (!disease || !userData || !predictionResult || probability == null) {
    return res.status(400).json({ message: "Incomplete data" });
  }

  try {
    const newPrediction = new Prediction({
      disease,
      userData,
      predictionResult,
      probability,
    });

    const savedPrediction = await newPrediction.save();
    res.status(201).json(savedPrediction);
  } catch (error) {
    console.error("Error saving prediction:", error);
    res.status(500).json({ message: "Server error" });
  }
};
