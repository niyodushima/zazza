// src/components/ChatPanel.jsx
import React, { useEffect, useRef, useState } from "react";
import "./VideoChat.css";

export default function ChatPanel({ messages, sendMessage, username }) {
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    sendMessage(text);
    setInput("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">Live Chat</div>

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat-bubble ${
              m.from === "me" || m.user === username ? "me" : "them"
            }`}
          >
            <div className="chat-user">
              {m.from === "me" ? username : m.user || "Guest"}
            </div>
            <div className="chat-text">{m.text}</div>
            <div className="chat-time">
              {new Date(m.timestamp || Date.now()).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <input
          className="chat-input"
          placeholder="Say something nice…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button className="chat-send-btn" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
}
