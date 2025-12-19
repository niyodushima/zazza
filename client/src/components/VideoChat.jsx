// src/components/VideoChat.jsx
import React, { useState } from "react";
import BroadcastHost from "./BroadcastHost";
import BroadcastViewer from "./BroadcastViewer";
import NameModal from "./NameModal";
import "./VideoChat.css";

export default function VideoChat() {
  const [role, setRole] = useState(null);
  const [name, setName] = useState("");

  return (
    <div className="vc-container">
      {!role ? (
        <div className="vc-landing">
          <h1>Xchange Live</h1>
          <p>Host a micro-mentoring session or join as a viewer.</p>
          <div className="vc-actions">
            <button onClick={() => setRole("host")} className="primary">Host</button>
            <button onClick={() => setRole("viewer")} className="secondary">Join</button>
          </div>
        </div>
      ) : !name ? (
        <NameModal onSubmit={setName} role={role} />
      ) : role === "host" ? (
        <BroadcastHost username={name} />
      ) : (
        <BroadcastViewer username={name} />
      )}
    </div>
  );
}
