// src/components/BroadcastViewer.jsx
import React, { useEffect, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import ChatPanel from "./ChatPanel";

export default function BroadcastViewer() {
  const [username] = useState("Viewer");
  const {
    remoteVideoRef,
    messages,
    sendChatMessage,
    callActive,
    joinRoom,
    viewerCount,
    formattedTime,
  } = useWebRTC("viewer", username);

  useEffect(() => {
    if (typeof joinRoom === "function") {
      joinRoom("demo-room");
    }
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Broadcast Viewer</h2>

      <div>
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{ width: "400px", border: "1px solid #ccc" }}
        />
        <div>{callActive ? "Host connected" : "Waiting for host…"}</div>
      </div>

      <div style={{ marginTop: "10px" }}>
        👥 {viewerCount} watching <br />
        ⏱ Live for {formattedTime()}
      </div>

      <ChatPanel messages={messages} sendMessage={sendChatMessage} username={username} />
    </div>
  );
}
