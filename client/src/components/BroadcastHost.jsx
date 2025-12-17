// src/components/BroadcastHost.jsx
import React, { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";

import ChatPanel from "./ChatPanel";
import "./VideoChat.css";

export default function BroadcastHost() {
  const localVideoRef = useRef(null);
  const viewerVideoRef = useRef(null);

  const socket = useRef(null);
  const pc = useRef(null);

  const [connected, setConnected] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 900);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    console.log("[HOST] Mounting host component");

    socket.current = io("https://zazza-backend.onrender.com");
    console.log("[HOST] Socket connecting…");

    socket.current.on("connect", () => {
      console.log("[HOST] Socket connected:", socket.current.id);
    });

    socket.current.emit("host-join");
    console.log("[HOST] host-join emitted");

    pc.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.current.ontrack = (event) => {
      console.log("[HOST] ontrack fired — viewer video received");
      if (viewerVideoRef.current) {
        viewerVideoRef.current.srcObject = event.streams[0];
      }
      setConnected(true);
    };

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[HOST] Sending ICE candidate");
        socket.current.emit("ice-candidate", { candidate: event.candidate });
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
        console.error("[HOST] Error accessing media devices:", err);
      }
    }

    enableHostCamera();

    socket.current.on("viewer-joined", async () => {
      console.log("[HOST] viewer-joined → creating offer");
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);
      socket.current.emit("offer", { offer });
      console.log("[HOST] Offer sent to viewer");
    });

    socket.current.on("answer", async ({ answer }) => {
      console.log("[HOST] Answer received from viewer");
      await pc.current.setRemoteDescription(answer);
    });

    socket.current.on("ice-candidate", async ({ candidate }) => {
      console.log("[HOST] ICE candidate from viewer");
      await pc.current.addIceCandidate(candidate);
    });

    return () => {
      console.log("[HOST] Cleaning up");
      if (socket.current) socket.current.disconnect();
      if (pc.current) pc.current.close();
    };
  }, []);

  return (
    <div className="vc-shell">
      {/* LEFT: Videos */}
      <div className="vc-left-pane">
        <div className="vc-video-area">
          <div className="vc-video-frame">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="vc-video-element"
            />
            <div className="vc-video-overlay">You (Host)</div>
          </div>

          <div className="vc-video-frame">
            <video
              ref={viewerVideoRef}
              autoPlay
              playsInline
              className="vc-video-element"
            />
            <div className="vc-video-overlay">
              {connected ? "Viewer" : "Waiting for viewer…"}
            </div>
          </div>
        </div>

        {/* MOBILE: Chat button + drawer */}
        {isMobile && (
          <>
            <button
              className="vc-chat-button"
              onClick={() => setChatOpen(true)}
            >
              Open Chat
            </button>

            {chatOpen && (
              <div className="vc-chat-drawer">
                <button
                  className="vc-chat-close"
                  onClick={() => setChatOpen(false)}
                >
                  Close
                </button>
                {socket.current && (
                  <ChatPanel socket={socket.current} username="Host" />
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* DESKTOP: Right-side chat */}
      {!isMobile && (
        <div className="vc-right-pane">
          {socket.current && (
            <ChatPanel socket={socket.current} username="Host" />
          )}
        </div>
      )}
    </div>
  );
}
