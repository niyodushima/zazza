// src/components/HeartsOverlay.jsx
import React, { useEffect, useRef, useState } from "react";
import "./HeartsOverlay.css";

export default function HeartsOverlay({ socket, username }) {
  const [hearts, setHearts] = useState([]);

  const spawnHeart = () => {
    const id = Date.now() + Math.random();

    const newHeart = {
      id,
      size: 22 + Math.random() * 18, // 22–40px
      left: 20 + Math.random() * 60, // random horizontal position
      duration: 2.2 + Math.random() * 1.5, // 2.2–3.7s
      opacity: 0.7 + Math.random() * 0.3,
    };

    setHearts((prev) => [...prev, newHeart]);

    setTimeout(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    }, newHeart.duration * 1000);
  };

  // Listen for hearts from server
  useEffect(() => {
    if (!socket) return;

    socket.on("heart", () => {
      spawnHeart();
    });

    return () => {
      socket.off("heart");
    };
  }, [socket]);

  // Send heart to server
  const sendHeart = () => {
    socket.emit("heart");
    spawnHeart(); // local instant feedback
  };

  return (
    <>
      {/* Floating hearts */}
      <div className="hearts-overlay">
        {hearts.map((h) => (
          <div
            key={h.id}
            className="heart"
            style={{
              left: `${h.left}%`,
              width: `${h.size}px`,
              height: `${h.size}px`,
              animationDuration: `${h.duration}s`,
              opacity: h.opacity,
            }}
          >
            ❤️
          </div>
        ))}
      </div>

      {/* Glowing heart button */}
      <button className="heart-button" onClick={sendHeart}>
        ❤️
      </button>

      {/* Tap anywhere on video to send hearts */}
      <div
        className="heart-tap-zone"
        onClick={sendHeart}
      />
    </>
  );
}
