// src/components/BroadcastViewer.jsx
import React, { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";

import NameModal from "./NameModal";
import ChatPanel from "./ChatPanel";
import HeartsOverlay from "./HeartsOverlay";

import "./VideoChat.css";

export default function BroadcastViewer() {
  const remoteVideoRef = useRef(null); // host video
  const localVideoRef = useRef(null);  // viewer preview
  const socket = useRef(null);
  const pc = useRef(null);

  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState(null);

  useEffect(() => {
    console.log("[VIEWER] Mounting viewer component");

    socket.current = io("https://zazza-backend.onrender.com");
    console.log("[VIEWER] Socket connecting…");

    pc.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Receive host stream
    pc.current.ontrack = (event) => {
      console.log("[VIEWER] ontrack fired, setting host video");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setConnected(true);
    };

    // Send ICE to server (which will relay to host)
    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[VIEWER] Sending ICE candidate");
        socket.current.emit("ice-candidate", {
          candidate: event.candidate,
        });
      }
    };

    async function enableViewerCamera() {
      try {
        console.log("[VIEWER] Requesting getUserMedia");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        stream.getTracks().forEach((track) => {
          pc.current.addTrack(track, stream);
        });

        console.log("[VIEWER] Local tracks added");
      } catch (err) {
        console.error("[VIEWER] Viewer camera error:", err);
      }
    }

    enableViewerCamera();

    // Join viewer room
    socket.current.emit("viewer-join");
    console.log("[VIEWER] viewer-join emitted");

    // Receive offer from host (server relays it)
    socket.current.on("offer", async ({ from, offer }) => {
      try {
        console.log("[VIEWER] Offer received from host");
        await pc.current.setRemoteDescription(offer);

        const answer = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answer);

        // Send answer back to server (room-based, no targetId)
        socket.current.emit("answer", {
          answer,
        });

        console.log("[VIEWER] Answer sent to host via server");
      } catch (err) {
        console.error("[VIEWER] Error handling offer:", err);
      }
    });

    // Receive ICE from host (server relays it)
    socket.current.on("ice-candidate", async ({ candidate }) => {
      try {
        console.log("[VIEWER] ICE candidate from host");
        await pc.current.addIceCandidate(candidate);
      } catch (err) {
        console.error("[VIEWER] Error adding ICE candidate", err);
      }
    });

    socket.current.on("connect", () => {
      console.log("[VIEWER] Socket connected:", socket.current.id);
    });

    socket.current.on("disconnect", () => {
      console.log("[VIEWER] Socket disconnected");
      setConnected(false);
    });

    return () => {
      console.log("[VIEWER] Cleaning up");
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
              {/* Host video */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="vc-video-element"
              />

              {/* Viewer preview (corner, not pushing layout) */}
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
