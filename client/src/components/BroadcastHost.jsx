// src/components/BroadcastHost.jsx
import React, { useEffect, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import ChatPanel from "./ChatPanel";
import "./VideoChat.css";

export default function BroadcastHost() {
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
  } = useWebRTC("host");

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const [chatOpen, setChatOpen] = useState(false);

  // Auto-join the broadcast room
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
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="vc-video-element"
            />
            <div className="vc-video-overlay">You (Host)</div>
          </div>

          {/* Viewer video */}
          <div className="vc-video-frame">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="vc-video-element"
            />
            <div className="vc-video-overlay">
              {callActive ? "Viewer connected" : "Waiting for viewer…"}
            </div>
          </div>
        </div>

        {/* Host controls */}
        <div className="vc-controls-row">
          <button
            className="control-btn primary-btn"
            onClick={callActive ? endCall : startCall}
          >
            {callActive ? "End Call" : "🌈 Start Call"}
          </button>

          <div className="session-timer">
            ⏱ Session: <span>{formattedTime()}</span>
          </div>
        </div>

        {/* Mobile chat drawer */}
        {isMobile && (
          <>
            <button
              className="vc-chat-button"
              onClick={() => setChatOpen(true)}
            >
              💬 Open chat
            </button>

            {chatOpen && (
              <div className="vc-chat-drawer">
                <button
                  className="vc-chat-close"
                  onClick={() => setChatOpen(false)}
                >
                  ✖ Close
                </button>
                <div className="vc-chat-drawer-inner">
                  <ChatPanel
                    messages={messages}
                    sendMessage={sendChatMessage}
                    username="Host"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Desktop chat panel */}
      {!isMobile && (
        <div className="vc-right-pane">
          <ChatPanel
            messages={messages}
            sendMessage={sendChatMessage}
            username="Host"
          />
        </div>
      )}
    </div>
  );
}
// src/components/BroadcastHost.jsx
import React, { useEffect, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import ChatPanel from "./ChatPanel";
import "./VideoChat.css";

export default function BroadcastHost() {
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
  } = useWebRTC("host");

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const [chatOpen, setChatOpen] = useState(false);

  // Auto-join the broadcast room
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
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="vc-video-element"
            />
            <div className="vc-video-overlay">You (Host)</div>
          </div>

          {/* Viewer video */}
          <div className="vc-video-frame">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="vc-video-element"
            />
            <div className="vc-video-overlay">
              {callActive ? "Viewer connected" : "Waiting for viewer…"}
            </div>
          </div>
        </div>

        {/* Host controls */}
        <div className="vc-controls-row">
          <button
            className="control-btn primary-btn"
            onClick={callActive ? endCall : startCall}
          >
            {callActive ? "End Call" : "🌈 Start Call"}
          </button>

          <div className="session-timer">
            ⏱ Session: <span>{formattedTime()}</span>
          </div>
        </div>

        {/* Mobile chat drawer */}
        {isMobile && (
          <>
            <button
              className="vc-chat-button"
              onClick={() => setChatOpen(true)}
            >
              💬 Open chat
            </button>

            {chatOpen && (
              <div className="vc-chat-drawer">
                <button
                  className="vc-chat-close"
                  onClick={() => setChatOpen(false)}
                >
                  ✖ Close
                </button>
                <div className="vc-chat-drawer-inner">
                  <ChatPanel
                    messages={messages}
                    sendMessage={sendChatMessage}
                    username="Host"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Desktop chat panel */}
      {!isMobile && (
        <div className="vc-right-pane">
          <ChatPanel
            messages={messages}
            sendMessage={sendChatMessage}
            username="Host"
          />
        </div>
      )}
    </div>
  );
}
// src/components/BroadcastHost.jsx
import React, { useEffect, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import ChatPanel from "./ChatPanel";
import "./VideoChat.css";

export default function BroadcastHost() {
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
  } = useWebRTC("host");

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const [chatOpen, setChatOpen] = useState(false);

  // Auto-join the broadcast room
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
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="vc-video-element"
            />
            <div className="vc-video-overlay">You (Host)</div>
          </div>

          {/* Viewer video */}
          <div className="vc-video-frame">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="vc-video-element"
            />
            <div className="vc-video-overlay">
              {callActive ? "Viewer connected" : "Waiting for viewer…"}
            </div>
          </div>
        </div>

        {/* Host controls */}
        <div className="vc-controls-row">
          <button
            className="control-btn primary-btn"
            onClick={callActive ? endCall : startCall}
          >
            {callActive ? "End Call" : "🌈 Start Call"}
          </button>

          <div className="session-timer">
            ⏱ Session: <span>{formattedTime()}</span>
          </div>
        </div>

        {/* Mobile chat drawer */}
        {isMobile && (
          <>
            <button
              className="vc-chat-button"
              onClick={() => setChatOpen(true)}
            >
              💬 Open chat
            </button>

            {chatOpen && (
              <div className="vc-chat-drawer">
                <button
                  className="vc-chat-close"
                  onClick={() => setChatOpen(false)}
                >
                  ✖ Close
                </button>
                <div className="vc-chat-drawer-inner">
                  <ChatPanel
                    messages={messages}
                    sendMessage={sendChatMessage}
                    username="Host"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Desktop chat panel */}
      {!isMobile && (
        <div className="vc-right-pane">
          <ChatPanel
            messages={messages}
            sendMessage={sendChatMessage}
            username="Host"
          />
        </div>
      )}
    </div>
  );
}
