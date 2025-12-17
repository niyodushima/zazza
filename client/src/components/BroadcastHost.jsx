// src/components/BroadcastHost.jsx
import React, { useEffect, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import ChatPanel from "./ChatPanel";
import "./VideoChat.css";

export default function BroadcastHost() {
  const { socket, localVideoRef, remoteVideoRef, connected } = useWebRTC("host");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="vc-shell">
      <div className="vc-left-pane">
        <div className="vc-video-area">
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

          <div className="vc-video-frame">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="vc-video-element"
            />
            <div className="vc-video-overlay">
              {connected ? "Viewer" : "Waiting for viewer…"}
            </div>
          </div>
        </div>

        {isMobile && (
          <>
            <button
              className="vc-chat-button"
              onClick={() => setChatOpen(true)}
            >
              Open chat
            </button>

            {chatOpen && (
              <div className="vc-chat-drawer">
                <button
                  className="vc-chat-close"
                  onClick={() => setChatOpen(false)}
                >
                  Close
                </button>
                <div className="vc-chat-drawer-inner">
                  {socket.current && (
                    <ChatPanel socket={socket.current} username="Host" />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {!isMobile && (
        <div className="vc-right-pane">
          {socket.current && (
            <ChatPanel socket={socket.current} username="Host" />
          )}
        </div>
      )}
    </div>
  );
}
