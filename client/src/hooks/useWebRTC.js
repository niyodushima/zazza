// src/hooks/useWebRTC.js
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SIGNALING_URL = "https://zazza-backend.onrender.com"; // your Render URL

export function useWebRTC(role = "viewer", username = "Guest") {
  const socketRef = useRef(null);
  const [matchedRoom, setMatchedRoom] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const socket = io(SIGNALING_URL, { path: "/socket.io" }); // ✅ match server
    socketRef.current = socket;

    socket.on("connect", () => console.log("Connected:", socket.id));
    socket.on("room-joined", (roomId) => setMatchedRoom(roomId));
    socket.on("chat-message", (msg) => setMessages((prev) => [...prev, msg]));

    return () => socket.disconnect();
  }, []);

  const joinRoom = (roomId) => {
    socketRef.current.emit("join-room", { roomId, role });
    setMatchedRoom(roomId);
  };

  const sendChatMessage = (text) => {
    if (!text || !matchedRoom) return;
    const msg = { roomId: matchedRoom, user: username, text, timestamp: Date.now() };
    socketRef.current.emit("chat-message", msg);
  };

  return { messages, sendChatMessage, joinRoom };
}
