// src/components/ChatPanel.jsx
import React, { useState } from "react";

export default function ChatPanel({ messages, sendMessage, username }) {
  const [text, setText] = useState("");

  const onSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setText("");
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: "10px", marginTop: "10px" }}>
      <div style={{ maxHeight: "200px", overflowY: "auto", marginBottom: "10px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: "5px" }}>
            <strong>{m.user}:</strong> {m.text}
          </div>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend(); 
          }
        }}
        placeholder="Type a message…"
        rows={2}
        style={{ width: "100%" }}
      />
      <button onClick={onSend} style={{ marginTop: "5px" }}>
        Send
      </button>
    </div>
  );
}
