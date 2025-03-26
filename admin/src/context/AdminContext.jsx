import axios from "axios";
import { createContext, useState } from "react";
import { toast } from "react-toastify";
export const AdminContext = createContext();

const AdminContextProvider = (props) => {
  const [aToken, setAToken] = useState(
    localStorage.getItem("aToken") ? localStorage.getItem("aToken") : ""
  );
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [dashData, setDashData] = useState(false);
  const [predictions, setPredictions] = useState([]);

  const getAllDoctors = async () => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/all-doctors`,
        {},
        { headers: { aToken } }
      );
      if (data.success) {
        setDoctors(data.doctors);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const changeAvailability = async (docId) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/change-availability`,
        { docId },
        { headers: { aToken } }
      );
      if (data.success) {
        toast.success(data.message);
        getAllDoctors();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getAllAppointments = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/appointments`, {
        headers: { aToken },
      });
      if (data.success) {
        setAppointments(data.appointments);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const cancelAppointment = async (appointmentId) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/cancel-appointment`,
        { appointmentId },
        { headers: { aToken } }
      );
      if (data.success) {
        toast.success(data.message);
        getAllAppointments();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getDashData = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/dashboard`, {
        headers: { aToken },
      });
      if (data.success) {
        setDashData(data.dashData);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const getAllPredictions = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/admin/predictions`, {
        headers: { aToken },
      });
      if (data.success) {
        setPredictions(data.predictions);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const assignDoctorToReview = async (predictionId, doctorId) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/assign-review`,
        { predictionId, doctorId },
        { headers: { aToken } }
      );
      if (data.success) {
        toast.success(data.message);
        getAllPredictions();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  const sendForReview = async (predictionId, doctorId) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/send-review/${predictionId}`, // Route must match backend
        { doctorId }, // Ensure doctorId is in the body
        { headers: { aToken } }
      );

      if (data.success) {
        toast.success(data.message);
        getAllPredictions();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(
        "Error sending for review:",
        error.response?.data || error.message
      );
      toast.error(
        `Failed to send for review: ${
          error.response?.data?.message || "Unknown error"
        }`
      );
    }
  };

  const deletePrediction = async (predictionId) => {
    try {
      const { data } = await axios.delete(
        `${backendUrl}/api/admin/delete/${predictionId}`,
        { headers: { aToken } }
      );
      if (data.success) {
        toast.success("Prediction deleted successfully");
        getAllPredictions(); // Refresh predictions list
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete prediction");
    }
  };  

  const value = {
    aToken,
    setAToken,
    backendUrl,
    doctors,
    getAllDoctors,
    changeAvailability,
    appointments,
    setAppointments,
    getAllAppointments,
    cancelAppointment,
    dashData,
    getDashData,
    predictions,
    getAllPredictions,
    assignDoctorToReview,
    sendForReview,
    deletePrediction,
  };

  return (
    <AdminContext.Provider value={value}>
      {props.children}
    </AdminContext.Provider>
  );
};

export default AdminContextProvider;
