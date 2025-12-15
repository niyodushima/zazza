// src/components/BroadcastViewer.jsx
import React, { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";

import NameModal from "./NameModal";
import ChatPanel from "./ChatPanel";
import HeartsOverlay from "./HeartsOverlay";

import "./VideoChat.css";

export default function BroadcastViewer() {
  const remoteVideoRef = useRef(null);
  const socket = useRef(null);
  const pc = useRef(null);

  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState(null);

  useEffect(() => {
    socket.current = io("https://zazza-backend.onrender.com")


    pc.current = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
      ],
    });

    pc.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
      setConnected(true);
    };

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit("ice-candidate", {
          targetId: "host",
          candidate: event.candidate,
        });
      }
    };

    socket.current.emit("viewer-join");

    socket.current.on("offer", async ({ from, offer }) => {
      await pc.current.setRemoteDescription(offer);

      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);

      socket.current.emit("answer", {
        targetId: from,
        answer,
      });
    });

    socket.current.on("ice-candidate", async ({ candidate }) => {
      await pc.current.addIceCandidate(candidate);
    });

    return () => {
      if (socket.current) socket.current.disconnect();
      if (pc.current) pc.current.close();
    };
  }, []);

  // Handle username submission
  const handleNameSubmit = (name) => {
    setUsername(name);
  };

  return (
    <div className="vc-shell">
      {/* Show modal until username is set */}
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
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="vc-video-element"
              />

              {/* Hearts overlay */}
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

      {/* Chat panel */}
      <div className="vc-right-pane">
        {username && (
          <ChatPanel socket={socket.current} username={username} />
        )}
      </div>
    </div>
  );
}
