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
import consultationRouter from "./routes/consultationRoutes.js";
import researchHubRouter from "./routes/researchHubRoutes.js";

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
  }),
);
app.options("*", cors());

// ─── Razorpay Webhook — needs raw body, must be before express.json() ─────────
app.post(
  "/api/payment/webhook",
  express.raw({ type: "application/json" }),
  razorpayWebhook,
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
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-eval'",
        "https://checkout.razorpay.com",
        "https://rzp.io",
        "https://cdn.razorpay.com",
      ],
      frameSrc: [
        "'self'",
        "'unsafe-eval'",
        "https://api.razorpay.com",
        "https://rzp.io",
      ],
      imgSrc: [
        "'self'",
        "blob:",
        "data:",
        "https://cdn.pixabay.com",
        "https://res.cloudinary.com",
        "https://cdn.razorpay.com",
      ],
      connectSrc: [
        "'self'",
        "https://api.razorpay.com",
        "https://lumberjack.razorpay.com",
        "https://predictacare-1.onrender.com",
        "https://eth-sepolia.g.alchemy.com", // ← Alchemy RPC
        "wss://eth-sepolia.g.alchemy.com", // ← WebSocket
        "http://localhost:5000",
        "https://prediction-model-ydf5.onrender.com",
        "https://cdn.razorpay.com",
      ],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      workerSrc: ["'self'", "blob:"], // ← needed by ethers.js
    },
  }),
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: "Too many requests from this IP, please try again later.",
  }),
);

// ─── Chatbot ──────────────────────────────────────────────────────────────────
// ─── Chatbot ──────────────────────────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
app.post("/api/chat", async (req, res) => {
  try {

    const { message, history = [] } = req.body;

    // --------------------------------------------------
    // Validation
    // --------------------------------------------------

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message is required",
      });
    }

    // --------------------------------------------------
    // Retrieve RAG Context
    // --------------------------------------------------

    let ragContext = "";

    try {

      const ragRes = await fetch(
        "http://localhost:5001/retrieve",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            query: message,
          }),
        }
      );

      const ragData = await ragRes.json();

      ragContext = ragData.context || "";

      console.log("\n===== RAG CONTEXT =====\n");
      console.log(ragContext);
      console.log("\n=======================\n");

      console.log("[RAG] Context retrieved.");

    } catch (ragError) {

      console.warn(
        "[RAG ERROR]",
        ragError.message
      );
    }

    // --------------------------------------------------
    // System Prompt
    // --------------------------------------------------

    const SYSTEM_PROMPT = `
You are PredictaCare AI Assistant.

You help users understand:
- diabetes
- PCOS
- heart disease
- stroke
- preventive healthcare
- healthy lifestyle practices
- PredictaCare platform features

RULES:
- Use the provided knowledge base context
- Answer accurately and concisely
- If the answer is not found in the context,
  say you do not know
- Never hallucinate information
- Never provide diagnoses
- Never prescribe medications
- Never replace professional medical advice
- Encourage users to consult doctors for
  medical concerns

You MUST prioritize the retrieved
knowledge base context when answering.
`;

    // --------------------------------------------------
    // Enhanced Prompt with RAG
    // --------------------------------------------------

    const systemWithContext = `
${SYSTEM_PROMPT}

================ KNOWLEDGE BASE ================

${ragContext}

================================================
`;

    // --------------------------------------------------
    // Build Messages
    // --------------------------------------------------

    const messages = [
      {
        role: "system",
        content: systemWithContext,
      },

      ...history.slice(-10),

      {
        role: "user",
        content: message,
      },
    ];

    // --------------------------------------------------
    // Groq Completion
    // --------------------------------------------------

    const completion =
      await groq.chat.completions.create({

        model: "llama-3.3-70b-versatile",

        temperature: 0.3,

        max_tokens: 1024,

        messages,
      });

    const reply =
      completion?.choices?.[0]?.message?.content
      || "No response generated.";

    // --------------------------------------------------
    // Response
    // --------------------------------------------------

    return res.json({
      success: true,
      reply,
      ragUsed: !!ragContext,

      // TEMP DEBUG
      ragContext,
    });

  } catch (error) {

    console.error(
      "\n[CHAT API ERROR]\n",
      error
    );

    return res.status(500).json({
      success: false,
      error: "AI service failed",
    });
  }
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/user", userRouter);
app.use("/api/predictions", predictionRouter);
app.use("/api/research", researchRouter);
app.use("/api/consultations", consultationRouter);
app.use("/api/research-hub", researchHubRouter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.status(200).json({ message: "API is running" });
});

// ─── Production Static Files ──────────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.use(
    "/assets",
    express.static(path.join(__dirname, "../frontend/dist/assets")),
  );
  app.use(
    "/admin/assets",
    express.static(path.join(__dirname, "../admin/dist/assets")),
  );
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
