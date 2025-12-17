 // src/components/ChatPanel.jsx
import React, { useEffect, useRef, useState } from "react";
import "./VideoChat.css";

export default function ChatPanel({ socket, username }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handler = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("chat-message", handler);

    return () => {
      socket.off("chat-message", handler);
    };
  }, [socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;

    const msg = {
      user: username,
      text,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    socket.emit("chat-message", msg);
    setMessages((prev) => [...prev, msg]);
    setInput("");
  }

  function onKeyDown(e) {
    if (e.key === "Enter") sendMessage();
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">Live chat</div>

      <div className="chat-messages">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat-bubble ${m.user === username ? "me" : "them"}`}
          >
            <div className="chat-user">{m.user}</div>
            <div className="chat-text">{m.text}</div>
            <div className="chat-time">{m.time}</div>
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
        <button className="chat-send-btn" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}
