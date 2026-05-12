/**
 * DoctorConsultations.jsx
 * Copy to: admin/src/pages/Doctor/DoctorConsultations.jsx
 * Add route in admin App.jsx:
 *   import DoctorConsultations from "./pages/Doctor/DoctorConsultations";
 *   <Route path="/doctor-consultations" element={<DoctorConsultations />} />
 * Add to Sidebar under doctor links:
 *   <NavLink to="/doctor-consultations">Consultations</NavLink>
 */

import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { DoctorContext } from "../../context/DoctorContext";

const STATUS_STYLE = {
  assigned: { bg: "#dbeafe", text: "#2563eb", label: "New Request" },
  accepted: { bg: "#dcfce7", text: "#16a34a", label: "Accepted ✓" },
  rejected: { bg: "#fee2e2", text: "#dc2626", label: "Rejected" },
  completed: { bg: "#dcfce7", text: "#16a34a", label: "Completed" },
};

const DISEASE_ICON = { heart: "❤️", diabetes: "🩸", pcos: "🔬", stroke: "🧠" };

export default function DoctorConsultations() {
  const { dToken, backendUrl } = useContext(DoctorContext);
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(null);
  const [rejectReason, setRejectReason] = useState({});
  const [showReject, setShowReject] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchConsultations();
  }, []);

  const fetchConsultations = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/consultations/doctor/my`,
        { headers: { dtoken: dToken } },
      );
      if (data.success) setConsultations(data.consultations);
    } catch {
      toast.error("Failed to load consultations");
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (id, action) => {
    setResponding(id);
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/consultations/doctor/respond`,
        { consultationId: id, action, rejectionReason: rejectReason[id] || "" },
        { headers: { dtoken: dToken } },
      );
      if (data.success) {
        toast.success(
          action === "accept"
            ? "Consultation accepted!"
            : "Consultation rejected",
        );
        setShowReject(null);
        fetchConsultations();
      } else toast.error(data.message);
    } catch {
      toast.error("Failed to respond");
    } finally {
      setResponding(null);
    }
  };

  const isCallTime = (c) => {
    if (c.status !== "accepted") return false;
    const scheduled = new Date(
      `${c.scheduledDate.split("T")[0]} ${c.scheduledTime}`,
    );
    const now = new Date();
    const diff = Math.abs(scheduled - now) / 60000;
    return diff <= 15;
  };

  const filtered =
    filter === "all"
      ? consultations
      : consultations.filter((c) => c.status === filter);

  const newRequests = consultations.filter(
    (c) => c.status === "assigned",
  ).length;

  return (
    <div className="m-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">
            My Consultations
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Accept or reject patient consultation requests
          </p>
        </div>
        <div className="flex items-center gap-3">
          {newRequests > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full">
              {newRequests} new request{newRequests > 1 ? "s" : ""}
            </span>
          )}
          <button
            onClick={fetchConsultations}
            className="text-sm text-[#5F6FFF] border border-[#5F6FFF] px-4 py-1.5 rounded-full hover:bg-[#F2F3FF] transition-all"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {["all", "assigned", "accepted", "completed", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${filter === f ? "bg-[#5F6FFF] text-white border-[#5F6FFF]" : "bg-white text-gray-500 border-gray-200 hover:border-[#5F6FFF]"}`}
          >
            {f === "all" ? "All" : STATUS_STYLE[f]?.label || f}
            {f === "assigned" && newRequests > 0 && (
              <span className="ml-1.5 bg-amber-400 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {newRequests}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400 bg-white border border-gray-200 rounded-xl">
          No consultations found
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((c) => {
            const ss = STATUS_STYLE[c.status] || {
              bg: "#f1f5f9",
              text: "#64748b",
              label: c.status,
            };
            const canJoin = c.status === "accepted";
            return (
              <div
                key={c._id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left */}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl flex-shrink-0">
                        {DISEASE_ICON[c.disease] || "💊"}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm mb-1">
                          {c.userName}
                        </p>
                        <p className="text-xs text-gray-400 mb-1">
                          {c.userEmail}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs capitalize text-gray-600 font-medium">
                            {c.disease}
                          </span>
                          {c.predictionResult && (
                            <span
                              className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.predictionResult === "HIGH" ? "bg-red-50 text-red-600" : c.predictionResult === "MODERATE" ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600"}`}
                            >
                              {c.predictionResult} risk
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: ss.bg, color: ss.text }}
                      >
                        {ss.label}
                      </span>
                      <p className="text-xs text-gray-500">
                        {new Date(c.scheduledDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        · {c.scheduledTime}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex items-center gap-3 flex-wrap">
                    {/* Accept/Reject for new requests */}
                    {c.status === "assigned" && (
                      <>
                        <button
                          onClick={() => handleRespond(c._id, "accept")}
                          disabled={responding === c._id}
                          className="text-sm bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
                        >
                          {responding === c._id ? "…" : "✓ Accept"}
                        </button>
                        <button
                          onClick={() =>
                            setShowReject(showReject === c._id ? null : c._id)
                          }
                          className="text-sm bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-lg font-semibold transition-all"
                        >
                          ✕ Reject
                        </button>
                      </>
                    )}

                    {/* Join call */}
                    {canJoin && (
                      <button
                        onClick={() => navigate(`/doctor-video-call/${c._id}`)}
                        className="text-sm bg-[#5F6FFF] hover:bg-[#4f5fe0] text-white px-4 py-2 rounded-lg font-semibold transition-all"
                      >
                        🎥 Join Call
                      </button>
                    )}

                    {c.status === "accepted" && !canJoin && (
                      <p className="text-xs text-gray-400">
                        Call starts at {c.scheduledTime} — join 15 min before
                      </p>
                    )}
                  </div>

                  {/* Reject reason input */}
                  {showReject === c._id && (
                    <div className="mt-3 flex gap-2">
                      <input
                        value={rejectReason[c._id] || ""}
                        onChange={(e) =>
                          setRejectReason((r) => ({
                            ...r,
                            [c._id]: e.target.value,
                          }))
                        }
                        placeholder="Reason for rejection (optional)"
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none"
                      />
                      <button
                        onClick={() => handleRespond(c._id, "reject")}
                        disabled={responding === c._id}
                        className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
                      >
                        {responding === c._id ? "…" : "Confirm"}
                      </button>
                    </div>
                  )}

                  {/* Doctor notes if completed */}
                  {c.status === "completed" && (
                    <div className="mt-3 flex flex-col gap-2">
                      {c.doctorNotes && (
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-600">
                          <strong>Your Notes:</strong> {c.doctorNotes}
                        </div>
                      )}

                      {c.rating ? (
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 text-sm text-amber-800">
                          <p className="font-semibold text-xs text-amber-500 mb-1">
                            PATIENT RATING
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {"⭐".repeat(c.rating)}
                            </span>
                            <span className="font-bold text-amber-700">
                              {c.rating}/5
                            </span>
                          </div>
                          {c.userFeedback && (
                            <p className="mt-1 text-amber-700 italic">
                              "{c.userFeedback}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-400 italic">
                          Patient hasn't rated yet
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
