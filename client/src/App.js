// src/App.js
import React from "react";
import "./App.css";

import BroadcastHost from "./components/BroadcastHost";
import BroadcastViewer from "./components/BroadcastViewer";
import VideoChat from "./components/VideoChat";

export default function App() {
  const path = window.location.pathname;

  const current =
    path === "/host" ? "host" :
    path === "/viewer" ? "viewer" :
    "call";

  return (
    <div className="app-root">
      <div className="app-shell">

        {/* ✅ NAVBAR */}
        <header className="app-nav">

          {/* LEFT SIDE */}
          <div className="app-nav-left">
            <div className="app-logo-mark">
              <img src="/zazza.png" alt="Zazza Logo" className="app-logo-img" />
            </div>

            <div className="app-title-block">
              <span className="app-title">Zazza Live</span>
              <span className="app-subtitle">Real-time WebRTC streaming</span>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="app-nav-right">
            <button
              className={`app-nav-button ${current === "call" ? "active" : ""}`}
              onClick={() => (window.location.pathname = "/call")}
            >
              <span className="icon">📞</span>
              <span>1‑to‑1 Call</span>
            </button>

            <button
              className={`app-nav-button ${current === "host" ? "active" : ""}`}
              onClick={() => (window.location.pathname = "/host")}
            >
              <span className="icon">📡</span>
              <span>Host</span>
            </button>

            <button
              className={`app-nav-button ${current === "viewer" ? "active" : ""}`}
              onClick={() => (window.location.pathname = "/viewer")}
            >
              <span className="icon">👁️</span>
              <span>Viewer</span>
            </button>
          </div>

        </header>

        {/* ✅ MAIN CONTENT */}
        <main className="app-main-panel">
          {current === "host" && <BroadcastHost />}
          {current === "viewer" && <BroadcastViewer />}
          {current === "call" && <VideoChat />}
        </main>

      </div>
    </div>
  );
}
