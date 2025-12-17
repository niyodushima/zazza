// src/components/NameModal.jsx
import React, { useState } from "react";
import "./VideoChat.css";

export default function NameModal({ onSubmit }) {
  const [name, setName] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  }

  return (
    <div className="name-modal-backdrop">
      <div className="name-modal">
        <h2 className="name-modal-title">Join the live</h2>
        <p className="name-modal-subtitle">Pick a name for the chat</p>
        <form onSubmit={handleSubmit} className="name-modal-form">
          <input
            className="name-modal-input"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="name-modal-btn" type="submit">
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
