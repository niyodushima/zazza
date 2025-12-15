// src/components/ChatPanel.jsx
import React, { useEffect, useRef, useState } from "react";
import "./ChatPanel.css";

export default function ChatPanel({ socket, username }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const scrollRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.on("chat-message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      socket.off("chat-message");
    };
  }, [socket]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;

    const msg = {
      name: username,
      message: input.trim(),
    };

    socket.emit("chat-message", msg);
    setInput("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter") sendMessage();
  };

  return (
    <div className="chat-panel">
      <h3 className="chat-title">Live Chat</h3>

      <div className="chat-messages" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className="chat-message">
            <span className="chat-name">{m.name}:</span>
            <span className="chat-text">{m.message}</span>
          </div>
        ))}
      </div>

      <div className="chat-input-row">
        <input
          className="chat-input"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
        />
        <button className="chat-send" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}
