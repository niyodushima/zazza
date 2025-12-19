import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SIGNALING_URL = "https://zazza-backend.onrender.com";

export function useWebRTC(role = "viewer", username = "Guest") {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);

  const [matchedRoom, setMatchedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [callActive, setCallActive] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // ✅ Timer
  useEffect(() => {
    let interval;
    if (callActive) {
      interval = setInterval(() => setSecondsElapsed((p) => p + 1), 1000);
    } else setSecondsElapsed(0);
    return () => clearInterval(interval);
  }, [callActive]);

  useEffect(() => {
    const socket = io(SIGNALING_URL, {
      transports: ["websocket"],
      path: "/socket.io",
    });
    socketRef.current = socket;

    socket.on("connect", () => console.log("Connected:", socket.id));
    socket.on("room-joined", (roomId) => setMatchedRoom(roomId));
    socket.on("chat-message", (msg) => setMessages((prev) => [...prev, msg]));
    socket.on("viewer-count", (count) => setViewerCount(count));

    return () => socket.disconnect();
  }, []);

  const joinRoom = (roomId) => {
    socketRef.current.emit("join-room", { roomId, role });
    setMatchedRoom(roomId);
  };

  const startCall = async () => {
    setCallActive(true);
    setSecondsElapsed(0);
  };

  const endCall = () => {
    setCallActive(false);
  };

  const sendChatMessage = (text) => {
    if (!text || !matchedRoom) return;
    const msg = { roomId: matchedRoom, user: username, text, timestamp: Date.now() };
    socketRef.current.emit("chat-message", msg);
  };

  const formattedTime = () => {
    const m = Math.floor(secondsElapsed / 60).toString().padStart(2, "0");
    const s = (secondsElapsed % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return {
    localVideoRef,
    remoteVideoRef,
    messages,
    sendChatMessage,
    callActive,
    formattedTime,
    joinRoom,
    startCall,
    endCall,
    viewerCount,
  };
}
