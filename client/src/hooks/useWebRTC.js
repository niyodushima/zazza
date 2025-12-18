// src/hooks/useWebRTC.js
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SIGNALING_URL = "https://zazza-backend.onrender.com";

export function useWebRTC(role = "viewer", username = "Guest") {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  const socketRef = useRef(null);
  const pcRef = useRef(null);

  const pendingCandidatesRef = useRef([]);

  const [matchedRoom, setMatchedRoom] = useState(null);
  const [messages, setMessages] = useState([]);

  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [facingMode, setFacingMode] = useState("user");

  const [callActive, setCallActive] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Safe camera start — Host only
  const startLocalVideoIfNotStarted = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      if (pcRef.current) {
        stream.getTracks().forEach((track) => {
          const exists = pcRef.current
            .getSenders()
            .some((s) => s.track && s.track.kind === track.kind);
          if (!exists) pcRef.current.addTrack(track, stream);
        });
      }
      return stream;
    } catch (err) {
      console.error("Camera permission denied:", err);
      return null;
    }
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
    };
    pc.onicecandidate = (event) => {
      if (event.candidate && matchedRoom && socketRef.current) {
        socketRef.current.emit("ice-candidate", {
          roomId: matchedRoom,
          candidate: event.candidate,
        });
      }
    };
    return pc;
  };

  useEffect(() => {
    const socket = io(SIGNALING_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to signaling:", socket.id);
    });

    socket.on("room-joined", (roomId) => {
      setMatchedRoom(roomId);
      if (!pcRef.current) pcRef.current = createPeerConnection();
    });

    socket.on("offer", async (offer) => {
      if (!pcRef.current) pcRef.current = createPeerConnection();
      if (role === "host") await startLocalVideoIfNotStarted();
      await pcRef.current.setRemoteDescription(offer);
      for (const c of pendingCandidatesRef.current) {
        await pcRef.current.addIceCandidate(c);
      }
      pendingCandidatesRef.current = [];
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit("answer", { roomId: matchedRoom, answer });
    });

    socket.on("answer", async (answer) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(answer);
      for (const c of pendingCandidatesRef.current) {
        await pcRef.current.addIceCandidate(c);
      }
      pendingCandidatesRef.current = [];
    });

    socket.on("ice-candidate", async (candidate) => {
      const pc = pcRef.current;
      if (!pc) return;
      if (!pc.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error("Error adding ICE candidate:", err);
      }
    });

    socket.on("chat-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => socket.disconnect();
  }, [matchedRoom, role]);

  const joinRoom = (roomId) => {
    if (!socketRef.current || !roomId) return;
    socketRef.current.emit("join-room", roomId);
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
    if (!text || !socketRef.current || !matchedRoom) return;
    const msg = {
      roomId: matchedRoom,
      user: username,   // ✅ include username
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
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
  };
}
