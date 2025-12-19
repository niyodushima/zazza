// src/components/BroadcastViewer.jsx
import React, { useEffect, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import ChatPanel from "./ChatPanel";

export default function BroadcastViewer() {
  const [username, setUsername] = useState("Viewer");
  const { messages, sendChatMessage, joinRoom } = useWebRTC("viewer", username);

  useEffect(() => {
    joinRoom("demo-room"); // ✅ join same test room
  }, [joinRoom]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Broadcast Viewer</h2>
      <p>You are a viewer. Chat below:</p>
      <ChatPanel messages={messages} sendMessage={sendChatMessage} username={username} />
    </div>
  );
}
