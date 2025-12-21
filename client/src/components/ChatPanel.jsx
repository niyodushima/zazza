import React, { useState } from "react";
import "./ChatPanel.css";
import Logo from "../assets/xchange (2).svg"; // ✅ import your logo

export default function ChatPanel({ messages, sendMessage, username }) {
  const [text, setText] = useState("");

  const onSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setText("");
  };

  const sortedMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="chat">
      {/* ✅ Logo header */}
      <div className="chat-header">
        <img src={Logo} alt="Xchange Logo" className="chat-logo" />
        <span className="chat-title">Xchange Chat</span>
      </div>

      <div className="chat-stream">
        {sortedMessages.map((m, i) => (
          <div
            key={i}
            className={`chat-msg ${m.user === username ? "me" : "other"}`}
          >
            <span className="chat-user">{m.user}</span>
            <span className="chat-text">{m.text}</span>
          </div>
        ))}
      </div>

      <div className="chat-input">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
        <button className="primary" onClick={onSend}>Send</button>
      </div>
    </div>
  );
}
