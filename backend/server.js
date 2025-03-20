import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import axios from 'axios';
import connectDB from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';
import adminRouter from './routes/adminRoute.js';
import doctorRouter from './routes/doctorRoute.js';
import userRouter from './routes/userRoute.js';

const app = express();
const port = process.env.PORT || 4000;

// Connect to database and cloud services
connectDB();
connectCloudinary();

// Middleware
app.use(express.json());

// ✅ Improved CORS Configuration
const allowedOrigins = ["http://localhost:5173", "http://localhost:5174"];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("CORS not allowed for this origin"));
        }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization", "token", "atoken", "dtoken"], // ✅ Added "atoken" & "dtoken"
    credentials: true // Enable cookies/auth headers
}));

// ✅ Handle Preflight Requests
app.options('*', cors());

// Routes
app.use('/api/admin', adminRouter);
app.use('/api/doctor', doctorRouter);
app.use('/api/user', userRouter);

// Python Backend Proxy
app.post('/api/predict/:disease', async (req, res) => {
    try {
        const { disease } = req.params;
        const pythonBackendURL = `http://127.0.0.1:5000/predict/${disease}`;

        const response = await axios.post(pythonBackendURL, req.body, {
            headers: { "Content-Type": "application/json" }
        });

        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Root Route
app.get('/', (req, res) => {
    res.send('API WORKING');
});

// Start Server
app.listen(port, () => console.log(`🚀 Server Started on Port ${port}`));
