// src/components/ChatPanel.jsx
import React, { useState, useEffect, useRef } from "react";
import "./ChatPanel.css";

export default function ChatPanel({ messages, sendMessage, username }) {
  const [text, setText] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const onSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setText("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-list" ref={listRef}>
        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat-bubble ${m.user === username ? "me" : "them"}`}
          >
            <div className="chat-user">{m.user}</div>
            <div className="chat-text">{m.text}</div>
            <div className="chat-time">
              {new Date(m.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          className="chat-input"
          rows={1}
        />
        <button className="chat-send-btn" onClick={onSend}>
          ➤
        </button>
      </div>
    </div>
  );
}
