// src/components/HeartsOverlay.jsx
import React, { useEffect, useRef } from "react";
import "./HeartsOverlay.css";

export default function HeartsOverlay({ onHeart }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onRemoteHeart = () => spawnHeart(container);
    window.addEventListener("x-heart", onRemoteHeart);
    return () => window.removeEventListener("x-heart", onRemoteHeart);
  }, []);

  const spawnHeart = (container) => {
    const heart = document.createElement("div");
    heart.className = "heart";
    heart.style.left = Math.random() * 80 + "%";
    container.appendChild(heart);
    setTimeout(() => container.removeChild(heart), 2000);
  };

  return (
    <div className="hearts" ref={containerRef}>
      <button
        className="heart-button"
        onClick={() => {
          onHeart?.();
          const evt = new Event("x-heart");
          window.dispatchEvent(evt); // local echo
        }}
        title="Send heart"
      >
        ❤️
      </button>
    </div>
  );
}
