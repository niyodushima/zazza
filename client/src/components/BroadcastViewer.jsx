// src/components/BroadcastViewer.jsx
import React, { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";

import ChatPanel from "./ChatPanel";
import NameModal from "./NameModal";
import "./VideoChat.css";

export default function BroadcastViewer() {
  const remoteVideoRef = useRef(null); // host video
  const localVideoRef = useRef(null);  // viewer video

  const socket = useRef(null);
  const pc = useRef(null);

  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState(null);
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
    console.log("[VIEWER] Mounting viewer component");

    socket.current = io("https://zazza-backend.onrender.com");
    console.log("[VIEWER] Socket connecting…");

    socket.current.on("connect", () => {
      console.log("[VIEWER] Socket connected:", socket.current.id);
    });

    pc.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.current.ontrack = (event) => {
      console.log("[VIEWER] ontrack fired, setting host video");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setConnected(true);
    };

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("[VIEWER] Sending ICE candidate");
        socket.current.emit("ice-candidate", { candidate: event.candidate });
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
        console.error("[VIEWER] Error accessing media devices:", err);
      }
    }

    enableViewerCamera();

    console.log("[VIEWER] viewer-join emitted");
    socket.current.emit("viewer-join");

    socket.current.on("offer", async ({ offer }) => {
      console.log("[VIEWER] Offer received from host");
      await pc.current.setRemoteDescription(offer);
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      socket.current.emit("answer", { answer });
      console.log("[VIEWER] Answer sent to host via server");
    });

    socket.current.on("ice-candidate", async ({ candidate }) => {
      console.log("[VIEWER] ICE candidate from host");
      await pc.current.addIceCandidate(candidate);
    });

    return () => {
      console.log("[VIEWER] Cleaning up");
      if (socket.current) socket.current.disconnect();
      if (pc.current) pc.current.close();
    };
  }, []);

  if (!username) {
    return <NameModal onSubmit={setUsername} />;
  }

  return (
    <div className="vc-shell">
      {/* LEFT: Videos */}
      <div className="vc-left-pane">
        <div className="vc-video-area">
          <div className="vc-video-frame">
            <video
              ref={remoteVideoRef}
              autoPlay
              muted
              playsInline
              className="vc-video-element"
            />
            <div className="vc-video-overlay">
              {connected ? "Host" : "Waiting for host…"}
            </div>
          </div>

          <div className="vc-video-frame">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="vc-video-element"
            />
            <div className="vc-video-overlay">{username}</div>
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
                  <ChatPanel socket={socket.current} username={username} />
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
            <ChatPanel socket={socket.current} username={username} />
          )}
        </div>
      )}
    </div>
  );
}
