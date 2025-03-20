import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

const diseaseFields = {
  heart: [
    "age", "sex", "cp", "trestbps", "chol", "fbs",
    "restecg", "thalach", "exang", "oldpeak", "slope", "ca", "thal"
  ],
  pcos: [
    "age", "bmi", "amh", "lh", "fsh_lh", "weight_gain",
    "hair_growth", "skin_darkening", "hair_loss", "pimples",
    "cycle_length", "follicle_L", "follicle_R", "tsh", "endometrium"
  ],
  diabetes: [
    "pregnancies", "glucose", "blood_pressure", "skin_thickness",
    "insulin", "bmi", "dpf", "age"
  ],
  stroke: [
    "gender", "age", "hypertension", "heart_disease",
    "ever_married", "work_type", "residence_type",
    "avg_glucose_level", "bmi", "smoking_status"
  ]
};

const COLORS = ["#10B981", "#E5E7EB"];

const Prediction = () => {
  const [disease, setDisease] = useState("");
  const [formData, setFormData] = useState({});
  const [riskPercentage, setRiskPercentage] = useState("0%");
  const [riskLevel, setRiskLevel] = useState("Low Risk");
  const [riskMessage, setRiskMessage] = useState("Please fill out the form to get your disease risk prediction.");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    setFormData({});
    setPrediction(null);
  }, [disease]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePrediction = async () => {
    if (!disease) {
      alert("Please select a disease");
      return;
    }

    const requiredFields = diseaseFields[disease];
    for (let field of requiredFields) {
      if (!formData[field]) {
        alert(`Please fill the field: ${field}`);
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch(`http://127.0.0.1:5000/predict/${disease}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch prediction");
      }

      const result = await response.json();
      setRiskPercentage(`${result.probability}%`);
      setRiskLevel(result.risk === "YES" ? "High Risk" : "Low Risk");
      setRiskMessage(
        result.risk === "YES"
          ? "Consult a doctor for further evaluation."
          : "Your health condition seems fine."
      );
      setPrediction(result.probability);
    } catch (error) {
      console.error("Error fetching prediction:", error);
      setRiskMessage("Failed to get prediction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-indigo-50 to-indigo-100 flex flex-col items-center p-6">
      
      {/* Branding */}
      <header className="w-full max-w-7xl flex justify-between items-center mb-12">
        <h1 className="text-4xl font-extrabold text-indigo-700">DiagnoAI</h1>
        <p className="text-lg text-gray-600">Your AI Health Companion</p>
      </header>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row gap-8 max-w-7xl w-full bg-white rounded-3xl shadow-2xl p-10">
        
        {/* LEFT: Form */}
        <div className="w-full md:w-1/2">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Enter Patient Details</h2>

          {/* Disease Selector */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Disease</label>
            <select
              className="block w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={(e) => setDisease(e.target.value)}
            >
              <option value="">Select</option>
              <option value="heart">Heart Disease</option>
              <option value="pcos">PCOS</option>
              <option value="diabetes">Diabetes</option>
              <option value="stroke">Stroke</option>
            </select>
          </div>

          {/* Dynamic Form */}
          {disease && (
            <form className="grid grid-cols-1 gap-4">
              {diseaseFields[disease].map(field => (
                <div key={field} className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">{field.replace(/_/g, " ")}</label>
                  <input
                    type="text"
                    name={field}
                    value={formData[field] || ""}
                    onChange={handleInputChange}
                    required
                    placeholder={field.replace(/_/g, " ")}
                    className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}
              <button
                type="button"
                className={`mt-4 py-3 px-6 text-white text-lg font-semibold rounded-lg shadow-md transition ${
                  loading ? "bg-gray-500 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
                }`}
                onClick={handlePrediction}
                disabled={loading}
              >
                {loading ? "Predicting..." : "Predict Disease Risk"}
              </button>
            </form>
          )}
        </div>

        {/* RIGHT: Chart */}
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center">
          <h3 className="text-xl font-semibold text-gray-700 mb-6">Prediction Result</h3>

          <div className="w-64 h-64 flex items-center justify-center relative rounded-full shadow-lg bg-white">
            {prediction !== null ? (
              <>
                <PieChart width={250} height={250}>
                  <Pie
                    data={[
                      { name: "Risk", value: prediction },
                      { name: "Safe", value: 100 - prediction }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    <Cell fill={COLORS[0]} />
                    <Cell fill={COLORS[1]} />
                  </Pie>
                  <Tooltip />
                </PieChart>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-bold text-emerald-600">{riskPercentage}</span>
                  <span className="text-sm text-gray-500">{riskLevel}</span>
                </div>
              </>
            ) : (
              <div className="text-gray-400 text-center animate-pulse">
                <p className="text-4xl mb-2">🤖</p>
                <p>Waiting for prediction...</p>
              </div>
            )}
          </div>

          <p className="mt-6 text-gray-500 text-sm">{riskMessage}</p>
          <button
            className="mt-4 bg-transparent border border-blue-500 text-blue-500 py-2 px-4 rounded opacity-50 cursor-not-allowed"
            disabled
          >
            Download PDF Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default Prediction;