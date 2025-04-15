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

// ✅ Initialize app and port
const app = express();
const port = process.env.PORT || 4000;

// ✅ Connect to MongoDB and Cloudinary
connectDB();
connectCloudinary();

// ✅ Middleware Setup
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));
app.use(helmet());

// ✅ CORS Configuration
const allowedOrigins = [
  "http://localhost:5173", // React frontend development URL
  "http://localhost:5174", // Admin panel development URL
  "http://127.0.0.1:5000", // Flask backend URL for prediction
  "http://localhost:4000", // Node backend
  "*", // For development (be cautious in production)
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("❌ CORS not allowed for this origin"));
      }
    },
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

// ✅ Content Security Policy (CSP)
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
        "http://127.0.0.1:4000",
      ],
    },
  })
);

// ✅ Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: "❗ Too many requests from this IP, please try again later.",
});
app.use(limiter);

// ✅ Handle Preflight requests
app.options("*", cors());

// ✅ API Routes
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/user", userRouter);
app.use("/api/predictions", predictionRouter);

// ✅ Proxy prediction requests to Flask backend
app.post("/api/predict/:disease", async (req, res) => {
  try {
    const { disease } = req.params;
    const pythonBackendURL = `http://127.0.0.1:5000/predict/${disease}`;

    const response = await axios.post(pythonBackendURL, req.body, {
      headers: { "Content-Type": "application/json" },
    });

    res.json(response.data);
  } catch (error) {
    console.error("🔴 Error connecting to Python backend:", error.message);
    res.status(500).json({ error: "Failed to connect to prediction service" });
  }
});

// ✅ Health Check
app.get("/health", (req, res) => {
  res.status(200).json({ message: "✅ API is running smoothly!" });
});

// ✅ Serve React Frontends
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve the user frontend (React)
app.use(express.static(path.join(__dirname, "../frontend/dist")));

// Serve the admin panel at /admin
app.use("/admin", express.static(path.join(__dirname, "../admin/dist")));
app.use("/assets", express.static(path.join(__dirname, "../admin/dist/assets")));

// ✅ Catch-all handler for React frontend routing
app.get("*", (req, res) => {
  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/admin") ||
    req.path.startsWith("/assets")
  ) {
    res.status(404).json({ error: "Not Found" });
  } else {
    res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
  }
});

// ✅ Global Error Middleware
app.use(errorHandler);

// ✅ Fallback Error Handler
app.use((err, req, res, next) => {
  console.error("❗ Global Error:", err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// ✅ Start Server
app.listen(port, "0.0.0.0", () =>
  console.log(`🚀 Server running at: http://localhost:${port}`)
);
