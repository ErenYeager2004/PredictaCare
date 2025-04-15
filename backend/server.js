// ✅ Import dependencies
import express from "express";
import cors from "cors";
import "dotenv/config";
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

// ✅ Middleware
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(helmet());

// ✅ CORS
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin.includes("onrender.com") || origin.startsWith("http://localhost")) {
        callback(null, true);
      } else {
        callback(new Error("❌ CORS not allowed for this origin"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "token", "atoken", "dtoken"],
    credentials: true,
  })
);

// ✅ Helmet CSP
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://checkout.razorpay.com"],
      frameSrc: ["'self'", "https://api.razorpay.com"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
      connectSrc: [
        "'self'",
        "http://127.0.0.1:5000",
        "https://predictacare-1.onrender.com",
        "https://lumberjack.razorpay.com", // ✅ for Razorpay analytics
        "https://generativelanguage.googleapis.com", // ✅ for Gemini API
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

// ✅ API Routes
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/user", userRouter);
app.use("/api/predictions", predictionRouter);

// ✅ Proxy to Python Flask for disease predictions
app.post("/api/predict/:disease", async (req, res) => {
  try {
    const { disease } = req.params;
    const flaskURL = `https://prediction-model-ydf5.onrender.com/predict/${disease}`; // Change to Render Flask URL in production

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
app.use("/assets", express.static(path.join(__dirname, "../frontend/dist/assets")));

// ✅ Serve React Admin Panel
app.use("/admin/assets", express.static(path.join(__dirname, "../admin/dist/assets")));
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
