// src/components/BroadcastHost.jsx
import React, { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";

import "./VideoChat.css";

export default function BroadcastHost() {
  const localVideoRef = useRef(null);
  const viewerVideoRef = useRef(null);

  const socket = useRef(null);
  const pc = useRef(null);

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    socket.current = io("https://zazza-backend.onrender.com");

    pc.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // ✅ Host receives viewer camera stream
    pc.current.ontrack = (event) => {
      viewerVideoRef.current.srcObject = event.streams[0];
      setConnected(true);
    };

    // ✅ Host sends ICE candidates to viewer
    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit("ice-candidate", {
          targetId: "viewer",
          candidate: event.candidate,
        });
      }
    };

    // ✅ Host turns on camera and adds tracks
    async function enableHostCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        // ✅ Show host's own camera
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // ✅ Add host tracks to WebRTC
        stream.getTracks().forEach((track) => {
          pc.current.addTrack(track, stream);
        });
      } catch (err) {
        console.error("Host camera error:", err);
      }
    }

    enableHostCamera();

    // ✅ Viewer joined → Host creates offer
    socket.current.on("viewer-join", async () => {
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);

      socket.current.emit("offer", {
        targetId: "viewer",
        offer,
      });
    });

    // ✅ Host receives viewer answer
    socket.current.on("answer", async ({ answer }) => {
      try {
        await pc.current.setRemoteDescription(answer);
      } catch (err) {
        console.error("Error applying viewer answer:", err);
      }
    });

    // ✅ Host receives viewer ICE
    socket.current.on("ice-candidate", async ({ candidate }) => {
      try {
        await pc.current.addIceCandidate(candidate);
      } catch (err) {
        console.error("Error adding viewer ICE:", err);
      }
    });

    return () => {
      if (socket.current) socket.current.disconnect();
      if (pc.current) pc.current.close();
    };
  }, []);

  return (
    <div className="vc-shell">
      <div className="vc-left-pane">
        <div className="vc-card vc-main-card">
          <div className="vc-card-header">
            <div className="vc-title-block">
              <h2 className="vc-title">Host</h2>
              <p className="vc-subtitle">Broadcasting live to the viewer.</p>
            </div>

            <div className="vc-metrics">
              <div className="vc-metric">
                <span className="vc-metric-label">Connection</span>
                <span className={`vc-status-pill ${connected ? "on" : "off"}`}>
                  {connected ? "Viewer Connected" : "Waiting"}
                </span>
              </div>
            </div>
          </div>

          <div className="vc-video-area">
            {/* ✅ Host camera */}
            <div className="vc-video-frame host">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                className="vc-video-element"
              />
              <div className="vc-video-overlay">
                <span className="vc-video-label">You (Host)</span>
              </div>
            </div>

            {/* ✅ Viewer camera */}
            <div className="vc-video-frame viewer">
              <video
                ref={viewerVideoRef}
                autoPlay
                playsInline
                className="vc-video-element"
              />
              <div className="vc-video-overlay">
                <span className="vc-video-label">
                  {connected ? "Viewer" : "Waiting for viewer…"}
                </span>
              </div>
            </div>
          </div>

          <div className="vc-controls-bar vc-controls-bar--compact">
            <span className="vc-hint">You are live.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
