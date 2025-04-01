// ✅ Import dependencies
import express from "express";
import cors from "cors";
import "dotenv/config";
import axios from "axios";
import morgan from "morgan";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import connectDB from "./config/mongodb.js";
import connectCloudinary from "./config/cloudinary.js";
import adminRouter from "./routes/adminRoute.js";
import doctorRouter from "./routes/doctorRoute.js";
import userRouter from "./routes/userRoute.js";
import predictionRouter from "./routes/predictionRoutes.js"
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
app.use(morgan("dev")); // Logs requests (GET, POST, etc.)
app.use(helmet()); // Adds security headers to responses

// ✅ CORS Configuration
const allowedOrigins = ["http://localhost:5173", "http://localhost:5174"];

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

// ✅ Rate Limiter to prevent abuse (100 requests per 15 minutes)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 500, // Limit each IP to 100 requests
  message: "❗Too many requests from this IP, please try again later.",
});
app.use(limiter);

// ✅ Handle Preflight Requests (CORS)
app.options("*", cors());

// ✅ Routes
app.use("/api/admin", adminRouter);
app.use("/api/doctor", doctorRouter);
app.use("/api/user", userRouter);
app.use("/api/predictions", predictionRouter);

// Error Middleware
app.use(errorHandler);

// ✅ Proxy: Forward prediction requests to Flask backend
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

// ✅ Health Check Route
app.get("/", (req, res) => {
  res.status(200).json({ message: "✅ API is running smoothly!" });
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error("❗ Global Error:", err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// ✅ Start Server
app.listen(port, () =>
  console.log(`🚀 Server running at: http://localhost:${port}`)
);
