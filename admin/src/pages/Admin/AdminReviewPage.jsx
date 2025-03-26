import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { AdminContext } from "../../context/AdminContext";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";

const backendUrl = import.meta.env.VITE_BACKEND_URL; 
const AdminReviewPage = () => {
  const {
    aToken,
    getAllPredictions,
    predictions,
    sendForReview,
    doctors,
    getAllDoctors,
    deletePrediction
  } = useContext(AdminContext);
  const { calculateAge } = useContext(AppContext);
  const [selectedDoctors, setSelectedDoctors] = useState({});
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  useEffect(() => {
    if (aToken) {
      getAllPredictions();
      fetchDoctors();
    }
  }, [aToken]);

  const fetchDoctors = async () => {
    try {
      await getAllDoctors();
    } catch (error) {
      console.error("Failed to fetch doctors:", error);
    } finally {
      setLoadingDoctors(false);
    }
  };

  const getFilteredDoctors = (disease) => {
    const specializations = {
      pcos: ["gynecologist", "endocrinologist"],
      stroke: ["neurologist"],
      heart: ["cardiologist"],
      diabetes: ["endocrinologist", "general physician"],
    };
    return doctors.filter((doc) =>
      specializations[disease.toLowerCase()?.trim()]?.includes(doc.speciality.toLowerCase().trim())
    );
  };

  const handleDoctorSelect = (predictionId, doctorId) => {
    setSelectedDoctors((prev) => ({ ...prev, [predictionId]: doctorId }));
  };

  const handleReview = (id) => {
    if (!selectedDoctors[id]) {
      toast.error("Please select a doctor before reviewing.");
      return;
    }
    sendForReview(id, selectedDoctors[id]);
  };

  const handleUpload = async (predictionId) => {
    if (!window.ethereum) {
        toast.error("MetaMask is not installed");
        return;
    }

    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        if (!accounts.length) {
            toast.error("Please connect your MetaMask wallet.");
            return;
        }

        const adminWallet = accounts[0]; // Get admin's MetaMask wallet
        const aToken = localStorage.getItem("aToken"); // Get auth token

        if (!aToken) {
            toast.error("Authentication token missing. Please log in again.");
            return;
        }

        console.log("Sending Token:", aToken); // Debugging

        const { data } = await axios.post(
            `${backendUrl}/api/admin/upload-to-blockchain`,
            { predictionId, adminWallet },  // Send wallet address
            { headers: { atoken: aToken } }  // ✅ FIX: Use 'atoken' in headers
        );

        if (data.success) {
            toast.success(`Uploaded to blockchain`);
            console.log(`Uploaded to blockchain! Tx: ${data.txHash}`);
            
            getAllPredictions(); // Refresh list
        } else {
            toast.error(data.message);
        }
    } catch (error) {
        console.error("Upload Error:", error.response ? error.response.data : error.message);
        toast.error(error.response?.data?.message || "Failed to upload prediction");
    }
};
    

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this prediction?")) {
      deletePrediction(id);
    }
  };  

  return (
    <div className="w-full max-w-6xl m-5">
    <p className="md-3 text-lg font-medium">Prediction Review Management</p>
    <div className="bg-white border border-gray-200 rounded text-sm max-h-[80vh] min-h-[60vh] overflow-y-scroll">
      <div className="max-sm:hidden grid grid-cols-[0.5fr_1.5fr_0.9fr_1.2fr_1fr_2fr_1.2fr] gap-1 py-3 px-6 border-b text-center">
        <p>#</p>
        <p className="text-left">Patient</p>
        <p>Age</p>
        <p>Disease</p>
        <p>Status</p>
        <p>Select Doctor</p>
        <p>Action</p>
      </div>
      {predictions
        .slice()
        .reverse()
        .map((item, index) => (
          <div
            className="flex flex-wrap justify-between max-sm:gap-5 max-sm:text-base sm:grid grid-cols-[0.5fr_1.5fr_0.9fr_1.2fr_1fr_2fr_1.2fr] gap-1 items-center text-gray-500 py-3 px-6 border-b hover:bg-gray-100 text-center"
            key={index}
          >
            <p className="max-sm:hidden">{index + 1}</p>
  
            {/* Fixed Name Alignment */}
            <div className="flex items-center gap-2 text-left w-full">
              <img className="w-8 h-8 rounded-full" src={item.userData.image} alt="" />
              <p className="whitespace-nowrap">{item.userData.name}</p>
            </div>
  
            <p className="max-sm:hidden">{calculateAge(item.userData.dob)}</p>
            <p className="max-sm:hidden">{item.disease}</p>
  
            {/* Centered Status */}
            <div className="flex justify-center">
              <p
                className={`text-xs inline border border-[#5F6FFF] px-2 py-1 rounded-xl ${
                  item.status === "Sent for Review" ? "text-blue-500" : "text-gray-400"
                }`}
              >
                {item.status}
              </p>
            </div>
  
            {/* Centered Doctor Selection */}
            <div className="w-full flex justify-center">
              {loadingDoctors ? (
                <p className="text-gray-400 text-sm">Loading doctors...</p>
              ) : (
                <select
                  className="text-sm p-1 border rounded text-center w-40"
                  value={selectedDoctors[item._id] || item.assignedDoctor || ""}
                  onChange={(e) => handleDoctorSelect(item._id, e.target.value)}
                  disabled={item.status !== "pending"}
                >
                  <option value="">Select Doctor</option>
                  {getFilteredDoctors(item.disease).map((doc) => (
                    <option key={doc._id} value={doc._id}>
                      {doc.name} - {doc.speciality}
                    </option>
                  ))}
                </select>
              )}
            </div>
  
            {/* Centered Action Buttons */}
            <div className="w-full flex justify-center">
              {item.status === "pending" ? (
                <button
                  onClick={() => handleReview(item._id)}
                  className="text-blue-500 text-sm font-medium hover:underline"
                >
                  Review
                </button>
              ) : item.status === "approved" ? (
                <button
                  onClick={() => handleUpload(item._id)}
                  className="text-green-500 text-sm font-medium hover:underline"
                >
                  Upload
                </button>
              ) : item.status === "rejected" ? (
                <button
                  onClick={() => handleDelete(item._id)}
                  className="text-red-500 text-sm font-medium hover:underline"
                >
                  Delete
                </button>
              ) : item.status === "reviewing" ? (
                <p className="text-gray-400 text-xs">Reviewing</p>
              ) : item.status === "deleted" ? (
                <p className="text-red-500 text-xs">Deleted</p>
              ) : item.status === "uploaded" ? (
                <p className="text-green-500 text-xs">Uploaded</p>
              ) : (
                <p className="text-gray-400 text-xs">Assigned</p>
              )}
            </div>
          </div>
        ))}
    </div>
  </div>
  
  );
};

export default AdminReviewPage;