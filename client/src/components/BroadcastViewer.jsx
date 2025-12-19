// src/components/BroadcastViewer.jsx
import React, { useEffect } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import ChatPanel from "./ChatPanel";
import HeartsOverlay from "./HeartsOverlay";
import "./VideoChat.css";

export default function BroadcastViewer({ username = "Viewer" }) {
  const {
    remoteVideoRef,
    messages,
    sendChatMessage,
    callActive,
    joinRoom,
    viewerCount,
    formattedTime,
    sendHeart,
  } = useWebRTC("viewer", username);

  useEffect(() => {
    joinRoom("demo-room");
  }, []);

  return (
    <div className="vc-stage">
      <div className="vc-videos">
        <div className="vc-video wide">
          <video ref={remoteVideoRef} autoPlay playsInline />
          <div className="vc-label">
            {callActive ? "Live" : "Waiting for host…"}
          </div>
          <HeartsOverlay onHeart={() => sendHeart()} />
        </div>
      </div>

      <div className="vc-controls">
        <div className="vc-stats">
          ⏱ {formattedTime()} • 👥 {viewerCount}
        </div>
      </div>

      <ChatPanel messages={messages} sendMessage={sendChatMessage} username={username} />
    </div>
  );
}
