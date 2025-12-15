// src/components/BroadcastHost.jsx
import React, { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";

import ChatPanel from "./ChatPanel";
import HeartsOverlay from "./HeartsOverlay";

import "./VideoChat.css";

export default function BroadcastHost() {
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  const socket = useRef(null);
  const peerConnections = useRef({});

  const [viewerCount, setViewerCount] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [facingMode, setFacingMode] = useState("user");

  useEffect(() => {
    socket.current = io("https://zazza-backend.onrender.com")


    socket.current.emit("host-join");

    socket.current.on("viewer-joined", async (viewerId) => {
      await createConnectionForViewer(viewerId);
    });

    socket.current.on("viewer-count", (count) => {
      setViewerCount(count);
    });

    socket.current.on("answer", async ({ from, answer }) => {
      await peerConnections.current[from].setRemoteDescription(answer);
    });

    socket.current.on("ice-candidate", async ({ from, candidate }) => {
      await peerConnections.current[from].addIceCandidate(candidate);
    });

    startLocalVideo();

    return () => {
      if (socket.current) socket.current.disconnect();
      Object.values(peerConnections.current).forEach((pc) => pc.close());
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const createPeerConnection = (viewerId) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
      ],
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit("ice-candidate", {
          targetId: viewerId,
          candidate: event.candidate,
        });
      }
    };

    return pc;
  };

  const createConnectionForViewer = async (viewerId) => {
    const pc = createPeerConnection(viewerId);
    peerConnections.current[viewerId] = pc;

    localStreamRef.current.getTracks().forEach((track) => {
      pc.addTrack(track, localStreamRef.current);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.current.emit("offer", {
      targetId: viewerId,
      offer,
    });
  };

  const startLocalVideo = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode },
      audio: true,
    });

    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  };

  const handleToggleMic = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setMicOn((prev) => !prev);
  };

  const handleToggleCamera = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setCameraOn((prev) => !prev);
  };

  const handleSwitchCamera = async () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: newMode },
      audio: true,
    });

    localStreamRef.current = newStream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = newStream;
    }

    Object.values(peerConnections.current).forEach(async (pc) => {
      const sender = pc
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");
      if (sender) {
        await sender.replaceTrack(newStream.getVideoTracks()[0]);
      }
    });
  };

  return (
    <div className="vc-shell">
      <div className="vc-left-pane">
        <div className="vc-card vc-main-card" style={{ position: "relative" }}>
          <div className="vc-card-header">
            <div className="vc-title-block">
              <h2 className="vc-title">Broadcast Host</h2>
              <p className="vc-subtitle">
                Your camera feed is streamed to all connected viewers.
              </p>
            </div>

            <div className="vc-metrics">
              <div className="vc-metric">
                <span className="vc-metric-label">Viewers</span>
                <span className="vc-metric-value">{viewerCount}</span>
              </div>
            </div>
          </div>

          <div className="vc-video-area">
            <div className="vc-video-frame host">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="vc-video-element"
              />

              {/* Hearts overlay */}
              <HeartsOverlay socket={socket.current} username="Host" />

              <div className="vc-video-overlay">
                <span className="vc-video-label">You • Host</span>
              </div>
            </div>
          </div>

          <div className="vc-controls-bar">
            <button
              className={`vc-control-btn ${micOn ? "" : "muted"}`}
              onClick={handleToggleMic}
            >
              {micOn ? "🎙️ Mute" : "🔇 Unmute"}
            </button>

            <button
              className={`vc-control-btn ${cameraOn ? "" : "off"}`}
              onClick={handleToggleCamera}
            >
              {cameraOn ? "📷 Camera Off" : "🚫 Camera On"}
            </button>

            <button className="vc-control-btn" onClick={handleSwitchCamera}>
              🔁 Switch Camera
            </button>
          </div>
        </div>
      </div>

      {/* Chat panel */}
      <div className="vc-right-pane">
        <ChatPanel socket={socket.current} username="Host" />
      </div>
    </div>
  );
}
