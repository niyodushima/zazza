// src/VideoChat.jsx
import React, { useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import "./VideoChat.css";

export default function VideoChat() {
  const {
    localVideoRef,
    remoteVideoRef,
    micOn,
    cameraOn,
    screenSharing,
    messages,
    callActive,
    recording,
    formattedTime,
    randomMatch,
    joinRoom,
    startCall,
    endCall,
    toggleMic,
    toggleCamera,
    switchCamera,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
    startRecording,
    stopRecording,
  } = useWebRTC();

  const [roomIdInput, setRoomIdInput] = useState("");
  const [chatInput, setChatInput] = useState("");

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    sendChatMessage(chatInput);
    setChatInput("");
  };

  return (
    <div className="videochat-container">
      <div className="video-section">
        <div className="video-wrapper">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="remote-video"
          />
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="local-video"
          />
          {!callActive && (
            <div className="video-overlay-label">
              Waiting for connection…
            </div>
          )}
        </div>

        <div className="controls-card">
          <div className="matchmaking">
            <button className="control-btn primary-btn" onClick={randomMatch}>
              🎲 Random Match
            </button>

            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
            />

            <button
              className="control-btn secondary-btn"
              onClick={() => joinRoom(roomIdInput)}
            >
              🔗 Join Room
            </button>
          </div>

          <div className="main-controls">
            <button className="control-btn primary-btn" onClick={startCall}>
              {callActive ? "Reconnect" : "🌈 Start Call"}
            </button>

            <button className="control-btn pill-btn" onClick={toggleMic}>
              {micOn ? "🎤 Mute" : "🔇 Unmute"}
            </button>

            <button className="control-btn pill-btn" onClick={toggleCamera}>
              {cameraOn ? "📷 Camera Off" : "📸 Camera On"}
            </button>

            <button
              className="control-btn pill-btn"
              onClick={screenSharing ? stopScreenShare : startScreenShare}
            >
              {screenSharing ? "🛑 Stop Sharing" : "🖥️ Share Screen"}
            </button>

            <button className="control-btn pill-btn" onClick={switchCamera}>
              🔄 Switch Camera
            </button>

            <button
              className="control-btn pill-btn"
              onClick={recording ? stopRecording : startRecording}
            >
              {recording ? "⏹ Stop Rec" : "⏺ Record"}
            </button>

            <button className="control-btn danger-btn" onClick={endCall}>
              ❌ End Call
            </button>

            <div className="session-timer">
              ⏱ Session: <span>{formattedTime()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="chat-section">
        <div className="chat-header">
          <span className="chat-title">Live Chat</span>
          <span className="chat-subtitle">
            Say hi, share links, drop gems 💬
          </span>
        </div>

        <div className="chat-messages">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.from === "me"
                  ? "chat-msg chat-msg-me"
                  : "chat-msg chat-msg-them"
              }
            >
              <span className="chat-text">{m.text}</span>
            </div>
          ))}
        </div>

        <div className="chat-input-row">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a playful message..."
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSendChat();
            }}
          />
          <button className="control-btn primary-btn" onClick={handleSendChat}>
            ➤ Send
          </button>
        </div>
      </div>
    </div>
  );
}
