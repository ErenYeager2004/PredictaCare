// ✅ Import dependencies
import express from "express";
import cors from "cors";
import "dotenv/config";
import Groq from "groq-sdk";
import axios from "axios";
import morgan from "morgan";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import adminRouter from "./routes/adminRoute.js";
import doctorRouter from "./routes/doctorRoute.js";
import userRouter from "./routes/userRoute.js";
import { razorpayWebhook } from "./controllers/userController.js";
import predictionRouter from "./routes/predictionRoutes.js";
import { errorHandler } from "./middlewares/errorMiddleware.js";

// ✅ Initialize app
const app = express();
const port = process.env.PORT || 4000;

// ✅ Resolve __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Connect to MongoDB and Cloudinary
connectDB();
connectCloudinary();

// ✅ Razorpay webhook (raw body required)
app.post(
  "/api/payment/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhook
);

// ✅ Middleware
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(helmet());

// ✅ CORS
const allowedOrigins = [
  "http://localhost:5173",
  "https://your-frontend.onrender.com",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "token",
      "atoken",
      "dtoken",
    ],
    credentials: true,
  })
);

// ✅ Helmet CSP
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "https://checkout.razorpay.com",
        "https://rzp.io",
      ],
      frameSrc: [
        "'self'",
        "https://api.razorpay.com",
        "https://rzp.io",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https://res.cloudinary.com",
      ],
      connectSrc: [
        "'self'",
        "https://api.razorpay.com",
        "https://lumberjack.razorpay.com",
        "https://prediction-model-ydf5.onrender.com",
        "https://predictacare-1.onrender.com",
        "https://generativelanguage.googleapis.com",
      ],
    },
  })
);

// ✅ Rate Limiting
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: "❗ Too many requests from this IP, please try again later.",
  })
);

// ✅ Handle OPTIONS
app.options("*", cors());

/// ====================== 🤖 CHATBOT API (Gemini v1) ======================
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `
You are PredictaCare AI, an intelligent healthcare assistant for the PredictaCare platform.

================ CORE RULES (STRICT) ================

1. You must ONLY answer:
   - Healthcare, medical, wellness, disease-related questions
   - PredictaCare website usage, features, or navigation questions

2. If the user greets (hi, hello, hey, good morning, etc.):
   - Respond politely
   - Ask if they need help with healthcare or PredictaCare services

3. If the user asks something NOT related to healthcare or PredictaCare
   (sports, coding, movies, politics, general knowledge, etc.):
   - Reply EXACTLY:
     "I can only assist with healthcare and PredictaCare-related questions."

4. If the question is unclear or you do not know the answer:
   - Reply EXACTLY:
     "For further information, please contact genzCoders@gmail.com"

5. You must NOT provide:
   - Medical diagnosis
   - Prescriptions
   - Medication names
   - Dosage instructions

6. Keep answers short, clear, and under 4 sentences unless steps are required.

================ HIGHLIGHTING RULES ==================

- When giving healthcare advice or suggestions:
  - Highlight important points using **bold text**
  - Use bullet points when helpful
- You may highlight:
  • Important lifestyle advice
  • Preventive measures
  • Warning signs
  • When to consult a doctor
- DO NOT highlight medications or diagnoses

================ ABOUT PREDICTACARE ==================

PredictaCare is a healthcare prediction platform where users can:

- Predict risk for 4 diseases:
  1. Heart Disease
  2. Stroke
  3. PCOS
  4. Diabetes

- Use services such as:
  - User signup and login
  - Disease risk prediction
  - Secure medical data storage using blockchain
  - Health report generation and download
  - Viewing prediction history
  - Online doctor consultation
  - AI medical chatbot support

================ WEBSITE GUIDANCE RULES ==============

- When asked about the website:
  - Guide users step-by-step
  - Use simple and clear language
  - Do NOT invent features

- Disease prediction steps:
  1. Go to Disease Prediction
  2. Select the disease
  3. Enter health details
  4. Click Predict
  5. View risk result

================ SAFETY NOTE =========================

- Predictions are for early risk detection only
- Always recommend consulting a doctor for medical decisions
`
        },
        {
          role: "user",
          content: message
        },
      ],
      temperature: 0.3,
    });

    res.json({
      reply: completion.choices[0].message.content
    });

  } catch (error) {
    console.error("❌ GROQ ERROR:", error);
    res.status(500).json({ error: "AI service failed" });
  }
});



// ====================================================================


// ✅ API Routes
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/user", userRouter);
app.use("/api/predictions", predictionRouter);

// ✅ Proxy to Python Flask for disease predictions
app.post("/api/predict/:disease", async (req, res) => {
  try {
    const { disease } = req.params;
    const flaskURL = `https://prediction-model-ydf5.onrender.com/predict/${disease}`;

    const response = await axios.post(flaskURL, req.body, {
      headers: { "Content-Type": "application/json" },
    });

    res.json(response.data);
  } catch (error) {
    console.error("🔴 Error connecting to Flask backend:", error.message);
    res.status(500).json({ error: "Failed to connect to prediction service" });
  }
});

// ✅ Health Check
app.get("/health", (req, res) => {
  res.status(200).json({ message: "✅ API is running smoothly!" });
});

// ✅ Serve React Frontend (User)
app.use(express.static(path.join(__dirname, "../frontend/dist")));
app.use(
  "/assets",
  express.static(path.join(__dirname, "../frontend/dist/assets"))
);

// ✅ Serve React Admin Panel
app.use(
  "/admin/assets",
  express.static(path.join(__dirname, "../admin/dist/assets"))
);
app.use("/admin", express.static(path.join(__dirname, "../admin/dist")));

// ✅ React Router fallback
app.get("/admin/*", (req, res) => {
  res.sendFile(path.join(__dirname, "../admin/dist/index.html"));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});

// ✅ Global Error Middleware
app.use(errorHandler);

// ✅ Final fallback
app.use((err, req, res, next) => {
  console.error("❗ Global Error:", err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// ✅ Start Server
app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
