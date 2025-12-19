// src/components/BroadcastHost.jsx
import React, { useEffect, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import ChatPanel from "./ChatPanel";

export default function BroadcastHost() {
  const [username] = useState("Host");
  const {
    localVideoRef,
    remoteVideoRef,
    messages,
    sendChatMessage,
    callActive,
    formattedTime,
    joinRoom,
    startCall,
    endCall,
    viewerCount,
  } = useWebRTC("host", username);

  useEffect(() => {
    joinRoom("demo-room");
  }, [joinRoom]);

  return (
    <div style={{ padding: "20px" }}>
      <h2>Broadcast Host</h2>

      <div style={{ display: "flex", gap: "20px" }}>
        {/* Host video */}
        <div>
          <video ref={localVideoRef} autoPlay muted playsInline style={{ width: "300px", border: "1px solid #ccc" }} />
          <div>🎥 {username}</div>
        </div>

        {/* Viewer video */}
        <div>
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "300px", border: "1px solid #ccc" }} />
          <div>{callActive ? "Viewer connected" : "Waiting for viewer…"}</div>
        </div>
      </div>

      <div style={{ marginTop: "10px" }}>
        <button onClick={callActive ? endCall : startCall}>
          {callActive ? "End Call" : "Start Call"}
        </button>
      </div>

      <div style={{ marginTop: "10px" }}>
        ⏱ Session time: {formattedTime()} <br />
        👥 Viewers joined: {viewerCount}
      </div>

      <ChatPanel messages={messages} sendMessage={sendChatMessage} username={username} />
    </div>
  );
}
