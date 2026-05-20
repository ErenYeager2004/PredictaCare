import express from "express";
import { generateAISuggestions } from "../controllers/aiSuggestionController.js";

const router = express.Router();

router.post("/", generateAISuggestions);

export default router;
