// src/components/BroadcastHost.jsx
import React, { useEffect, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import ChatPanel from "./ChatPanel";

export default function BroadcastHost() {
  const [username] = useState("Host");
  const { messages, sendChatMessage, joinRoom } = useWebRTC("host", username);

  useEffect(() => {
    joinRoom("demo-room"); // ✅ join a test room
  }, [joinRoom]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Broadcast Host</h2>
      <p>You are the host. Chat below:</p>
      <ChatPanel messages={messages} sendMessage={sendChatMessage} username={username} />
    </div>
  );
}
