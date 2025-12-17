// src/App.js
import React from "react";
import "./App.css";

import BroadcastHost from "./components/BroadcastHost";
import BroadcastViewer from "./components/BroadcastViewer";
import VideoChat from "./components/VideoChat";

export default function App() {
  const path = window.location.pathname;

  // New role-based routing
  const current =
    path === "/learn" ? "learn" :
    path === "/teach" ? "teach" :
    path === "/profile" ? "profile" :
    "learn"; // default

  return (
    <div className="app-root">
      <div className="app-shell">

        {/* ✅ NAVBAR */}
        <header className="app-nav">

          {/* LEFT SIDE — LOGO + BRAND */}
          <div className="app-nav-left">
            <div className="app-logo-mark">
              <img src="/xchange.png" alt="Xchange Logo" className="app-logo-img" />
            </div>

            <div className="app-title-block">
              <span className="app-title">Xchange</span>
              <span className="app-subtitle">Instant learning & teaching matchmaking</span>
            </div>
          </div>

          {/* RIGHT SIDE — NEW NAV BUTTONS */}
          <div className="app-nav-right">
            <button
              className={`app-nav-button ${current === "learn" ? "active" : ""}`}
              onClick={() => (window.location.pathname = "/learn")}
            >
              <span className="icon">🎓</span>
              <span>Learn</span>
            </button>

            <button
              className={`app-nav-button ${current === "teach" ? "active" : ""}`}
              onClick={() => (window.location.pathname = "/teach")}
            >
              <span className="icon">🧑‍🏫</span>
              <span>Teach</span>
            </button>

            <button
              className={`app-nav-button ${current === "profile" ? "active" : ""}`}
              onClick={() => (window.location.pathname = "/profile")}
            >
              <span className="icon">💰</span>
              <span>Profile</span>
            </button>
          </div>

        </header>

        {/* ✅ MAIN CONTENT */}
        <main className="app-main-panel">
          {current === "learn" && <BroadcastViewer />}   {/* learner waits for match */}
          {current === "teach" && <BroadcastHost />}      {/* teacher waits for match */}
          {current === "profile" && <VideoChat />}        {/* placeholder for now */}
        </main>

      </div>
    </div>
  );
}
