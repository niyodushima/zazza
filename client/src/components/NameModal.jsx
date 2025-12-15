// src/components/NameModal.jsx
import React, { useState } from "react";
import "./NameModal.css";

export default function NameModal({ onSubmit }) {
  const [name, setName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim().length === 0) return;
    onSubmit(name.trim());
  };

  return (
    <div className="nm-backdrop">
      <div className="nm-card">
        <h2 className="nm-title">Enter your name</h2>

        <form onSubmit={handleSubmit} className="nm-form">
          <input
            type="text"
            className="nm-input"
            placeholder="Your name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />

          <button type="submit" className="nm-button">
            Join
          </button>
        </form>
      </div>
    </div>
  );
}
