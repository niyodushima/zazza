// src/components/BroadcastViewer.jsx
import React, { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";

import ChatPanel from "./ChatPanel";
import NameModal from "./NameModal";
import "./VideoChat.css";

export default function BroadcastViewer() {
  const remoteVideoRef = useRef(null);
  const localVideoRef = useRef(null);

  const socket = useRef(null);
  const pc = useRef(null);

  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    socket.current = io("https://zazza-backend.onrender.com");

    pc.current = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setConnected(true);
    };

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.current.emit("ice-candidate", { candidate: event.candidate });
      }
    };

    async function enableViewerCamera() {
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

    enableViewerCamera();

    socket.current.emit("viewer-join");

    socket.current.on("offer", async ({ offer }) => {
      await pc.current.setRemoteDescription(offer);
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      socket.current.emit("answer", { answer });
    });

    socket.current.on("ice-candidate", async ({ candidate }) => {
      await pc.current.addIceCandidate(candidate);
    });

    return () => {
      socket.current.disconnect();
      pc.current.close();
    };
  }, []);

  if (!username) {
    return <NameModal onSubmit={setUsername} />;
  }

  return (
    <div className="vc-shell">
      <div className="vc-left-pane">
        <div className="vc-video-area">
          <div className="vc-video-frame">
            <video ref={remoteVideoRef} autoPlay muted playsInline className="vc-video-element" />
            <div className="vc-video-overlay">
              {connected ? "Host" : "Waiting for host…"}
            </div>
          </div>

          <div className="vc-video-frame">
            <video ref={localVideoRef} autoPlay muted playsInline className="vc-video-element" />
            <div className="vc-video-overlay">{username}</div>
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
            <ChatPanel socket={socket.current} username={username} />
          </div>
        )}
      </div>

      {/* Desktop chat panel */}
      <div className="vc-right-pane">
        <ChatPanel socket={socket.current} username={username} />
      </div>
    </div>
  );
}
