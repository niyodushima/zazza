import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SIGNALING_URL =
  process.env.REACT_APP_SIGNALING_URL || "https://zazza-backend.onrender.com";

const TURN_URLS = (process.env.REACT_APP_TURN_URLS || "")
  .split(",")
  .map((u) => u.trim())
  .filter(Boolean);
const TURN_USERNAME = process.env.REACT_APP_TURN_USERNAME || "";
const TURN_CREDENTIAL = process.env.REACT_APP_TURN_CREDENTIAL || "";

const iceServers =
  TURN_URLS.length
    ? [{ urls: TURN_URLS, username: TURN_USERNAME, credential: TURN_CREDENTIAL }]
    : [{ urls: "stun:stun.l.google.com:19302" }];

export function useWebRTC(role = "viewer", username = "Guest") {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef(null);

  const [roomId, setRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [callActive, setCallActive] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    let interval;
    if (callActive && role === "host") {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => {
          const next = prev + 1;
          if (roomId) socketRef.current?.emit("session-time", { roomId, seconds: next });
          return next;
        });
      }, 1000);
    } else if (!callActive) {
      setSecondsElapsed(0);
    }
    return () => clearInterval(interval);
  }, [callActive, role, roomId]);

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({ iceServers });
    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (remoteVideoRef.current && stream) {
        remoteVideoRef.current.srcObject = stream;
      }
    };
    pc.onicecandidate = (event) => {
      if (event.candidate && roomId) {
        socketRef.current?.emit("ice-candidate", { roomId, candidate: event.candidate });
      }
    };
    return pc;
  };

  const startLocalVideoIfNotStarted = async () => {
    if (localStreamRef.current) return localStreamRef.current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      stream.getTracks().forEach((track) => pcRef.current?.addTrack(track, stream));
      return stream;
    } catch (err) {
      console.error("Media access denied:", err);
      alert("Please allow camera and microphone to join the call.");
      return null;
    }
  };

  useEffect(() => {
    const socket = io(SIGNALING_URL, { path: "/socket.io" });
    socketRef.current = socket;

    socket.on("room-joined", ({ roomId: joined }) => {
      setRoomId(joined);
      if (!pcRef.current) pcRef.current = createPeerConnection();
    });

    socket.on("offer", async (offer) => {
      if (!pcRef.current) pcRef.current = createPeerConnection();
      await startLocalVideoIfNotStarted();
      await pcRef.current.setRemoteDescription(offer);
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit("answer", { roomId, answer });
      setCallActive(true);
    });

    socket.on("answer", async (answer) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(answer);
        setCallActive(true);
      }
    });

    socket.on("ice-candidate", async (candidate) => {
      try {
        await pcRef.current?.addIceCandidate(candidate);
      } catch (err) {
        console.warn("Bad ICE candidate:", err);
      }
    });

    // ✅ Chat messages from server
    socket.on("chat-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("viewer-count", (count) => setViewerCount(count));
    socket.on("session-time", (seconds) => {
      if (role !== "host") setSecondsElapsed(seconds);
    });
    socket.on("system", (text) => {
      setMessages((prev) => [...prev, { user: "System", text, timestamp: Date.now() }]);
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, role]);

  const joinRoom = (targetRoomId) => {
    if (!targetRoomId) return;
    socketRef.current?.emit("join-room", { roomId: targetRoomId, role, name: username });
    setRoomId(targetRoomId);
    if (!pcRef.current) pcRef.current = createPeerConnection();
  };

  const startCall = async () => {
    if (!roomId) return;
    if (!pcRef.current) pcRef.current = createPeerConnection();
    const stream = await startLocalVideoIfNotStarted();
