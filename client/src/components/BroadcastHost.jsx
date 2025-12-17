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

  useEffect(() => {
    socket.current = io("https://zazza-backend.onrender.com");
    socket.current.emit("host-join");

    pc.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.current.ontrack = (event) => {
      if (viewerVideoRef.current) {
        viewerVideoRef.current.srcObject = event.streams[0];
      }
      setConnected(true);
    };

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit("ice-candidate", { candidate: event.candidate });
      }
    };

    async function enableHostCamera() {
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
    }

    enableHostCamera();

    socket.current.on("viewer-joined", async () => {
      const offer = await pc.current.createOffer();
      await pc.current.setLocalDescription(offer);
      socket.current.emit("offer", { offer });
    });

    socket.current.on("answer", async ({ answer }) => {
      await pc.current.setRemoteDescription(answer);
    });

    socket.current.on("ice-candidate", async ({ candidate }) => {
      await pc.current.addIceCandidate(candidate);
    });

    return () => {
      socket.current.disconnect();
      pc.current.close();
    };
  }, []);

  return (
    <div className="vc-shell">
      <div className="vc-left-pane">
        <div className="vc-video-area">
          <div className="vc-video-frame">
            <video ref={localVideoRef} autoPlay muted playsInline className="vc-video-element" />
            <div className="vc-video-overlay">You (Host)</div>
          </div>

          <div className="vc-video-frame">
            <video ref={viewerVideoRef} autoPlay playsInline className="vc-video-element" />
            <div className="vc-video-overlay">
              {connected ? "Viewer" : "Waiting for viewer…"}
            </div>
          </div>
        </div>

        {/* Mobile chat button */}
        <button className="vc-chat-button" onClick={() => setChatOpen(true)}>
          Open Chat
        </button>

        {/* Mobile chat drawer */}
        {chatOpen && (
          <div className="vc-chat-drawer">
            <button className="vc-chat-close" onClick={() => setChatOpen(false)}>
              Close
            </button>
            <ChatPanel socket={socket.current} username="Host" />
          </div>
        )}
      </div>

      {/* Desktop chat panel */}
      <div className="vc-right-pane">
        <ChatPanel socket={socket.current} username="Host" />
      </div>
    </div>
  );
}
