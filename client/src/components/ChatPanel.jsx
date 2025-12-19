// src/components/ChatPanel.jsx
import React, { useState } from "react";
import "./ChatPanel.css";

export default function ChatPanel({ messages, sendMessage, username }) {
  const [text, setText] = useState("");

  const onSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setText("");
  };

  return (
    <div className="chat">
      <div className="chat-stream">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.user === username ? "me" : ""}`}>
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
