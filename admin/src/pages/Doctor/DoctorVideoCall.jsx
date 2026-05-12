/**
 * DoctorVideoCall.jsx — Doctor's video call room
 * Copy to: admin/src/pages/Doctor/DoctorVideoCall.jsx
 * Add route in admin App.jsx:
 *   import DoctorVideoCall from "./pages/Doctor/DoctorVideoCall";
 *   <Route path="/doctor-video-call/:consultationId" element={<DoctorVideoCall />} />
 */

import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { DoctorContext } from "../../context/DoctorContext";
import AgoraRTC from "agora-rtc-sdk-ng";

export default function DoctorVideoCall() {
  const { consultationId } = useParams();
  const { dToken, backendUrl } = useContext(DoctorContext);
  const navigate = useNavigate();

  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [remoteUser, setRemoteUser] = useState(null);
  const [callTime, setCallTime] = useState(0);
  const [consultation, setConsultation] = useState(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [prescription, setPrescription] = useState("");
  const [followUp, setFollowUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const clientRef = useRef(null);
  const localTrackRef = useRef({ audio: null, video: null });
  const timerRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    fetchAndJoin();
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (joined) {
      timerRef.current = setInterval(() => setCallTime((t) => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [joined]);

  const fetchAndJoin = async () => {
    try {
      // Doctor uses same token endpoint but with dtoken header
      const { data } = await axios.get(
        `${backendUrl}/api/consultations/doctor/token/${consultationId}`,
        { headers: { dtoken: dToken } },
      );
      if (!data.success) throw new Error(data.message);
      setConsultation(data);
      await joinCall(data);
    } catch (err) {
      toast.error(err.message || "Failed to join call");
      setLoading(false);
    }
  };

  const joinCall = async ({ token: agoraToken, channelName, appId }) => {
    try {
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === "video") {
          setRemoteUser(user);
          setTimeout(() => {
            if (remoteVideoRef.current)
              user.videoTrack?.play(remoteVideoRef.current);
          }, 100);
        }
        if (mediaType === "audio") user.audioTrack?.play();
      });

      client.on("user-unpublished", () => setRemoteUser(null));
      client.on("user-left", () => {
        setRemoteUser(null);
        toast.info("Patient has left the call");
      });

      await client.join(appId, channelName, agoraToken, null);

      const [audioTrack, videoTrack] =
        await AgoraRTC.createMicrophoneAndCameraTracks();
      localTrackRef.current = { audio: audioTrack, video: videoTrack };

      if (localVideoRef.current) videoTrack.play(localVideoRef.current);
      await client.publish([audioTrack, videoTrack]);
      setJoined(true);
      setLoading(false);
    } catch (err) {
      console.error("Join error:", err);
      toast.error("Failed to access camera/microphone");
      setLoading(false);
    }
  };

  const cleanup = async () => {
    clearInterval(timerRef.current);
    localTrackRef.current.audio?.close();
    localTrackRef.current.video?.close();
    await clientRef.current?.leave();
  };

  const handleEndCall = async () => {
    await cleanup();
    setShowNotes(true);
  };

  const handleSubmitNotes = async () => {
    setSubmitting(true);
    try {
      await axios.post(
        `${backendUrl}/api/consultations/complete`,
        {
          consultationId,
          doctorNotes: notes,
          prescription,
          followUpRequired: followUp,
        },
        { headers: { dtoken: dToken } },
      );
      toast.success("Consultation completed successfully!");
      navigate("/doctor-consultations");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMute = () => {
    localTrackRef.current.audio?.setEnabled(muted);
    setMuted(!muted);
  };
  const toggleVideo = () => {
    localTrackRef.current.video?.setEnabled(videoOff);
    setVideoOff(!videoOff);
  };
  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const S = {
    page: {
      minHeight: "100vh",
      background: "#0f172a",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Inter',system-ui,sans-serif",
    },
    header: {
      background: "#1e293b",
      padding: "12px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    videos: {
      flex: 1,
      display: "flex",
      gap: 8,
      padding: 16,
      position: "relative",
    },
    remote: {
      flex: 1,
      background: "#1e293b",
      borderRadius: 16,
      overflow: "hidden",
      position: "relative",
      minHeight: 400,
    },
    local: {
      position: "absolute",
      bottom: 24,
      right: 24,
      width: 180,
      height: 120,
      background: "#334155",
      borderRadius: 12,
      overflow: "hidden",
      border: "2px solid #475569",
    },
    controls: {
      background: "#1e293b",
      padding: "20px 24px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
    },
    ctrlBtn: (active, danger) => ({
      width: 52,
      height: 52,
      borderRadius: "50%",
      border: "none",
      cursor: "pointer",
      background: danger ? "#dc2626" : active ? "#ef4444" : "#334155",
      color: "#fff",
      fontSize: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s",
    }),
    inputStyle: {
      width: "100%",
      padding: "10px 14px",
      borderRadius: 10,
      border: "1.5px solid #e2e8f0",
      fontSize: 14,
      color: "#334155",
      outline: "none",
      boxSizing: "border-box",
      fontFamily: "inherit",
      marginBottom: 14,
    },
  };

  // Post-call notes
  if (showNotes)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "'Inter',system-ui,sans-serif",
        }}
      >
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "32px 28px",
            maxWidth: 520,
            width: "100%",
          }}
        >
          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: "#0f172a",
              margin: "0 0 4px",
            }}
          >
            Consultation Summary
          </h2>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 24px" }}>
            Duration: {formatTime(callTime)} · Please add your notes before
            closing
          </p>

          <label
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              display: "block",
              marginBottom: 6,
            }}
          >
            Consultation Notes *
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Diagnosis, observations, recommendations..."
            style={{ ...S.inputStyle, resize: "vertical" }}
          />

          <label
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              display: "block",
              marginBottom: 6,
            }}
          >
            Prescription (optional)
          </label>
          <textarea
            value={prescription}
            onChange={(e) => setPrescription(e.target.value)}
            rows={3}
            placeholder="Medications, dosage, duration..."
            style={{ ...S.inputStyle, resize: "vertical" }}
          />

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <input
              type="checkbox"
              id="followUp"
              checked={followUp}
              onChange={(e) => setFollowUp(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "#0d9488" }}
            />
            <label
              htmlFor="followUp"
              style={{ fontSize: 13, color: "#334155", cursor: "pointer" }}
            >
              Follow-up consultation recommended
            </label>
          </div>

          <button
            onClick={handleSubmitNotes}
            disabled={submitting || !notes.trim()}
            style={{
              width: "100%",
              padding: "13px",
              borderRadius: 12,
              border: "none",
              background: "#0d9488",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              opacity: submitting || !notes.trim() ? 0.7 : 1,
            }}
          >
            {submitting ? "Saving…" : "Complete Consultation"}
          </button>
        </div>
      </div>
    );

  return (
    <div style={S.page}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>

      {/* Header */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: joined ? "#22c55e" : "#f59e0b",
              animation: "pulse 1.5s infinite",
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
            {loading
              ? "Connecting…"
              : joined
                ? "Live — Doctor View"
                : "Waiting…"}
          </span>
        </div>
        {joined && (
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#22c55e",
              fontFamily: "monospace",
            }}
          >
            {formatTime(callTime)}
          </span>
        )}
        <span style={{ fontSize: 13, color: "#94a3b8" }}>
          PredictaCare · Doctor Dashboard
        </span>
      </div>

      {/* Video area */}
      <div style={S.videos}>
        <div style={S.remote}>
          {remoteUser ? (
            <div
              ref={remoteVideoRef}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "#334155",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 36,
                }}
              >
                🧑
              </div>
              <p style={{ color: "#94a3b8", fontSize: 14 }}>
                {loading ? "Setting up call…" : "Waiting for patient to join…"}
              </p>
            </div>
          )}
          {/* Local (doctor) PiP */}
          <div style={S.local}>
            <div
              ref={localVideoRef}
              style={{ width: "100%", height: "100%" }}
            />
            {videoOff && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#1e293b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                }}
              >
                👨‍⚕️
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={S.controls}>
        <button
          onClick={toggleMute}
          style={S.ctrlBtn(muted, false)}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? "🔇" : "🎤"}
        </button>
        <button
          onClick={toggleVideo}
          style={S.ctrlBtn(videoOff, false)}
          title={videoOff ? "Camera on" : "Camera off"}
        >
          {videoOff ? "📷" : "📹"}
        </button>
        <button
          onClick={handleEndCall}
          style={S.ctrlBtn(false, true)}
          title="End call"
        >
          📵
        </button>
      </div>
    </div>
  );
}
