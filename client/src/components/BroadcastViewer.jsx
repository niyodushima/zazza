// src/components/BroadcastViewer.jsx
import React, { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";

import NameModal from "./NameModal";
import ChatPanel from "./ChatPanel";
import HeartsOverlay from "./HeartsOverlay";

import "./VideoChat.css";

export default function BroadcastViewer() {
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null); // ✅ viewer preview
  const socket = useRef(null);
  const pc = useRef(null);

  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState(null);

  useEffect(() => {
    socket.current = io("https://zazza-backend.onrender.com");

    pc.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // ✅ Viewer receives host stream
    pc.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
      setConnected(true);
    };

    // ✅ Viewer sends ICE candidates to host
    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit("ice-candidate", {
          targetId: "host",
          candidate: event.candidate,
        });
      }
    };

    // ✅ Viewer joins room
    socket.current.emit("viewer-join");

    // ✅ Viewer receives offer from host
    socket.current.on("offer", async ({ from, offer }) => {
      await pc.current.setRemoteDescription(offer);

      // ✅ Viewer creates answer
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);

      socket.current.emit("answer", {
        targetId: from,
        answer,
      });
    });

    // ✅ Viewer receives ICE from host
    socket.current.on("ice-candidate", async ({ candidate }) => {
      try {
        await pc.current.addIceCandidate(candidate);
      } catch (err) {
        console.error("Error adding ICE candidate", err);
      }
    });

    // ✅ Viewer MUST turn on camera and send tracks
    async function enableViewerCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        // ✅ Show viewer's own camera (optional)
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // ✅ Add viewer tracks to WebRTC
        stream.getTracks().forEach((track) => {
          pc.current.addTrack(track, stream);
        });
      } catch (err) {
        console.error("Viewer camera error:", err);
      }
    }

    enableViewerCamera();

    return () => {
      if (socket.current) socket.current.disconnect();
      if (pc.current) pc.current.close();
    };
  }, []);

  const handleNameSubmit = (name) => {
    setUsername(name);
  };

  return (
    <div className="vc-shell">
      {!username && <NameModal onSubmit={handleNameSubmit} />}

      <div className="vc-left-pane">
        <div className="vc-card vc-main-card" style={{ position: "relative" }}>
          <div className="vc-card-header">
            <div className="vc-title-block">
              <h2 className="vc-title">Viewer</h2>
              <p className="vc-subtitle">
                Watching the host’s live stream in real time.
              </p>
            </div>

            <div className="vc-metrics">
              <div className="vc-metric">
                <span className="vc-metric-label">Connection</span>
                <span className={`vc-status-pill ${connected ? "on" : "off"}`}>
                  {connected ? "Connected" : "Waiting"}
                </span>
              </div>
            </div>
          </div>

          <div className="vc-video-area">
            <div className="vc-video-frame viewer">
              {/* ✅ Host video */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="vc-video-element"
              />

              {/* ✅ Viewer preview (small corner) */}
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="vc-video-element vc-local-preview"
              />

              {username && (
                <HeartsOverlay socket={socket.current} username={username} />
              )}

              <div className="vc-video-overlay">
                <span className="vc-video-label">
                  {connected ? "Live Stream" : "Waiting for host…"}
                </span>
              </div>
            </div>
          </div>

          <div className="vc-controls-bar vc-controls-bar--compact">
            <span className="vc-hint">
              Tap the video or press the ❤️ button to send hearts.
            </span>
          </div>
        </div>
      </div>

      <div className="vc-right-pane">
        {username && (
          <ChatPanel socket={socket.current} username={username} />
        )}
      </div>
    </div>
  );
}
