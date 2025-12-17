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
    console.log("[HOST] Mounting host component");

    socket.current = io("https://zazza-backend.onrender.com");
    console.log("[HOST] Socket connecting…");

    pc.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    // Receive viewer camera
    pc.current.ontrack = (event) => {
      console.log("[HOST] ontrack fired, setting viewer video");
      if (viewerVideoRef.current) {
        viewerVideoRef.current.srcObject = event.streams[0];
      }
      setConnected(true);
    };

    // Send ICE to viewer
    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[HOST] Sending ICE to viewer");
        socket.current.emit("ice-candidate", {
          targetId: "viewer",
          candidate: event.candidate,
        });
      }
    };

    async function enableHostCamera() {
      try {
        console.log("[HOST] Requesting getUserMedia");
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

        console.log("[HOST] Local tracks added");
      } catch (err) {
        console.error("[HOST] Host camera error:", err);
      }
    }

    enableHostCamera();

    // Viewer joined → create offer
    socket.current.on("viewer-join", async () => {
      console.log("[HOST] viewer-join received → creating offer");
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);

      socket.current.emit("offer", {
        targetId: "viewer",
        offer,
      });
      console.log("[HOST] Offer sent to viewer");
    });

    // Receive viewer answer
    socket.current.on("answer", async ({ answer }) => {
      try {
        console.log("[HOST] Answer received from viewer");
        await pc.current.setRemoteDescription(answer);
      } catch (err) {
        console.error("[HOST] Error applying viewer answer:", err);
      }
    });

    // Receive viewer ICE
    socket.current.on("ice-candidate", async ({ candidate }) => {
      try {
        console.log("[HOST] ICE candidate from viewer");
        await pc.current.addIceCandidate(candidate);
      } catch (err) {
        console.error("[HOST] Error adding viewer ICE:", err);
      }
    });

    socket.current.on("connect", () => {
      console.log("[HOST] Socket connected:", socket.current.id);
    });

    socket.current.on("disconnect", () => {
      console.log("[HOST] Socket disconnected");
      setConnected(false);
    });

    return () => {
      console.log("[HOST] Cleaning up");
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
            {/* Host camera */}
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

            {/* Viewer camera */}
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
