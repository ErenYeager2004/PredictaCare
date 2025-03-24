import { Router } from "express";
import { savePrediction } from "../controllers/predictionController.js";

const predictionRouter = Router(); // ✅ Correctly named router instance

// POST - Save prediction data
predictionRouter.post("/savePrediction", savePrediction); // ✅ Use the correct router name

export default predictionRouter; // ✅ Export the router properly
