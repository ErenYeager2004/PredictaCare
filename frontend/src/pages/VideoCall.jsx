/**
 * VideoCall.jsx — Agora video call room
 * Copy to: frontend/src/pages/VideoCall.jsx
 * Add to App.jsx: <Route path="/video-call/:consultationId" element={<ProtectedRoute><VideoCall /></ProtectedRoute>} />
 */

import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";
import AgoraRTC from "agora-rtc-sdk-ng";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export default function VideoCall() {
  const { consultationId } = useParams();
  const { token, userData } = useContext(AppContext);
  const navigate = useNavigate();

  const [callData,    setCallData]    = useState(null);
  const [joined,      setJoined]      = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [muted,       setMuted]       = useState(false);
  const [videoOff,    setVideoOff]    = useState(false);
  const [remoteUser,  setRemoteUser]  = useState(null);
  const [callTime,    setCallTime]    = useState(0);
  const [showNotes,   setShowNotes]   = useState(false);
  const [notes,       setNotes]       = useState("");

  const clientRef      = useRef(null);
  const localTrackRef  = useRef({ audio: null, video: null });
  const timerRef       = useRef(null);
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    fetchTokenAndJoin();
    return () => cleanup();
  }, []);

  useEffect(() => {
    if (joined) {
      timerRef.current = setInterval(() => setCallTime(t => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [joined]);

  const fetchTokenAndJoin = async () => {
    try {
      const { data } = await axios.get(
        `${BACKEND_URL}/api/consultations/token/${consultationId}`,
        { headers: { token } }
      );
      if (!data.success) throw new Error(data.message);
      setCallData(data);
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

      // Handle remote user events
      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === "video") {
          setRemoteUser(user);
          setTimeout(() => {
            if (remoteVideoRef.current) user.videoTrack?.play(remoteVideoRef.current);
          }, 100);
        }
        if (mediaType === "audio") user.audioTrack?.play();
      });

      client.on("user-unpublished", (user) => {
        setRemoteUser(null);
      });

      client.on("user-left", () => {
        setRemoteUser(null);
        toast.info("The other participant has left the call");
      });

      await client.join(appId, channelName, agoraToken, null);

      // Create local tracks
      const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
      localTrackRef.current = { audio: audioTrack, video: videoTrack };

      // Play local video
      if (localVideoRef.current) videoTrack.play(localVideoRef.current);

      await client.publish([audioTrack, videoTrack]);
      setJoined(true);
      setLoading(false);
    } catch (err) {
      console.error("Join call error:", err);
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
    try {
      await axios.post(
        `${BACKEND_URL}/api/consultations/complete`,
        { consultationId, doctorNotes: notes },
        { headers: { token } }
      );
      toast.success("Consultation completed");
      navigate("/my-consultations");
    } catch {
      navigate("/my-consultations");
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

  const formatTime = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const S = {
    page:    { minHeight: "100vh", background: "#0f172a", display: "flex", flexDirection: "column", fontFamily: "'Inter',system-ui,sans-serif" },
    header:  { background: "#1e293b", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    videos:  { flex: 1, display: "flex", gap: 8, padding: 16, position: "relative" },
    remote:  { flex: 1, background: "#1e293b", borderRadius: 16, overflow: "hidden", position: "relative", minHeight: 400 },
    local:   { position: "absolute", bottom: 24, right: 24, width: 180, height: 120, background: "#334155", borderRadius: 12, overflow: "hidden", border: "2px solid #475569" },
    controls:{ background: "#1e293b", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 16 },
    ctrlBtn: (active, danger) => ({
      width: 52, height: 52, borderRadius: "50%", border: "none", cursor: "pointer",
      background: danger ? "#dc2626" : active ? "#ef4444" : "#334155",
      color: "#fff", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
      transition: "all 0.2s",
    }),
  };

  // Post-call notes modal
  if (showNotes) return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "32px 28px", maxWidth: 480, width: "100%" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>Call Ended</h2>
        <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px" }}>Duration: {formatTime(callTime)}</p>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
          Add notes (optional)
        </label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} placeholder="Consultation notes, recommendations..."
          style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, color: "#334155", outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", marginBottom: 16 }} />
        <button onClick={handleSubmitNotes}
          style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: "#0d9488", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          Complete Consultation
        </button>
      </div>
    </div>
  );

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: joined ? "#22c55e" : "#f59e0b", animation: "pulse 1.5s infinite" }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
            {loading ? "Connecting…" : joined ? "Live" : "Waiting…"}
          </span>
        </div>
        {joined && (
          <span style={{ fontSize: 14, fontWeight: 700, color: "#22c55e", fontFamily: "monospace" }}>
            {formatTime(callTime)}
          </span>
        )}
        <span style={{ fontSize: 13, color: "#94a3b8" }}>PredictaCare Consultation</span>
      </div>

      {/* Video area */}
      <div style={S.videos}>
        {/* Remote video */}
        <div style={S.remote}>
          {remoteUser ? (
            <div ref={remoteVideoRef} style={{ width: "100%", height: "100%" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36 }}>👨‍⚕️</div>
              <p style={{ color: "#94a3b8", fontSize: 14 }}>
                {loading ? "Connecting to call…" : "Waiting for the other participant…"}
              </p>
            </div>
          )}
          {/* Local video (picture-in-picture) */}
          <div style={S.local}>
            <div ref={localVideoRef} style={{ width: "100%", height: "100%" }} />
            {videoOff && (
              <div style={{ position: "absolute", inset: 0, background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>😶</div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={S.controls}>
        <button onClick={toggleMute} style={S.ctrlBtn(muted, false)} title={muted ? "Unmute" : "Mute"}>
          {muted ? "🔇" : "🎤"}
        </button>
        <button onClick={toggleVideo} style={S.ctrlBtn(videoOff, false)} title={videoOff ? "Turn on camera" : "Turn off camera"}>
          {videoOff ? "📷" : "📹"}
        </button>
        <button onClick={handleEndCall} style={S.ctrlBtn(false, true)} title="End call">
          📵
        </button>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}
