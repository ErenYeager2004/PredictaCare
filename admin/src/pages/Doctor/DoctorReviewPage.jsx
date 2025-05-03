import React, { useContext, useEffect, useState } from "react";
import { DoctorContext } from "../../context/DoctorContext";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import logo from "../../assets/logo.png";
import { assets } from "../../assets/assets";

const DoctorReviewPage = () => {
  const { dToken, assignedPredictions, getAssignedReviews, reviewPrediction } =
    useContext(DoctorContext);

  const [loadingReviews, setLoadingReviews] = useState(true);

  // ✅ Fetch Assigned Predictions on Load
  useEffect(() => {
    if (dToken) {
      setLoadingReviews(true);
      getAssignedReviews()
        .catch((error) => {
          console.error("Failed to fetch assigned reviews:", error);
          toast.error("Failed to load reviews.");
        })
        .finally(() => setLoadingReviews(false));
    }
  }, [dToken]);

  const [loadingStates, setLoadingStates] = useState({});

  const handleReview = async (predictionId, status) => {
    setLoadingStates((prev) => ({ ...prev, [predictionId]: true }));
    try {
      await reviewPrediction(predictionId, status);
      toast.success(`Prediction ${status}`);
      getAssignedReviews(); // Refresh from backend
    } catch (error) {
      toast.error(`Failed to ${status} prediction.`);
    } finally {
      setLoadingStates((prev) => ({ ...prev, [predictionId]: false }));
    }
  };

  // 🛠️ Generate PDF & Open in New Tab
  const handleViewResult = (prediction) => {
    const pdf = new jsPDF("p", "mm", "a4");
  
    const logoImg = new Image();
    logoImg.src = logo; // your logo path
  
    logoImg.onload = () => {
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let y = 10;
  
      // 🔷 Logo
      pdf.addImage(logoImg, "PNG", 10, y, 70, 20);
      
      // 🔷 Contact Info
      pdf.setFontSize(10);
      pdf.setTextColor(60);
      pdf.text("Email: adminPredictaCare@gmail.com", pageWidth - 65, 15);
      pdf.text("Phone: +91 9903469038", pageWidth - 65, 20);
      y += 30;
  
      // 🔷 Title
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      pdf.setTextColor(40, 40, 40);
      pdf.text("Diagnosis Summary Certificate", pageWidth / 2, y, { align: "center" });
      y += 10;
  
      pdf.setFontSize(12);
      pdf.setTextColor(60);
      pdf.text(`Disease: ${prediction.disease.toUpperCase()}`, pageWidth / 2, y, { align: "center" });
      y += 5;
  
      pdf.line(15, y, pageWidth - 15, y);
      y += 10;
  
      // 🔷 Patient Info
      const patientName = prediction.userData?.name || "Unknown";
      const probability = prediction.probability?.toFixed(2) || "N/A";
      const result = prediction.predictionResult || "N/A";
  
      const date = new Date();
      pdf.setFontSize(11);
      pdf.setTextColor(30);
      pdf.text(`Patient Name: ${patientName}`, 15, y);
      pdf.text(`Date: ${date.toLocaleDateString()}`, pageWidth - 60, y);
      y += 6;
      pdf.text(`Prediction Result: ${result}`, 15, y);
      pdf.text(`Time: ${date.toLocaleTimeString()}`, pageWidth - 60, y);
      y += 6;
      pdf.text(`Model Confidence: ${probability}%`, 15, y);
      y += 10;
  
      pdf.line(15, y, pageWidth - 15, y);
      y += 10;
  
      // 🔷 Section Header
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(40, 40, 40);
      pdf.text("Patient Inputs", pageWidth / 2, y, { align: "center" });
      y += 8;
  
      const inputs = prediction.userData?.inputs || prediction.inputs || {};
      const inputEntries = Object.entries(inputs);
  
      // 🔷 Inputs Table Headers
      if (inputEntries.length > 0) {
        pdf.setFontSize(12);
        pdf.setTextColor(80);
        pdf.setFont("helvetica", "bold");
        pdf.text("Parameter", 20, y);
        pdf.text("Value", pageWidth - 50, y);
        y += 6;
  
        pdf.setDrawColor(200);
        pdf.line(15, y, pageWidth - 15, y);
        y += 6;
  
        // 🔷 Inputs Rows
        pdf.setFont("helvetica", "normal");
        inputEntries.forEach(([key, value]) => {
          const label = key.replace(/_/g, " ").toUpperCase();
          const val = typeof value === "number" ? value.toFixed(2) : String(value);
  
          pdf.text(label, 20, y);
          pdf.text(val, pageWidth - 50, y);
          y += 7;
  
          // Handle page overflow
          if (y > pageHeight - 30) {
            pdf.addPage();
            y = 20;
          }
        });
      } else {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(12);
        pdf.setTextColor(100);
        pdf.text("No input data provided.", 15, y);
        y += 7;
      }
  
      y += 10;
  
      // 🔷 Footer
      pdf.setDrawColor(200);
      pdf.line(15, pageHeight - 25, pageWidth - 15, pageHeight - 25);
      pdf.setFontSize(10);
      pdf.setTextColor(100);
      pdf.text(
        "This is a computer-generated report. Please consult a medical professional for interpretation.",
        pageWidth / 2,
        pageHeight - 15,
        { align: "center", maxWidth: 180 }
      );
  
      // 🔷 Open PDF
      const pdfBlob = pdf.output("blob");
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl);
    };
  };
  

  return (
    <div className="w-full max-w-6xl m-5">
      <p className="mb-3 text-lg font-medium">Doctor Review Panel</p>

      <div className="bg-white border border-gray-200 rounded text-sm max-h-[80vh] min-h-[60vh] overflow-y-scroll">
        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-[0.7fr_2fr_1.5fr_1.5fr_2fr_1fr_1.5fr] py-3 px-6 border-b border-gray-200">
          <p className="text-center">#</p>
          <p className="text-left">Patient</p>
          <p className="text-center">Disease</p>
          <p className="text-center">Status</p>
          <p className="text-center">Submitted On</p>
          <p className="text-center">View Result</p>
          <p className="text-center">Action</p>
        </div>

        {/* Loading State */}
        {loadingReviews ? (
          <p className="text-gray-400 text-center py-6">Loading reviews...</p>
        ) : assignedPredictions.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No pending reviews.</p>
        ) : (
          assignedPredictions.map((item, index) => (
            <div
              className="flex flex-wrap justify-between sm:grid sm:grid-cols-[0.7fr_2fr_1.5fr_1.5fr_2fr_1fr_1.5fr] items-center text-gray-500 py-3 px-6 border-b border-gray-200 hover:bg-gray-50"
              key={item._id}
            >
              {/* Serial Number */}
              <p className="text-center">{index + 1}</p>

              {/* Patient Info */}
              <div className="flex items-center gap-2 text-left">
                <img
                  className="w-8 h-8 rounded-full object-cover"
                  src={item.userData?.image || "/placeholder.png"}
                  alt="Patient"
                />
                <p className="whitespace-nowrap">
                  {item.userData?.name || "Unknown"}
                </p>
              </div>

              {/* Disease */}
              <p className="text-center capitalize">{item.disease || "N/A"}</p>

              {/* Status */}
              <p
                className={`text-center font-medium ${
                  item.status === "approved"
                    ? "text-green-500"
                    : item.status === "rejected"
                    ? "text-red-500"
                    : "text-yellow-500"
                }`}
              >
                {item.status}
              </p>

              {/* Date Submitted */}
              <p className="text-center text-sm">
                {item.date ? new Date(item.date).toLocaleString() : "No Date"}
              </p>

              {/* View Result Button */}
              <div className="text-center">
                <button
                  onClick={() => handleViewResult(item)}
                  className="text-blue-500 text-sm font-medium hover:underline"
                >
                  View Result
                </button>
              </div>

              {/* Actions with Icons */}
              <div className="text-center">
                {item.status === "approved" ? (
                  <p className="text-green-500 text-sm font-medium">Approved</p>
                ) : item.status === "rejected" ? (
                  <p className="text-red-500 text-sm font-medium">Rejected</p>
                ) : (
                  <div className="flex justify-center gap-3">
                    <img
                      onClick={
                        !loadingStates[item._id]
                          ? () => handleReview(item._id, "approved")
                          : null
                      }
                      className={`w-10 cursor-pointer ${
                        loadingStates[item._id]
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                      src={assets.tick_icon}
                      alt="Approve"
                    />
                    <img
                      onClick={
                        !loadingStates[item._id]
                          ? () => handleReview(item._id, "rejected")
                          : null
                      }
                      className={`w-10 cursor-pointer ${
                        loadingStates[item._id]
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                      src={assets.cancel_icon}
                      alt="Reject"
                    />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DoctorReviewPage;
