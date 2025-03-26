import Prediction from "../models/predictionModel.js";
import User from "../models/userModel.js";

// Save user data & prediction result with full user details and inputs
export const savePrediction = async (req, res) => {
  const { disease, userId, userInputs, predictionResult, probability } = req.body;

  // Ensure all required data is present and valid
  if (!disease || !userId || !userInputs || !predictionResult || typeof probability !== "number") {
    return res.status(400).json({ message: "Incomplete or invalid data provided" });
  }

  try {
    // Fetch user details from the database
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Ensure user data is complete
    const userData = {
      name: user.name || "Unknown User",
      dob: user.dob || "N/A",
      image: user.image || "defaultUserImagePath",
      email: user.email || "No Email Provided",
      inputs: userInputs, // Store the prediction form inputs
    };

    // Optional: Prevent duplicate predictions for the same disease/user
    // const existingPrediction = await Prediction.findOne({
    //   "userData.email": userData.email,
    //   disease,
    // });

    // if (existingPrediction) {
    //   return res.status(409).json({ message: "Prediction for this disease already exists" });
    // }

    // Create a new prediction entry with enhanced user data
    const newPrediction = new Prediction({
      disease,
      userData,
      predictionResult,
      probability,
    });

    const savedPrediction = await newPrediction.save();
    res.status(201).json({
      message: "Prediction saved successfully",
      predictionId: savedPrediction._id,
      disease: savedPrediction.disease,
      result: savedPrediction.predictionResult,
      probability: savedPrediction.probability,
    });
  } catch (error) {
    console.error("Error saving prediction:", error.message);
    res.status(500).json({ message: `Server error: ${error.message}` });
  }
};
