// src/components/NameModal.jsx
import React, { useState } from "react";
import "./NameModal.css";

export default function NameModal({ onSubmit, role }) {
  const [name, setName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <div className="modal-backdrop">
      <form className="modal-card" onSubmit={handleSubmit}>
        <h3>{role === "host" ? "Name your session" : "Enter your name"}</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={role === "host" ? "Host name" : "Your name"}
        />
        <button type="submit" className="primary">Continue</button>
      </form>
    </div>
  );
}
