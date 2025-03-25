import React, { useContext, useEffect, useState } from "react";
import { AdminContext } from "../../context/AdminContext";
import { AppContext } from "../../context/AppContext";
import { toast } from "react-toastify";

const AdminReviewPage = () => {
  const {
    aToken,
    getAllPredictions,
    predictions,
    sendForReview,
    doctors,
    getAllDoctors,
  } = useContext(AdminContext);
  const { calculateAge } = useContext(AppContext);
  const [selectedDoctors, setSelectedDoctors] = useState({});
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  useEffect(() => {
    if (aToken) {
      getAllPredictions();

      const fetchDoctors = async () => {
        try {
          await getAllDoctors();
        } catch (error) {
          console.error("Failed to fetch doctors:", error);
        } finally {
          setLoadingDoctors(false);
        }
      };

      fetchDoctors();
    }
  }, [aToken]);

  const getFilteredDoctors = (disease) => {
    const specializations = {
      pcos: ["gynecologist", "endocrinologist"],
      stroke: ["neurologist"],
      heart: ["cardiologist"],
      diabetes: ["endocrinologist", "general physician"],
    };

    const normalizedDisease = disease.trim().toLowerCase();
    return doctors.filter((doc) =>
      specializations[normalizedDisease]?.includes(
        doc.speciality.toLowerCase().trim()
      )
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

  const handleUpload = (id) => {
    console.log(`Uploading prediction ${id}`);
    const updatedPredictions = predictions.map((pred) =>
      pred._id === id ? { ...pred, status: "uploaded" } : pred
    );
    getAllPredictions(updatedPredictions);
  };

  const handleDelete = (id) => {
    console.log(`Deleting prediction ${id}`);
    const updatedPredictions = predictions.map((pred) =>
      pred._id === id ? { ...pred, status: "deleted" } : pred
    );
    getAllPredictions(updatedPredictions);
  };

  return (
    <div className="w-full max-w-6xl m-5">
      <p className="md-3 text-lg font-medium">Prediction Review Management</p>
      <div className="bg-white border border-gray-200 rounded text-sm max-h-[80vh] min-h-[60vh] overflow-y-scroll">
        <div className="hidden sm:grid grid-cols-[0.7fr_2.3fr_1.4fr_1.2fr_1.5fr_3.14fr_1.3fr] gap-3 py-3 px-6 border-b border-gray-200">
          <p className="text-left">#</p>
          <p className="text-left">Patient</p>
          <p className="text-center">Age</p>
          <p className="text-center">Disease</p>
          <p className="text-center">Status</p>
          <p className="text-center">Select Doctor</p>
          <p className="text-center">Action</p>
        </div>
        {predictions.map((item, index) => (
          <div
            className="flex flex-wrap justify-between max-sm:gap-2 sm:grid sm:grid-cols-[0.5fr_2fr_1fr_1.2fr_1fr_2fr_1fr] gap-3 items-center text-gray-500 py-3 px-6 border-b border-gray-200 hover:bg-gray-50"
            key={index}
          >
            <p className="max-sm:hidden text-left">{index + 1}</p>
            <div className="flex items-center gap-2 text-left">
              <img
                className="w-8 h-8 rounded-full"
                src={item.userData.image}
                alt=""
              />
              <p className="whitespace-nowrap">{item.userData.name}</p>
            </div>
            <p className="max-sm:hidden text-center">
              {calculateAge(item.userData.dob)}
            </p>
            <p className="text-center">{item.disease}</p>
            <p
              className={`font-medium text-center ${
                item.status === "Sent for Review"
                  ? "text-blue-500"
                  : "text-gray-400"
              }`}
            >
              {item.status}
            </p>
            {loadingDoctors ? (
              <p className="text-gray-400 text-sm text-center">
                Loading doctors...
              </p>
            ) : (
              <select
                className="text-sm p-1 border rounded text-center"
                value={selectedDoctors[item._id] || ""}
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
            {item.status === "pending" ? (
              <button
                onClick={() => handleReview(item._id)}
                className="text-blue-500 text-sm font-medium hover:underline text-center"
              >
                Review
              </button>
            ) : item.status === "approved" ? (
              <button
                onClick={() => handleUpload(item._id)}
                className="text-green-500 text-sm font-medium hover:underline text-center"
              >
                Upload
              </button>
            ) : item.status === "rejected" ? (
              <button
                onClick={() => handleDelete(item._id)}
                className="text-red-500 text-sm font-medium hover:underline text-center"
              >
                Delete
              </button>
            ) : item.status === "reviewing" ? (
              <p className="text-gray-400 text-xs text-center">Reviewing</p>
            ) : item.status === "deleted" ? (
              <p className="text-red-500 text-xs text-center">Deleted</p>
            ) : item.status === "uploaded" ? (
              <p className="text-green-500 text-xs text-center">Uploaded</p>
            ) : (
              <p className="text-gray-400 text-xs text-center">Assigned</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminReviewPage;
