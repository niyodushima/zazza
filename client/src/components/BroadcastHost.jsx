// src/components/BroadcastHost.jsx
import React, { useEffect, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import ChatPanel from "./ChatPanel";
import "./VideoChat.css";

export default function BroadcastHost() {
  const [username] = useState("Host"); // fixed Host name
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

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);

  useEffect(() => {
    joinRoom("broadcast-room");
  }, [joinRoom]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="vc-shell">
      <div className="vc-left-pane">
        <div className="vc-video-area">
          {/* Host video */}
          <div className="vc-video-frame">
            <video ref={localVideoRef} autoPlay muted playsInline className="vc-video-element" />
            <div className="vc-video-overlay">{username}</div>
          </div>

          {/* Viewer video */}
          <div className="vc-video-frame">
            <video ref={remoteVideoRef} autoPlay playsInline className="vc-video-element" />
            <div className="vc-video-overlay">
              {callActive ? "Viewer connected" : "Waiting for viewer…"}
            </div>
          </div>
        </div>

        {/* Host controls */}
        <div className="vc-controls-row">
          <button className="control-btn primary-btn" onClick={callActive ? endCall : startCall}>
            {callActive ? "End Call" : "🌈 Start Call"}
          </button>

          <div className="session-timer">
            ⏱ Session: <span>{formattedTime()}</span>
            <br />
            👥 Viewers: <span>{viewerCount}</span>
          </div>
        </div>

        {/* Desktop chat panel */}
        {!isMobile && (
          <div className="vc-right-pane">
            <ChatPanel messages={messages} sendMessage={sendChatMessage} username={username} />
          </div>
        )}
      </div>
    </div>
  );
}
