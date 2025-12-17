// src/App.js
import React from "react";
import "./App.css";

// ✅ Your SVG logo
import XchangeLogo from "./assets/xchange.svg";

import BroadcastHost from "./components/BroadcastHost";
import BroadcastViewer from "./components/BroadcastViewer";
import VideoChat from "./components/VideoChat";

export default function App() {
  const path = window.location.pathname;

  const current =
    path === "/learn" ? "learn" :
    path === "/teach" ? "teach" :
    path === "/profile" ? "profile" :
    "learn";

  return (
    <div className="app-root">
      <div className="app-shell">

        {/* ✅ NAVBAR */}
        <header className="app-nav">

          {/* ✅ LEFT SIDE — LOGO + BRAND */}
          <div className="app-nav-left">

            <div className="app-title-block">
              <div className="app-title-row">
                <img src={XchangeLogo} alt="Xchange Logo" className="app-title-logo" />
                <span className="app-title">Xchange</span>
              </div>
              <span className="app-subtitle">
                Instant learning & teaching matchmaking
              </span>
            </div>

          </div>

          {/* ✅ RIGHT SIDE — NAV BUTTONS */}
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
          {current === "learn" && <BroadcastViewer />}
          {current === "teach" && <BroadcastHost />}
          {current === "profile" && <VideoChat />}
        </main>

      </div>
    </div>
  );
}
