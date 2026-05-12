import React from "react";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Doctors from "./pages/Doctors";
import Login from "./pages/Login";
import About from "./pages/About";
import Contact from "./pages/Contact";
import MyProfile from "./pages/MyProfile";
import MyAppointments from "./pages/MyAppointments";
import Appointment from "./pages/Appointment";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Bot from "./components/Bot";
import Prediction from "./pages/Prediction";
import AiSuggestion from "./pages/AiSuggestions";
import Research from "./pages/Research"; // ← ADD
import ProtectedRoute from "./components/ProtectedRoute";
import MyPredictions from "./pages/MyPredictions";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import VerifyPrediction from "./pages/VerifyPrediction";
import VideoCall from "./pages/VideoCall";
import MyConsultations from "./pages/MyConsultations";
import ResearchHub from "./pages/ResearchHub";

const App = () => {
  return (
    <div className="mx-4 sm:mx-[10%]">
      <ToastContainer />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/doctors/:speciality" element={<Doctors />} />
        <Route path="/login" element={<Login />} />
        <Route path="/about" element={<About />} />
        <Route path="/Contact" element={<Contact />} />
        <Route path="/my-profile" element={<MyProfile />} />
        <Route path="/my-appointments" element={<MyAppointments />} />
        <Route path="/appointment/:docId" element={<Appointment />} />
        <Route
          path="/prediction"
          element={
            <ProtectedRoute>
              <Prediction />
            </ProtectedRoute>
          }
        />
        <Route path="/ai-suggestions" element={<AiSuggestion />} />
        <Route
          path="/my-predictions"
          element={
            <ProtectedRoute>
              <MyPredictions />
            </ProtectedRoute>
          }
        />
        <Route path="/research" element={<Research />} /> {/* ← ADD */}
        <Route path="/verify" element={<VerifyPrediction />} />
        <Route
          path="/video-call/:consultationId"
          element={
            <ProtectedRoute>
              <VideoCall />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-consultations"
          element={
            <ProtectedRoute>
              <MyConsultations />
            </ProtectedRoute>
          }
        />
        <Route path="/research-hub/*" element={<ResearchHub />} />
      </Routes>
      <Bot />
      <Footer />
    </div>
  );
};

export default App;
