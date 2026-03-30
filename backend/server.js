import express from "express";
import cors from "cors";
import "dotenv/config";
import Groq from "groq-sdk";
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
import researchRouter from "./routes/researchRoutes.js";
import { errorHandler } from "./middlewares/errorMiddleware.js";

const app = express();
const port = process.env.PORT || 4000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Connect DB & Cloudinary ──────────────────────────────────────────────────
connectDB();
connectCloudinary();

// ─── Allowed Origins ──────────────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://predictacare-1.onrender.com",
];

// ─── CORS — must be first ─────────────────────────────────────────────────────
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "token", "atoken", "dtoken"],
  credentials: true,
}));
app.options("*", cors());

// ─── Razorpay Webhook — needs raw body, must be before express.json() ─────────
app.post(
  "/api/payment/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhook
);

// ─── Body Parsers ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(morgan("dev"));

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "https://checkout.razorpay.com", "https://rzp.io"],
      frameSrc:    ["'self'", "https://api.razorpay.com", "https://rzp.io"],
      imgSrc:      ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc:  [
        "'self'",
        "https://api.razorpay.com",
        "https://lumberjack.razorpay.com",
        "https://predictacare-1.onrender.com",
        "http://localhost:5000",
      ],
    },
  })
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max:      500,
    message:  "Too many requests from this IP, please try again later.",
  })
);

// ─── Chatbot ──────────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const completion = await groq.chat.completions.create({
      model:       "llama-3.3-70b-versatile",
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
  - Online doctor consultation
  - AI medical chatbot support

================ WEBSITE GUIDANCE RULES ==============

- When asked about the website:
  - Guide users step-by-step
  - Use simple and clear language
  - Do NOT invent features

- Disease prediction steps:
  1. Create an account or login to your existing account
  2. Go to your profile and navigate to DiagnoAI
  3. Select disease from the dropdown according to you
  4. Fill up the questions asked to make a prediction
  5. Click on Predict, and wait to get a prediction
  6. You can see your prediction on the right hand side with risk percentage
  7. After prediction you will get a personalized AI-suggestion button

================ SAFETY NOTE =========================

- Predictions are for early risk detection only
- Always recommend consulting a doctor for medical decisions
- You can book a doctor appointment through our website
`,
        },
        {
          role:    "user",
          content: message,
        },
      ],
    });

    res.json({ reply: completion.choices[0].message.content });

  } catch (error) {
    console.error("GROQ ERROR:", error);
    res.status(500).json({ error: "AI service failed" });
  }
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/admin",       adminRouter);
app.use("/api/doctor",      doctorRouter);
app.use("/api/user",        userRouter);
app.use("/api/predictions", predictionRouter);
app.use("/api/research", researchRouter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({ message: "API is running" });
});

// ─── Production Static Files ──────────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.use("/assets", express.static(path.join(__dirname, "../frontend/dist/assets")));
  app.use("/admin/assets", express.static(path.join(__dirname, "../admin/dist/assets")));
  app.use("/admin", express.static(path.join(__dirname, "../admin/dist")));

  app.get("/admin/*", (req, res) => {
    res.sendFile(path.join(__dirname, "../admin/dist/index.html"));
  });
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  });
}

// ─── Error Handlers ───────────────────────────────────────────────────────────
app.use(errorHandler);

app.use((err, req, res, next) => {
  console.error("Global Error:", err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${port}`);
});
