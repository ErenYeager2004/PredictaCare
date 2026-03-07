import Prediction from "../models/predictionModel.js";
import doctorModel from "../models/doctorModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";
import { json } from "express";

// ✅ Fetch only assigned cases for the doctor
const getAssignedReviews = async (req, res) => {
  try {
    const doctorId = req.body.docId;
    if (!doctorId) {
      return res
        .status(401)
        .json({ success: false, message: "Not Authorized. Login Again." });
    }

    // ✅ Fetch only "pending" predictions
    const predictions = await Prediction.find({
      doctorId,
      status: "reviewing",
    }).sort({ date: -1 });

    res.json({ success: true, predictions });
  } catch (error) {
    console.error("Error fetching assigned cases:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ✅ Approve/Reject prediction
const reviewPrediction = async (req, res) => {
  try {
    const doctorId = req.body.docId;
    const { predictionId } = req.params;
    const { status } = req.body;

    if (!doctorId) {
      return res
        .status(401)
        .json({ success: false, message: "Not Authorized. Login Again." });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status." });
    }

    const prediction = await Prediction.findOne({
      _id: predictionId,
      doctorId,
    });
    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: "Prediction not found or not assigned to you.",
      });
    }

    const doctor = await doctorModel.findById(doctorId);
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found." });
    }

    prediction.status = status;
    prediction.reviewedBy = doctor.name;
    await prediction.save();

    res.json({ success: true, message: `Prediction ${status}.` });
  } catch (error) {
    console.error("Error reviewing prediction:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

const changeAvailablity = async (req, res) => {
  try {
    const { docId } = req.body;

    const docData = await doctorModel.findById(docId);
    await doctorModel.findByIdAndUpdate(docId, {
      available: !docData.available,
    });
    res.json({ success: true, message: "Availablity Changed" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "An internal error occurred" });
  }
};

const doctorList = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select(["-password", "-email"]);
    res.json({ success: true, doctors });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "An internal error occurred" });
  }
};

// api for doc login

const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;
    const doctor = await doctorModel.findOne({ email });

    if (!doctor)
      return res.json({ success: false, message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, doctor.password);
    if (!isMatch)
      return res.json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: doctor._id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });
    const refreshTokenDoc = jwt.sign(
      { id: doctor._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );

    res.cookie("doctorRefreshToken", refreshTokenDoc, {
      // ← different cookie name!
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, token });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "An internal error occurred" });
  }
};

//api for get doc appointments for doc panel

const appointmentsDoctor = async (req, res) => {
  try {
    const { docId } = req.body;

    const appointments = await appointmentModel.find({ docId });
    res.json({ success: true, appointments });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "An internal error occurred" });
  }
};

//api to mark appointment completed

const appointmentComplete = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId);
    if (appointmentData && appointmentData.docId === docId) {
      await appointmentModel.findByIdAndUpdate(appointmentId, {
        isCompleted: true,
      });
      return res.json({ success: true, message: "Appointment Completed" });
    } else {
      return res.json({ success: false, message: "Mark Failed" });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "An internal error occurred" });
  }
};

const appointmentCancel = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId);
    if (appointmentData && appointmentData.docId === docId) {
      await appointmentModel.findByIdAndUpdate(appointmentId, {
        cancelled: true,
      });
      return res.json({ success: true, message: "Appointment Cancelled" });
    } else {
      return res.json({ success: false, message: "cancellation Failed" });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "An internal error occurred" });
  }
};

// api to get dashboard data for doc

const doctorDashboard = async (req, res) => {
  try {
    const { docId } = req.body;
    const appointments = await appointmentModel.find({ docId });

    let earnings = 0;
    appointments.map((item) => {
      if (item.isCompleted || item.payment) {
        earnings += item.amount;
      }
    });

    let patients = [];
    appointments.map((item) => {
      if (!patients.includes(item.userId)) {
        patients.push(item.userId);
      }
    });

    const dashData = {
      earnings,
      appointments: appointments.length,
      patients: patients.length,
      latestAppointments: appointments.reverse().slice(0, 5),
    };
    res.json({ success: true, dashData });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "An internal error occurred" });
  }
};

// api to get doc profile

const docProfile = async (req, res) => {
  try {
    const { docId } = req.body;
    const profileData = await doctorModel.findById(docId).select("-password");
    res.json({ success: true, profileData });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "An internal error occurred" });
  }
};

const editDocProfile = async (req, res) => {
  try {
    const { docId, fees, address, available } = req.body;
    await doctorModel.findByIdAndUpdate(docId, { fees, address, available });

    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "An internal error occurred" });
  }
};

//function for refresh doctor token
const refreshDoctorToken = async (req, res) => {
  const refreshToken = req.cookies.doctorRefreshToken;
  if (!refreshToken) {
    return res
      .status(401)
      .json({ success: false, message: "Session expired, please login again" });
  }
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const newToken = jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, {
      expiresIn: "15m",
    });
    res.json({ success: true, token: newToken });
  } catch (error) {
    res
      .status(401)
      .json({ success: false, message: "Session expired, please login again" });
  }
};

//function for doctor logout
const logoutDoctor = (req, res) => {
  res.clearCookie("doctorRefreshToken");
  res.json({ success: true, message: "Logged out" });
};

export {
  changeAvailablity,
  doctorList,
  loginDoctor,
  appointmentsDoctor,
  appointmentComplete,
  appointmentCancel,
  doctorDashboard,
  editDocProfile,
  docProfile,
  getAssignedReviews,
  reviewPrediction,
  refreshDoctorToken,
  logoutDoctor,
};
