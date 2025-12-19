// src/hooks/useWebRTC.js
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SIGNALING_URL = "https://zazza-backend.onrender.com";

export function useWebRTC(role = "viewer", username = "Guest") {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);

  const [matchedRoom, setMatchedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [callActive, setCallActive] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // ✅ Timer: Host emits, Viewer listens
  useEffect(() => {
    let interval;
    if (callActive && role === "host") {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => {
          const next = prev + 1;
          if (socketRef.current && matchedRoom) {
            socketRef.current.emit("session-time", { roomId: matchedRoom, seconds: next });
          }
          return next;
        });
      }, 1000);
    } else if (!callActive) {
      setSecondsElapsed(0);
    }
    return () => clearInterval(interval);
  }, [callActive, role, matchedRoom]);

  useEffect(() => {
    const socket = io(SIGNALING_URL, { path: "/socket.io" });
    socketRef.current = socket;

    socket.on("connect", () => console.log("Connected:", socket.id));
    socket.on("room-joined", (roomId) => {
      setMatchedRoom(roomId);
      if (!pcRef.current) pcRef.current = createPeerConnection();
    });

    socket.on("offer", async (offer) => {
      if (!pcRef.current) pcRef.current = createPeerConnection();
      await pcRef.current.setRemoteDescription(offer);
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit("answer", { roomId: matchedRoom, answer });
    });

    socket.on("answer", async (answer) => {
      if (pcRef.current) await pcRef.current.setRemoteDescription(answer);
    });

    socket.on("ice-candidate", async (candidate) => {
      if (pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(candidate);
        } catch (err) {
          console.warn("Bad ICE candidate:", err);
        }
      }
    });

    socket.on("chat-message", (msg) => setMessages((prev) => [...prev, msg]));
    socket.on("viewer-count", (count) => setViewerCount(count));
    socket.on("session-time", (seconds) => {
      if (role === "viewer") setSecondsElapsed(seconds);
    });

    return () => socket.disconnect();
  }, [matchedRoom]);

  // ✅ Safe fallback for camera/mic permissions
  const startLocalVideoIfNotStarted = async () => {
    if (localStreamRef.current) return localStreamRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      stream.getTracks().forEach((track) => pcRef.current.addTrack(track, stream));
      return stream;
    } catch (err) {
      console.error("Media access denied:", err);
      alert(
        "Camera/microphone access was denied. Please allow permissions in your browser settings for video to work."
      );
      return null; // ✅ graceful fallback
    }
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };
    pc.onicecandidate = (event) => {
      if (event.candidate && matchedRoom && socketRef.current) {
        socketRef.current.emit("ice-candidate", { roomId: matchedRoom, candidate: event.candidate });
      }
    };
    return pc;
  };

  const joinRoom = (roomId) => {
    if (socketRef.current) socketRef.current.emit("join-room", { roomId, role });
    setMatchedRoom(roomId);
  };

  const startCall = async () => {
    if (!matchedRoom) return;
    if (!pcRef.current) pcRef.current = createPeerConnection();
    if (role === "host") await startLocalVideoIfNotStarted();
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    socketRef.current.emit("offer", { roomId: matchedRoom, offer });
    setCallActive(true);
    setSecondsElapsed(0);
  };

  const endCall = () => {
    setCallActive(false);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
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
