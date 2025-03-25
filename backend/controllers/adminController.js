import validator from "validator";
import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";
import userModel from "../models/userModel.js";
import Prediction from "../models/predictionModel.js";
const addDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      speciality,
      degree,
      experience,
      about,
      fees,
      address,
    } = req.body;
    const imageFile = req.file;

    if (
      !name ||
      !email ||
      !password ||
      !speciality ||
      !degree ||
      !experience ||
      !about ||
      !fees ||
      !address
    ) {
      return res.json({ success: false, message: "Missing Details" });
    }

    if (!validator.isEmail(email)) {
      return res.json({
        success: false,
        message: "Please enter a valid email",
      });
    }

    if (password.length < 8) {
      return res.json({
        success: false,
        message: "Please enter a strong password",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
      resource_type: "image",
    });
    const imageUrl = imageUpload.secure_url;

    const doctorData = {
      name,
      email,
      image: imageUrl,
      password: hashedPassword,
      speciality,
      degree,
      experience,
      about,
      fees,
      address: JSON.parse(address),
      date: Date.now(),
    };

    const newDoctor = new doctorModel(doctorData);
    await newDoctor.save();

    res.json({ success: true, message: "Doctor Added" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = jwt.sign(email + password, process.env.JWT_SECRET);
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: "Invalid Credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get all doctors list for admin panel
const allDoctors = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select("-password");
    res.json({ success: true, doctors });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// api to get all-appointmet list

const appointmentsAdmin = async (req, res) => {
  try {
    const appointments = await appointmentModel.find({});
    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// api to cancel appointment from admin
const cancelAppointmentAdmin = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId);

    await appointmentModel.findByIdAndUpdate(appointmentId, {
      cancelled: true,
    });
    // releasing doctor slot

    const { docId, slotDate, slotTime } = appointmentData;
    const doctorData = await doctorModel.findById(docId);
    let slots_booked = doctorData.slots_booked;

    slots_booked[slotDate] = slots_booked[slotDate].filter(
      (e) => e !== slotTime
    );
    await doctorModel.findByIdAndUpdate(docId, { slots_booked });

    res.json({ success: true, message: "Appointment Cancelled" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// api to get dashboard data for admin pannel

const adminDashboard = async (req, res) => {
  try {
    const doctors = await doctorModel.find({});
    const users = await userModel.find({});
    const appointments = await appointmentModel.find({});

    const dashData = {
      doctors: doctors.length,
      appointments: appointments.length,
      patients: users.length,
      latestAppointments: appointments.reverse().slice(0, 5),
    };

    res.json({ success: true, dashData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// ✅ Fetch all predictions
const getPredictions = async (req, res) => {
  try {
    const predictions = await Prediction.find({});
    res.json({ success: true, predictions });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Assign doctor and update review status
const sendForReview = async (req, res) => {
  try {
    const { doctorId } = req.body;
    const { predictionId } = req.params;

    console.log("Received predictionId:", predictionId);
    console.log("Received doctorId:", doctorId);

    // Check if the IDs are coming in
    if (!doctorId || !predictionId) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Doctor ID and Prediction ID are required.",
        });
    }

    // Find the prediction
    const prediction = await Prediction.findById(predictionId);

    if (!prediction) {
      console.error("❌ Prediction not found for ID:", predictionId);
      return res
        .status(404)
        .json({ success: false, message: "Prediction not found." });
    }

    // Assign doctor and update status
    prediction.doctorId = doctorId;
    prediction.status = "reviewing";

    await prediction.save();

    console.log("✅ Prediction updated:", prediction);

    res
      .status(200)
      .json({
        success: true,
        message: "Doctor assigned and prediction sent for review.",
      });
  } catch (error) {
    console.error("🚨 Backend error:", error.message || error);
    res
      .status(500)
      .json({ success: false, message: `Server error: ${error.message}` });
  }
};

const assignDoctorAndReview = async (req, res) => {
  const { predictionId, doctorId } = req.body;

  if (!predictionId || !doctorId) {
    return res.status(400).json({ error: "Missing prediction or doctor ID" });
  }

  try {
    const updatedPrediction = await Prediction.findByIdAndUpdate(
      predictionId,
      { doctorId, status: "reviewing" },
      { new: true }
    );

    if (!updatedPrediction) {
      return res.status(404).json({ error: "Prediction not found" });
    }

    res.status(200).json(updatedPrediction);
  } catch (error) {
    console.error("Error assigning doctor:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export {
  addDoctor,
  loginAdmin,
  allDoctors,
  appointmentsAdmin,
  cancelAppointmentAdmin,
  adminDashboard,
  getPredictions,
  sendForReview,
  assignDoctorAndReview,
};
