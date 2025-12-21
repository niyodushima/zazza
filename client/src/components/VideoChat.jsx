import React, { useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import ChatPanel from "./ChatPanel";
import HeartsOverlay from "./HeartsOverlay";
import "./VideoChat.css";

export default function VideoChat({ role = "viewer", username = "Guest" }) {
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
    sendHeart,
  } = useWebRTC(role, username);

  const [roomInput, setRoomInput] = useState("");

  return (
    <div className="vc-stage">
      {/* ✅ Room join controls */}
      <div className="vc-controls">
        <input
          type="text"
          placeholder="Enter room ID"
          value={roomInput}
          onChange={(e) => setRoomInput(e.target.value)}
        />
        <button className="primary" onClick={() => joinRoom(roomInput)}>
          Join Room
        </button>
        {role === "host" && !callActive && (
          <button className="primary" onClick={startCall}>
            Start Call
          </button>
        )}
        {callActive && (
          <button className="primary" onClick={endCall}>
            End Call
          </button>
        )}
      </div>

      {/* ✅ Video area */}
      <div className="vc-videos">
        <div className="vc-video">
          <video ref={localVideoRef} autoPlay playsInline muted />
          <span className="vc-label">Me</span>
        </div>
        <div className="vc-video">
          <video ref={remoteVideoRef} autoPlay playsInline />
          <span className="vc-label">Remote</span>
          <HeartsOverlay onHeart={sendHeart} />
        </div>
      </div>

      {/* ✅ Stats */}
      <div className="vc-stats">
        <span>⏱ {formattedTime()}</span>
        <span>👥 {viewerCount} viewers</span>
      </div>

      {/* ✅ Chat */}
      <ChatPanel
        messages={messages}
        sendMessage={sendChatMessage}
        username={username}
      />
    </div>
  );
}
