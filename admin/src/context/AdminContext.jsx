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

  // Function to check token expiry
  const checkTokenExpiry = () => {
    const token = localStorage.getItem("aToken");
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000;
      if (expiry < Date.now()) {
        // Token has expired
        localStorage.removeItem("aToken");
        setAToken(null); // Set token state to null
        toast.error("Your session has expired, please log in again.");
        return false; // Token is expired
      }
    }
    return true; // Token is valid
  };

  const getAllDoctors = async () => {
    if (!checkTokenExpiry()) return; // Check token before making the API call
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
    if (!checkTokenExpiry()) return;
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
    if (!checkTokenExpiry()) return;
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
    if (!checkTokenExpiry()) return;
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
    if (!checkTokenExpiry()) return;
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
    if (!checkTokenExpiry()) return;
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
    if (!checkTokenExpiry()) return;
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
    if (!checkTokenExpiry()) return;
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/admin/send-review/${predictionId}`,
        { doctorId },
        { headers: { aToken } }
      );
      if (data.success) {
        toast.success(data.message);
        getAllPredictions();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(
        `Failed to send for review: ${
          error.response?.data?.message || "Unknown error"
        }`
      );
    }
  };

  const deletePrediction = async (predictionId) => {
    if (!checkTokenExpiry()) return;
    try {
      const { data } = await axios.delete(
        `${backendUrl}/api/admin/delete/${predictionId}`,
        { headers: { aToken } }
      );
      if (data.success) {
        toast.success("Prediction deleted successfully");
        getAllPredictions();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete prediction");
    }
  };

  const handleDelete = async (predictionId) => {
    if (!window.confirm("Are you sure you want to delete this prediction?")) return;
    if (!checkTokenExpiry()) return;
    try {
      const { data } = await axios.delete(
        `${backendUrl}/api/admin/handle-delete/${predictionId}`,
        { headers: { aToken } }
      );
      if (data.success) {
        toast.success("Prediction deleted successfully!");
        setPredictions(predictions.filter((pred) => pred._id !== predictionId));
      } else {
        toast.error(`Error: ${data.message}`);
      }
    } catch (error) {
      toast.error("Failed to delete prediction. Try again.");
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
    handleDelete,
  };

  return (
    <AdminContext.Provider value={value}>
      {props.children}
    </AdminContext.Provider>
  );
};

export default AdminContextProvider;
