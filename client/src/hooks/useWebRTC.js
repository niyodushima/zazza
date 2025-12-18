// src/useWebRTC.js
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SIGNALING_URL = "https://zazza-backend.onrender.com";

export function useWebRTC() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  const socketRef = useRef(null);
  const pcRef = useRef(null);

  const [matchedRoom, setMatchedRoom] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [facingMode, setFacingMode] = useState("user");

  const [messages, setMessages] = useState([]);
  const [callActive, setCallActive] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // ---------- PeerConnection helpers ----------

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (
        event.candidate &&
        matchedRoom &&
        socketRef.current
      ) {
        socketRef.current.emit("ice-candidate", {
          roomId: matchedRoom,
          candidate: event.candidate,
        });
      }
    };

    return pc;
  };

  const attachLocalTracksToPeerConnection = () => {
    if (!localStreamRef.current || !pcRef.current) return;

    const pc = pcRef.current;
    const stream = localStreamRef.current;

    stream.getTracks().forEach((track) => {
      const senders = pc.getSenders();
      const exists = senders.some(
        (s) => s.track && s.track.kind === track.kind
      );
      if (!exists) {
        pc.addTrack(track, stream);
      }
    });
  };

  const startLocalVideoIfNotStarted = async () => {
    if (!localStreamRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode },
        audio: true,
      });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    }

    if (pcRef.current) {
      attachLocalTracksToPeerConnection();
    }
  };

  // ---------- Socket + signaling setup ----------

  useEffect(() => {
    const socket = io(SIGNALING_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to signaling:", socket.id);
    });

    socket.on("paired", async ({ roomId }) => {
      setMatchedRoom(roomId);
      pcRef.current = createPeerConnection();
      await startLocalVideoIfNotStarted();
    });

    socket.on("room-joined", async (roomId) => {
      setMatchedRoom(roomId);
      pcRef.current = createPeerConnection();
      await startLocalVideoIfNotStarted();
    });

    socket.on("offer", async (offer) => {
      if (!pcRef.current) {
        pcRef.current = createPeerConnection();
      }

      await startLocalVideoIfNotStarted();
      attachLocalTracksToPeerConnection();

      await pcRef.current.setRemoteDescription(offer);

      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);

      socket.emit("answer", { roomId: matchedRoom, answer });
    });

    socket.on("answer", async (answer) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(answer);
      }
    });

    socket.on("ice-candidate", async (candidate) => {
      try {
        if (pcRef.current) {
          await pcRef.current.addIceCandidate(candidate);
        }
      } catch (err) {
        console.error("Error adding ICE candidate:", err);
      }
    });

    // Chat
    socket.on("chat-message", ({ from, text, timestamp }) => {
      setMessages((prev) => [
        ...prev,
        { from, text, timestamp: timestamp || Date.now() },
      ]);
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedRoom]);

  // ---------- Timer ----------

  useEffect(() => {
    let interval = null;

    if (callActive) {
      interval = setInterval(() => {
        setSecondsElapsed(function (prev) {
          return prev + 1;
        });
      }, 1000);
    } else if (!callActive && secondsElapsed !== 0) {
      if (interval) clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callActive, secondsElapsed]);

  // ---------- Start local video on mount / facingMode change ----------

  useEffect(() => {
    startLocalVideoIfNotStarted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  // ---------- Public actions ----------

  const randomMatch = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("join-random");
  };

  const joinRoom = (roomId) => {
    if (!socketRef.current || !roomId) return;
    socketRef.current.emit("join-room", roomId);
  };

  const startCall = async () => {
    if (!pcRef.current) {
      pcRef.current = createPeerConnection();
    }

    await startLocalVideoIfNotStarted();
    attachLocalTracksToPeerConnection();

    if (!matchedRoom) {
      console.warn("No room yet – use Random Match or Join Room first.");
      return;
    }

    const pc = pcRef.current;
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (socketRef.current) {
      socketRef.current.emit("offer", { roomId: matchedRoom, offer });
      socketRef.current.emit("session-started", { roomId: matchedRoom });
    }

    setCallActive(true);
    setSecondsElapsed(0);
  };

  const endCall = () => {
    if (callActive && socketRef.current && matchedRoom) {
      socketRef.current.emit("session-ended", {
        roomId: matchedRoom,
        durationSeconds: secondsElapsed,
      });
    }

    setCallActive(false);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  const toggleMic = () => {
    if (!localStreamRef.current) return;

    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });

    setMicOn(function (prev) {
      return !prev;
    });
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;

    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });

    setCameraOn(function (prev) {
      return !prev;
    });
  };

  const switchCamera = async () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => t.stop());
    }

    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: newMode },
      audio: true,
    });

    localStreamRef.current = newStream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = newStream;
    }

    if (pcRef.current) {
      const pc = pcRef.current;
      const videoTrack = newStream.getVideoTracks()[0];
      const senders = pc.getSenders();
      const sender = senders.find(
        (s) => s.track && s.track.kind === "video"
      );

      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }
    }
  };

  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      screenStreamRef.current = screenStream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      const screenTrack = screenStream.getVideoTracks()[0];

      if (pcRef.current) {
        const pc = pcRef.current;
        const senders = pc.getSenders();
        const sender = senders.find(
          (s) => s.track && s.track.kind === "video"
        );

        if (sender && screenTrack) {
          await sender.replaceTrack(screenTrack);
        }
      }

      screenTrack.onended = function () {
        stopScreenShare();
      };

      setScreenSharing(true);
    } catch (err) {
      console.error("Error starting screen share:", err);
    }
  };

  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];

      if (pcRef.current) {
        const pc = pcRef.current;
        const senders = pc.getSenders();
        const sender = senders.find(
          (s) => s.track && s.track.kind === "video"
        );

        if (sender && cameraTrack) {
          await sender.replaceTrack(cameraTrack);
        }
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }

    setScreenSharing(false);
  };

  const sendChatMessage = (text) => {
    if (!text || !text.trim() || !socketRef.current || !matchedRoom) return;

    const msg = {
      roomId: matchedRoom,
      text: text.trim(),
      timestamp: Date.now(),
    };

    setMessages(function (prev) {
      return [
        ...prev,
        { from: "me", text: msg.text, timestamp: msg.timestamp },
      ];
    });

    socketRef.current.emit("chat-message", msg);
  };

  // ---------- Recording ----------

  const recorderRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const recordedChunksRef = useRef([]);

  const startRecording = () => {
    const stream =
      (remoteVideoRef.current && remoteVideoRef.current.srcObject) ||
      localStreamRef.current;
    if (!stream) return;

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
    });

    recorderRef.current = mediaRecorder;
    recordedChunksRef.current = [];

    mediaRecorder.ondataavailable = function (event) {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = function () {
      const blob = new Blob(recordedChunksRef.current, {
        type: "video/webm",
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "recording.webm";
      a.click();
      URL.revokeObjectURL(url);
      recordedChunksRef.current = [];
    };

    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    setRecording(false);
  };

  const formattedTime = () => {
    const minutes = Math.floor(secondsElapsed / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (secondsElapsed % 60).toString().padStart(2, "0");
    return minutes + ":" + seconds;
  };

  return {
    // refs
    localVideoRef,
    remoteVideoRef,

    // state
    micOn,
    cameraOn,
    screenSharing,
    messages,
    callActive,
    secondsElapsed,
    recording,
    matchedRoom,
    formattedTime,

    // actions
    randomMatch,
    joinRoom,
    startCall,
    endCall,
    toggleMic,
    toggleCamera,
    switchCamera,
    startScreenShare,
    stopScreenShare,
    sendChatMessage,
    startRecording,
    stopRecording,
  };
}
