import React, { useState, useEffect, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import logo from "../assets/logo.png";
import UpgradeModal from "../components/UpgradeModal";
import BlockchainBadge from "../components/BlockchainBadge";
import PredictionSkeleton from "../components/PredictionSkeleton";
import OnboardingTour from "../components/OnboardingTour";

/* ─────────────────────────────────────────────────────────────────────────────
   FONT INJECTION — Space Grotesk (headings) + Inter (body)
───────────────────────────────────────────────────────────────────────────── */
const injectFonts = () => {
  if (document.getElementById("diagnoai-fonts")) return;
  const link = document.createElement("link");
  link.id = "diagnoai-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap";
  document.head.appendChild(link);
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

/* ─────────────────────────────────────────────────────────────────────────────
   MODEL METADATA
───────────────────────────────────────────────────────────────────────────── */
const MODEL_INFO = {
  diabetes: {
    free: {
      roc: 0.8191,
      recall: 0.85,
      label: "Self-reported only",
      model: "XGBoost Lite",
    },
    premium: {
      roc: 0.9745,
      recall: 0.85,
      label: "Includes blood markers",
      model: "Deep Neural Network",
    },
    upsell: "+15.5% accuracy — add HbA1c & blood glucose",
    isBeta: false,
  },
  heart: {
    free: {
      roc: 0.9922,
      recall: 0.88,
      label: "Self-reported only",
      model: "XGBoost Lite",
    },
    premium: {
      roc: 0.9357,
      recall: 0.82,
      label: "ECG + lab analysis",
      model: "Deep Neural Network",
    },
    upsell: "Premium adds blockchain verification & ECG analysis",
    isBeta: false,
  },
  pcos: {
    free: {
      roc: 0.879,
      recall: 0.83,
      label: "Symptom-based",
      model: "XGBoost Lite",
    },
    premium: {
      roc: 0.9365,
      recall: 0.81,
      label: "Includes lab results",
      model: "Deep Neural Network",
    },
    upsell: "+5.75% accuracy — add AMH, LH, FSH lab results",
    isBeta: false,
  },
  stroke: {
    free: {
      roc: 0.7767,
      recall: 0.82,
      label: "Beta — limited dataset",
      model: "XGBoost Lite",
    },
    premium: {
      roc: 0.7258,
      recall: 0.82,
      label: "Beta — limited dataset",
      model: "Deep Neural Network",
    },
    upsell: "Both tiers are experimental for stroke",
    isBeta: true,
  },
};

const DISEASE_LABEL = {
  heart: "Heart Disease",
  diabetes: "Diabetes",
  pcos: "PCOS",
  stroke: "Stroke",
};
const SPECIALIST = {
  heart: "Cardiologist",
  diabetes: "Endocrinologist",
  pcos: "Gynaecologist / Endocrinologist",
  stroke: "Neurologist",
};

/* ─────────────────────────────────────────────────────────────────────────────
   DISEASE FIELDS
───────────────────────────────────────────────────────────────────────────── */
const DISEASE_FIELDS = {
  diabetes: {
    required: [
      { name: "user_name", label: "Full Name", type: "text" },
      { name: "age", label: "Age", type: "number", min: 1, max: 120 },
      {
        name: "gender",
        label: "Gender",
        type: "select",
        options: [
          { label: "Male", value: "Male" },
          { label: "Female", value: "Female" },
        ],
      },
      {
        name: "hypertension",
        label: "Hypertension",
        type: "select",
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      {
        name: "heart_disease",
        label: "Heart Disease",
        type: "select",
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      {
        name: "smoking_history",
        label: "Smoking History",
        type: "select",
        options: [
          { label: "Never", value: "never" },
          { label: "Current", value: "current" },
          { label: "Former", value: "former" },
          { label: "Not Current", value: "not current" },
          { label: "Ever", value: "ever" },
          { label: "No Info", value: "No Info" },
        ],
      },
      {
        name: "bmi",
        label: "BMI",
        type: "number",
        step: 0.1,
        min: 10,
        max: 70,
        hint: "18.5–24.9",
      },
    ],
    optional: [
      {
        name: "HbA1c_level",
        label: "HbA1c Level",
        type: "number",
        step: 0.1,
        unit: "%",
        hint: "< 5.7",
      },
      {
        name: "blood_glucose_level",
        label: "Blood Glucose",
        type: "number",
        unit: "mg/dL",
        hint: "70–99",
      },
    ],
  },
  heart: {
    required: [
      { name: "user_name", label: "Full Name", type: "text" },
      { name: "age", label: "Age", type: "number", min: 1, max: 120 },
      {
        name: "sex",
        label: "Sex",
        type: "select",
        options: [
          { label: "Male", value: 1 },
          { label: "Female", value: 0 },
        ],
      },
      {
        name: "cp",
        label: "Chest Pain Type",
        type: "select",
        options: [
          { label: "Typical Angina", value: 0 },
          { label: "Atypical Angina", value: 1 },
          { label: "Non-Anginal Pain", value: 2 },
          { label: "Asymptomatic", value: 3 },
        ],
      },
      {
        name: "trestbps",
        label: "Resting Blood Pressure",
        type: "number",
        unit: "mm Hg",
        hint: "90–120",
      },
      {
        name: "exang",
        label: "Exercise Induced Angina",
        type: "select",
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
    ],
    optional: [
      {
        name: "chol",
        label: "Cholesterol",
        type: "number",
        unit: "mg/dL",
        hint: "< 200",
      },
      {
        name: "restecg",
        label: "Resting ECG",
        type: "select",
        options: [
          { label: "Normal", value: 0 },
          { label: "ST-T Wave Abnormality", value: 1 },
          { label: "Left Ventricular Hypertrophy", value: 2 },
        ],
      },
      {
        name: "thalach",
        label: "Max Heart Rate",
        type: "number",
        unit: "bpm",
        hint: "60–100",
      },
      {
        name: "oldpeak",
        label: "ST Depression",
        type: "number",
        step: 0.1,
        unit: "mm",
        hint: "0–2",
      },
      {
        name: "slope",
        label: "ST Slope",
        type: "select",
        options: [
          { label: "Upsloping", value: 0 },
          { label: "Flat", value: 1 },
          { label: "Downsloping", value: 2 },
        ],
      },
      {
        name: "ca",
        label: "Major Vessels (0–3)",
        type: "select",
        options: [
          { label: "0", value: 0 },
          { label: "1", value: 1 },
          { label: "2", value: 2 },
          { label: "3", value: 3 },
        ],
      },
      {
        name: "thal",
        label: "Thalassemia",
        type: "select",
        options: [
          { label: "Normal", value: 1 },
          { label: "Fixed Defect", value: 2 },
          { label: "Reversible Defect", value: 3 },
        ],
      },
    ],
  },
  pcos: {
    required: [
      { name: "user_name", label: "Full Name", type: "text" },
      { name: "Age (yrs)", label: "Age", type: "number", min: 10, max: 60 },
      {
        name: "BMI",
        label: "BMI",
        type: "number",
        step: 0.1,
        hint: "18.5–24.9",
      },
      {
        name: "Waist(inch)",
        label: "Waist Circumference",
        type: "number",
        step: 0.1,
        unit: "inches",
      },
      {
        name: "Cycle(R/I)",
        label: "Menstrual Cycle",
        type: "select",
        options: [
          { label: "Regular", value: 2 },
          { label: "Irregular", value: 4 },
        ],
      },
      {
        name: "Cycle length(days)",
        label: "Cycle Length",
        type: "number",
        unit: "days",
        hint: "21–35",
      },
      {
        name: "Weight gain(Y/N)",
        label: "Unexplained Weight Gain",
        type: "select",
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      {
        name: "hair growth(Y/N)",
        label: "Excess Hair Growth",
        type: "select",
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      {
        name: "Skin darkening (Y/N)",
        label: "Skin Darkening",
        type: "select",
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      {
        name: "Hair loss(Y/N)",
        label: "Hair Loss",
        type: "select",
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      {
        name: "Pimples(Y/N)",
        label: "Pimples / Acne",
        type: "select",
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      {
        name: "Fast food (Y/N)",
        label: "Fast Food Consumption",
        type: "select",
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
    ],
    optional: [
      {
        name: "AMH(ng/mL)",
        label: "AMH",
        type: "number",
        step: 0.01,
        unit: "ng/mL",
        hint: "1.0–5.0",
      },
      {
        name: "LH(mIU/mL)",
        label: "LH",
        type: "number",
        step: 0.1,
        unit: "mIU/mL",
        hint: "1.5–8.0",
      },
      {
        name: "FSH(mIU/mL)",
        label: "FSH",
        type: "number",
        step: 0.1,
        unit: "mIU/mL",
        hint: "3.5–12.5",
      },
      {
        name: "Follicle No. (L)",
        label: "Follicle Count (Left)",
        type: "number",
        hint: "5–10",
      },
      {
        name: "Follicle No. (R)",
        label: "Follicle Count (Right)",
        type: "number",
        hint: "5–10",
      },
      {
        name: "Avg. F size (L) (mm)",
        label: "Avg. Follicle Size Left",
        type: "number",
        step: 0.1,
        unit: "mm",
        hint: "18–24",
      },
      {
        name: "Avg. F size (R) (mm)",
        label: "Avg. Follicle Size Right",
        type: "number",
        step: 0.1,
        unit: "mm",
        hint: "18–24",
      },
    ],
  },
  stroke: {
    required: [
      { name: "user_name", label: "Full Name", type: "text" },
      { name: "age", label: "Age", type: "number", min: 1, max: 120 },
      {
        name: "hypertension",
        label: "Hypertension",
        type: "select",
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      {
        name: "heart_disease",
        label: "Heart Disease",
        type: "select",
        options: [
          { label: "Yes", value: 1 },
          { label: "No", value: 0 },
        ],
      },
      {
        name: "avg_glucose_level",
        label: "Avg. Glucose Level",
        type: "number",
        step: 0.1,
        unit: "mg/dL",
        hint: "70–99",
      },
      {
        name: "bmi",
        label: "BMI",
        type: "number",
        step: 0.1,
        hint: "18.5–24.9",
      },
      {
        name: "smoking_status",
        label: "Smoking Status",
        type: "select",
        options: [
          { label: "Never Smoked", value: "never smoked" },
          { label: "Formerly Smoked", value: "formerly smoked" },
          { label: "Smokes", value: "smokes" },
          { label: "Unknown", value: "Unknown" },
        ],
      },
    ],
    optional: [],
  },
};

/* ─────────────────────────────────────────────────────────────────────────────
   NORMAL REFERENCE VALUES
───────────────────────────────────────────────────────────────────────────── */
const NORMAL_VALUES = {
  diabetes: {
    age: { normal: "18–60", unit: "yrs" },
    bmi: { normal: "18.5–24.9", unit: "kg/m²" },
    HbA1c_level: { normal: "< 5.7", unit: "%" },
    blood_glucose_level: { normal: "70–99", unit: "mg/dL" },
  },
  heart: {
    age: { normal: "18–65", unit: "yrs" },
    trestbps: { normal: "90–120", unit: "mm Hg" },
    chol: { normal: "< 200", unit: "mg/dL" },
    thalach: { normal: "60–100", unit: "bpm" },
    oldpeak: { normal: "0–2", unit: "mm" },
    ca: { normal: "0", unit: "count" },
  },
  pcos: {
    "Age (yrs)": { normal: "18–35", unit: "yrs" },
    BMI: { normal: "18.5–24.9", unit: "kg/m²" },
    "AMH(ng/mL)": { normal: "1.0–5.0", unit: "ng/mL" },
    "Cycle length(days)": { normal: "21–35", unit: "days" },
  },
  stroke: {
    age: { normal: "18–65", unit: "yrs" },
    avg_glucose_level: { normal: "70–99", unit: "mg/dL" },
    bmi: { normal: "18.5–24.9", unit: "kg/m²" },
  },
};
const getNormal = (disease, name) =>
  NORMAL_VALUES[disease]?.[name] || { normal: "—", unit: "—" };

/* ─────────────────────────────────────────────────────────────────────────────
   RISK GAUGE
───────────────────────────────────────────────────────────────────────────── */
const RiskGauge = ({ value = 0, risk = "" }) => {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const color = v <= 50 ? "#0d9488" : v < 80 ? "#d97706" : "#dc2626";
  return (
    <div className="relative h-36 w-36 flex-shrink-0">
      <div
        className="rounded-full h-36 w-36"
        style={{
          background: `conic-gradient(${color} ${v * 3.6}deg, #e2e8f0 0deg)`,
          filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.10))",
        }}
      />
      <div className="absolute inset-3 rounded-full bg-white flex flex-col items-center justify-center">
        <span
          className="text-2xl font-bold leading-none"
          style={{ color, fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {v}%
        </span>
        <span className="text-[10px] text-slate-400 mt-0.5 font-medium tracking-wide">
          RISK
        </span>
      </div>
    </div>
  );
};

const MetricBar = ({ label, value }) => (
  <div>
    <div className="flex justify-between mb-1">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-teal-700">
        {value.toFixed(4)}
      </span>
    </div>
    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <motion.div
        className="h-full rounded-full bg-teal-500"
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
    </div>
  </div>
);

const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />
);

const FieldInput = ({ field, value, onChange }) => (
  <div className="space-y-1">
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
      {field.label}
      {field.unit && (
        <span className="ml-1 font-normal normal-case text-slate-400">
          ({field.unit})
        </span>
      )}
      {field.hint && (
        <span className="ml-1 font-normal normal-case text-slate-400">
          · normal {field.hint}
        </span>
      )}
    </label>
    {field.type === "select" ? (
      <select
        name={field.name}
        value={value ?? ""}
        onChange={onChange}
        className="w-full h-10 px-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 hover:border-slate-300 transition-colors"
      >
        <option value="">Select…</option>
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    ) : (
      <input
        type={field.type === "text" ? "text" : "number"}
        name={field.name}
        value={value ?? ""}
        onChange={onChange}
        step={field.step}
        min={field.min}
        max={field.max}
        placeholder="—"
        className="w-full h-10 px-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 hover:border-slate-300 transition-colors"
      />
    )}
  </div>
);

const ConsultModal = ({ disease, onClose }) => (
  <motion.div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
  >
    <motion.div
      className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full"
      initial={{ scale: 0.95, y: 16 }}
      animate={{ scale: 1, y: 0 }}
      exit={{ scale: 0.95, y: 16 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className="h-10 w-10 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
          <svg
            className="w-5 h-5 text-teal-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <div>
          <h3
            className="font-semibold text-slate-800 text-base"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Doctor Consultation
          </h3>
          <p className="text-xs text-slate-400">Premium benefit</p>
        </div>
      </div>
      <div className="bg-teal-50 rounded-xl px-4 py-3 mb-4">
        <p className="text-xs text-teal-600 font-medium mb-0.5">
          Recommended Specialist
        </p>
        <p className="text-sm font-semibold text-teal-800">
          {SPECIALIST[disease] || "General Physician"}
        </p>
      </div>
      <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 mb-4">
        <div>
          <p className="text-xs text-slate-500">Video consultation</p>
          <p className="text-xs text-slate-400 mt-0.5">
            30-min verified specialist call
          </p>
        </div>
        <span
          className="text-lg font-bold text-slate-800"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          ₹299
        </span>
      </div>
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-5">
        <svg
          className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-xs text-amber-700">
          <strong>Launching Soon</strong> — Bookings will open once our doctor
          network is onboarded. You'll be notified when it's live.
        </p>
      </div>
      <button
        onClick={onClose}
        className="w-full h-10 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
      >
        Got it
      </button>
    </motion.div>
  </motion.div>
);

const Preloader = () => (
  <div
    className="fixed inset-0 z-50 flex flex-col items-center justify-center"
    style={{ background: "hsl(210 20% 98%)" }}
  >
    <motion.h1
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      className="text-5xl font-bold tracking-tight text-slate-800 mb-2"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
    >
      DIAGNO<span className="text-teal-600">AI</span>
    </motion.h1>
    <motion.p
      className="text-sm text-slate-400 mb-7"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.35 }}
    >
      Clinical-grade risk assessment
    </motion.p>
    <div className="flex gap-1.5">
      {[0, 0.14, 0.28].map((d, i) => (
        <motion.span
          key={i}
          className="block w-2 h-2 rounded-full bg-teal-500"
          animate={{ y: [-4, 4, -4] }}
          transition={{ duration: 0.65, repeat: Infinity, delay: d }}
        />
      ))}
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function Prediction() {
  const { userData, token, loadUserProfileData } = useContext(AppContext);
  const navigate = useNavigate();

  const [pageLoading, setPageLoading] = useState(true);
  const [disease, setDisease] = useState(
    () => sessionStorage.getItem("pc_disease") || "",
  );
  const [isPremium, setIsPremium] = useState(true);
  const [showOptional, setShowOptional] = useState(false);
  const [formData, setFormData] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("pc_formData") || "{}");
    } catch {
      return {};
    }
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("pc_result") || "null");
    } catch {
      return null;
    }
  });
  const [showConsult, setShowConsult] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [localTrialUsed, setLocalTrialUsed] = useState(null);

  const userIsPremium =
    userData?.subscription === "premium" &&
    userData?.subscriptionExpiry &&
    new Date(userData.subscriptionExpiry) > new Date();

  const currentTrialUsed =
    localTrialUsed !== null
      ? localTrialUsed
      : (userData?.predictionsUsed ?? result?.predictionsUsed ?? 0);
  const trialLimit =
    userData?.predictionsLimit ?? result?.predictionsLimit ?? 5;
  const trialUsedUp = currentTrialUsed >= trialLimit;
  const canUsePremium = userIsPremium || !trialUsedUp;

  useEffect(() => {
    injectFonts();
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setPageLoading(false), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const savedDisease = sessionStorage.getItem("pc_disease");
    if (disease && disease !== savedDisease) {
      setFormData({});
      setResult(null);
      setShowOptional(false);
      sessionStorage.removeItem("pc_result");
      sessionStorage.removeItem("pc_formData");
      sessionStorage.setItem("pc_disease", disease);
    }
    setIsPremium(!trialUsedUp);
  }, [disease]);

  useEffect(() => {
    if (trialUsedUp && !userIsPremium) setIsPremium(false);
  }, [trialUsedUp, userIsPremium]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handlePredict = async () => {
    if (!disease) {
      toast.error("Please select a condition");
      return;
    }
    if (!token) {
      toast.error("Please log in to make predictions");
      return;
    }

    const reqFields = DISEASE_FIELDS[disease].required;
    for (const f of reqFields) {
      if (f.name === "user_name") continue;
      if (formData[f.name] === undefined || formData[f.name] === "") {
        toast.error(`Please fill: ${f.label}`);
        return;
      }
    }

    setLoading(true);
    try {
      const { user_name, ...raw } = formData;
      const userInputs = {};
      const allFields = [
        ...DISEASE_FIELDS[disease].required,
        ...DISEASE_FIELDS[disease].optional,
      ];
      for (const f of allFields) {
        if (f.name === "user_name") continue;
        const val = raw[f.name];
        if (val === undefined || val === "") continue;
        if (f.type === "number") userInputs[f.name] = parseFloat(val);
        else if (f.type === "select") {
          const n = parseFloat(val);
          userInputs[f.name] = isNaN(n) ? val : n;
        } else userInputs[f.name] = val;
      }

      const res = await fetch(`${BACKEND_URL}/api/predictions/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token },
        body: JSON.stringify({
          disease,
          userInputs,
          userSelectedPremium: isPremium,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.upgradeRequired) {
          toast.error("Monthly prediction limit reached — upgrade to Premium!");
          return;
        }
        throw new Error(data.message || "Prediction failed");
      }

      setResult(data);
      sessionStorage.setItem("pc_result", JSON.stringify(data));
      sessionStorage.setItem("pc_disease", disease);
      sessionStorage.setItem("pc_formData", JSON.stringify(formData));
      toast.success("Prediction complete");

      if (data.predictionsUsed !== undefined)
        setLocalTrialUsed(data.predictionsUsed);
      if (loadUserProfileData) loadUserProfileData();
    } catch (err) {
      toast.error(err.message || "Failed — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const doc = new jsPDF();
    const img = new Image();
    img.src = logo;
    img.onload = () => {
      doc.addImage(img, "PNG", 10, 7, 65, 18);
      doc.setFontSize(9);
      doc.setTextColor(90, 90, 90);
      doc.text("Email: adminPredictaCare@gmail.com", 140, 12);
      doc.text("Phone: +91 9903469038", 140, 18);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(20, 20, 20);
      doc.text("Prediction Certificate", 105, 36, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.text(
        `Condition: ${disease.toUpperCase()}   ·   Tier: ${(result.tier || "free").toUpperCase()}${result.isBeta ? "   ·   BETA" : ""}`,
        105,
        43,
        { align: "center" },
      );
      doc.line(15, 48, 195, 48);
      const now = new Date();
      doc.setFontSize(9);
      doc.text(`Patient: ${formData.user_name || "N/A"}`, 15, 55);
      doc.text(
        `Age: ${formData.age || formData["Age (yrs)"] || "N/A"}`,
        15,
        61,
      );
      doc.text(
        `Date: ${now.toLocaleDateString()}  ${now.toLocaleTimeString()}`,
        160,
        55,
        { align: "right" },
      );
      // blockchain tx hash on certificate
      if (result.blockchain?.hash) {
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(`Blockchain Hash: ${result.blockchain.hash}`, 15, 68);
      }
      doc.line(15, 71, 195, 71);
      let y = 79;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("Parameter", 18, y);
      doc.text("Normal", 90, y);
      doc.text("Unit", 125, y);
      doc.text("Value", 160, y);
      doc.line(15, y + 3, 195, y + 3);
      y += 9;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const allF = [
        ...DISEASE_FIELDS[disease].required,
        ...DISEASE_FIELDS[disease].optional,
      ].filter((f) => f.name !== "user_name");
      for (const f of allF) {
        let val = formData[f.name];
        if (val === undefined || val === "") continue;
        const norm = getNormal(disease, f.name);
        if (f.type === "select") {
          const opt = f.options?.find((o) => String(o.value) === String(val));
          val = opt ? opt.label : val;
        }
        doc.text(f.label.substring(0, 30), 18, y);
        doc.text(String(norm.normal), 90, y);
        doc.text(String(norm.unit), 125, y);
        doc.text(String(val), 160, y);
        doc.line(15, y + 3, 195, y + 3);
        y += 8;
        if (y > 265) {
          doc.addPage();
          y = 20;
        }
      }
      y += 6;
      doc.setFillColor(240, 249, 248);
      doc.rect(15, y, 180, 22, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Prediction Result", 105, y + 8, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(
        `Risk Level: ${result.risk}   ·   Probability: ${result.probability}%   ·   Model: ${result.tier}`,
        105,
        y + 16,
        { align: "center" },
      );
      const ph = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.line(15, ph - 16, 195, ph - 16);
      doc.text(
        "AI screening tool only — not a medical diagnosis. Consult a qualified healthcare professional.",
        105,
        ph - 8,
        { align: "center", maxWidth: 180 },
      );
      doc.save(`PredictaCare_${disease}_${result.tier}.pdf`);
    };
  };

  const riskColor =
    result?.risk === "HIGH"
      ? "#dc2626"
      : result?.risk === "MODERATE"
        ? "#d97706"
        : result?.risk === "LOW"
          ? "#0d9488"
          : "#94a3b8";
  const info = disease ? MODEL_INFO[disease] : null;
  const metrics = info ? (isPremium ? info.premium : info.free) : null;
  const fields = disease ? DISEASE_FIELDS[disease] : null;

  if (pageLoading) return <Preloader />;

  return (
    <>
      <AnimatePresence>
        {showConsult && (
          <ConsultModal
            disease={disease}
            onClose={() => setShowConsult(false)}
          />
        )}
      </AnimatePresence>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        onSuccess={loadUserProfileData}
      />
      <OnboardingTour />

      <div
        className="min-h-screen px-4 sm:px-6 lg:px-8 py-8"
        style={{
          background: "hsl(210 20% 98%)",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <div className="max-w-7xl mx-auto">
          {/* Page header */}
          <motion.header
            className="mb-8 flex items-start justify-between"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div>
              <h1
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-800"
              >
                DIAGNO<span className="text-teal-600">AI</span>
              </h1>
              <p className="text-slate-400 mt-1 text-sm">
                AI-powered disease risk assessment
              </p>
            </div>
            <span
              className={`mt-1 px-3 py-1 rounded-full text-xs font-semibold ${userIsPremium ? "bg-amber-100 text-amber-700" : "bg-teal-50 text-teal-700 border border-teal-100"}`}
            >
              {userIsPremium ? "✨ Premium" : "Free plan"}
            </span>
          </motion.header>

          <div className="grid grid-cols-12 gap-6">
            {/* LEFT — Input form */}
            <motion.section
              className="col-span-12 lg:col-span-7"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
            >
              <div
                className="bg-white rounded-2xl border border-slate-100 overflow-hidden"
                style={{
                  boxShadow:
                    "0 1px 2px rgba(0,0,0,0.05), 0 6px 20px rgba(0,0,0,0.04)",
                }}
              >
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      className="font-semibold text-slate-800"
                    >
                      Input Factors
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Fill in the fields below to get your risk estimate
                    </p>
                  </div>
                  {disease && (
                    <div
                      id="tier-toggle"
                      className="flex rounded-lg overflow-hidden border border-slate-200 flex-shrink-0 ml-4"
                    >
                      <button
                        onClick={() => setIsPremium(false)}
                        className={`px-3 py-1.5 text-xs font-semibold transition-colors ${!isPremium ? "bg-teal-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                      >
                        Free
                      </button>
                      <button
                        onClick={() => {
                          if (!canUsePremium) {
                            setShowUpgrade(true);
                            return;
                          }
                          setIsPremium(true);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold transition-colors ${isPremium ? "bg-amber-500 text-white" : canUsePremium ? "bg-white text-slate-500 hover:bg-slate-50" : "bg-white text-slate-300 cursor-not-allowed"}`}
                      >
                        Premium {!canUsePremium && "🔒"}
                      </button>
                    </div>
                  )}
                </div>

                <div
                  id="input-form"
                  className="p-6 space-y-5 max-h-[68vh] overflow-y-auto [&::-webkit-scrollbar]:hidden"
                >
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Condition
                    </label>
                    <select
                      id="condition-select"
                      value={disease}
                      onChange={(e) => setDisease(e.target.value)}
                      className="w-full h-10 px-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 hover:border-slate-300 transition-colors"
                    >
                      <option value="">Select a condition…</option>
                      <option value="heart">Heart Disease</option>
                      <option value="diabetes">Diabetes</option>
                      <option value="pcos">PCOS</option>
                      <option value="stroke">Stroke</option>
                    </select>
                  </div>

                  <AnimatePresence mode="wait">
                    {disease && (
                      <motion.div
                        key={disease}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-5"
                      >
                        {info?.isBeta && (
                          <div className="flex items-start gap-2.5 px-3.5 py-3 bg-amber-50 border border-amber-100 rounded-xl">
                            <svg
                              className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                              />
                            </svg>
                            <p className="text-xs text-amber-700 leading-relaxed">
                              <strong>Beta model.</strong> Stroke prediction
                              uses a limited dataset. Results are for awareness
                              only — not for clinical use.
                            </p>
                          </div>
                        )}

                        {!userIsPremium && (
                          <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                            <span>Free predictions this month</span>
                            <span className="font-semibold text-slate-700">
                              {result?.predictionsRemaining !== undefined ? (
                                result.trialExhausted ? (
                                  <button
                                    onClick={() => setShowUpgrade(true)}
                                    className="text-teal-600 font-semibold underline underline-offset-2"
                                  >
                                    Trial used — Upgrade for unlimited DNN
                                  </button>
                                ) : (
                                  `${result.predictionsRemaining} premium trial predictions left`
                                )
                              ) : (
                                "5 premium trial predictions"
                              )}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {fields.required.map((f) => (
                            <FieldInput
                              key={f.name}
                              field={f}
                              value={formData[f.name]}
                              onChange={handleChange}
                            />
                          ))}
                        </div>

                        {isPremium && fields.optional.length > 0 && (
                          <div>
                            <button
                              onClick={() => setShowOptional(!showOptional)}
                              className="w-full flex items-center justify-between h-10 px-4 rounded-lg bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold hover:bg-amber-100 transition-colors"
                            >
                              <span>
                                {showOptional ? "Hide" : "Add"} lab results for
                                higher accuracy
                              </span>
                              <svg
                                className={`w-4 h-4 transition-transform duration-200 ${showOptional ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </button>
                            <AnimatePresence>
                              {showOptional && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden"
                                >
                                  <p className="text-xs text-slate-400 mt-3 mb-2">
                                    Optional — leave blank to use population
                                    medians
                                  </p>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {fields.optional.map((f) => (
                                      <FieldInput
                                        key={f.name}
                                        field={f}
                                        value={formData[f.name]}
                                        onChange={handleChange}
                                      />
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        <p className="text-xs text-slate-400 leading-relaxed">
                          This tool provides AI-based screening only. It does
                          not constitute a medical diagnosis. Always consult a
                          qualified healthcare professional.
                        </p>

                        <button
                          id="predict-btn"
                          onClick={handlePredict}
                          disabled={loading}
                          className={`w-full h-11 text-sm font-semibold text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${loading ? "bg-slate-300 cursor-not-allowed" : isPremium ? "bg-amber-500 hover:bg-amber-600 focus:ring-amber-400" : "bg-teal-600 hover:bg-teal-700 focus:ring-teal-500"}`}
                        >
                          {loading ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg
                                className="animate-spin h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8v8z"
                                />
                              </svg>
                              Analysing…
                            </span>
                          ) : (
                            `Run ${isPremium ? "Premium" : "Free"} Prediction`
                          )}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.section>

            {/* RIGHT — Results + Metrics */}
            <motion.aside
              className="col-span-12 lg:col-span-5 space-y-5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div
                className="bg-white rounded-2xl border border-slate-100 p-6"
                style={{
                  boxShadow:
                    "0 1px 2px rgba(0,0,0,0.05), 0 6px 20px rgba(0,0,0,0.04)",
                }}
                aria-live="polite"
              >
                <h2
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  className="font-semibold text-slate-800 mb-5"
                >
                  Risk Assessment
                </h2>

                {loading ? (
                  <PredictionSkeleton />
                ) : result ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-5">
                      <RiskGauge
                        value={result.probability}
                        risk={result.risk}
                      />
                      <div>
                        <p
                          className="text-3xl font-bold"
                          style={{
                            color: riskColor,
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          {result.risk}
                        </p>
                        <p className="text-sm text-slate-500 mt-0.5">
                          Risk of {DISEASE_LABEL[disease]}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${result.tier === "premium" ? "bg-amber-100 text-amber-700" : "bg-teal-50 text-teal-700"}`}
                          >
                            {result.tier === "premium" ? "✨ Premium" : "Free"}
                          </span>
                          {result.isBeta && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold border border-amber-100">
                              Beta
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`px-4 py-3 rounded-xl text-xs font-medium border leading-relaxed ${result.risk === "HIGH" ? "bg-red-50 border-red-100 text-red-700" : result.risk === "MODERATE" ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-teal-50 border-teal-100 text-teal-700"}`}
                    >
                      {result.risk === "HIGH"
                        ? "Elevated risk detected. We recommend consulting a specialist promptly for further evaluation."
                        : result.risk === "MODERATE"
                          ? "Moderate risk indicators present. Consider lifestyle adjustments and schedule a health checkup."
                          : "Low risk indicators observed. Maintain healthy habits and continue with regular checkups."}
                    </div>

                    {result.predictionsRemaining !== undefined && (
                      <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                        <span>Predictions used this month</span>
                        <span
                          className={`font-semibold ${result.predictionsRemaining <= 1 ? "text-red-500" : "text-slate-700"}`}
                        >
                          {result.predictionsUsed} / {result.predictionsLimit}
                        </span>
                      </div>
                    )}

                    {/* ── Blockchain verification badge ── */}
                    <BlockchainBadge
                      predictionId={result.predictionId}
                      blockchain={result.blockchain}
                    />

                    <div className="space-y-2.5 pt-1">
                      <button
                        onClick={handleDownload}
                        className="w-full h-10 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
                      >
                        Download Certificate
                      </button>
                      <button
                        onClick={() =>
                          navigate("/ai-suggestions", {
                            state: {
                              prompt: `The user has ${result.risk} risk of ${DISEASE_LABEL[disease]}. Probability: ${result.probability}%. Suggest daily health routine, dietary plan, necessary precautions, and the specialist they should consult. Be structured and practical.`,
                              disease: DISEASE_LABEL[disease],
                              risk: result.risk,
                              probability: result.probability,
                            },
                          })
                        }
                        className="w-full h-10 text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors"
                      >
                        View AI Suggestions
                      </button>
                      {isPremium ? (
                        <button
                          onClick={() => setShowConsult(true)}
                          className="w-full h-10 text-sm font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          Consult a Doctor — ₹299
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            toast.info(
                              "Switch to Premium mode to access doctor consultations",
                            )
                          }
                          className="w-full h-10 text-sm font-semibold text-slate-400 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                          Consult a Doctor — Switch to Premium
                        </button>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-300 gap-3">
                    <svg
                      className="w-12 h-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <p className="text-sm">Run a prediction to see results</p>
                  </div>
                )}
              </div>

              {/* Model Metrics card */}
              <AnimatePresence mode="wait">
                {disease && (
                  <motion.div
                    key={`metrics-${disease}-${isPremium}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="bg-white rounded-2xl border border-slate-100 p-6"
                    style={{
                      boxShadow:
                        "0 1px 2px rgba(0,0,0,0.05), 0 6px 20px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h2
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        className="font-semibold text-slate-800"
                      >
                        Model Metrics
                      </h2>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isPremium ? "bg-amber-100 text-amber-700" : "bg-teal-50 text-teal-700"}`}
                      >
                        {isPremium ? "Premium DNN" : "Free XGBoost"}
                      </span>
                    </div>
                    <div className="space-y-3 mb-4">
                      <MetricBar label="ROC-AUC" value={metrics.roc} />
                      <MetricBar
                        label="Recall (sensitivity)"
                        value={metrics.recall}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-400 mb-1">Data used</p>
                        <p className="text-sm font-semibold text-slate-700">
                          {metrics.label}
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs text-slate-400 mb-1">
                          Architecture
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                          {metrics.model}
                        </p>
                      </div>
                    </div>
                    {!isPremium && !userIsPremium && (
                      <div className="mt-3 flex items-start gap-2 px-3.5 py-3 bg-teal-50 border border-teal-100 rounded-xl">
                        <svg
                          className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                          />
                        </svg>
                        <p className="text-xs text-teal-700 font-medium">
                          {info.upsell}
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.aside>
          </div>
        </div>
      </div>
    </>
  );
}
