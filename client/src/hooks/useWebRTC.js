// src/hooks/useWebRTC.js
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SIGNALING_URL = "https://zazza-backend.onrender.com";

export function useWebRTC(role = "viewer") {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  const socketRef = useRef(null);
  const pcRef = useRef(null);

  const [matchedRoom, setMatchedRoom] = useState(null);
  const [messages, setMessages] = useState([]);

  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [facingMode, setFacingMode] = useState("user");

  const [callActive, setCallActive] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  const recorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [recording, setRecording] = useState(false);

  // -------------------------------------------------------
  // ✅ SAFE CAMERA START — only when user initiates call
  // -------------------------------------------------------
  const startLocalVideoIfNotStarted = async () => {
    if (localStreamRef.current) return localStreamRef.current;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Attach tracks if PC exists
      if (pcRef.current) {
        stream.getTracks().forEach((track) => {
          const exists = pcRef.current
            .getSenders()
            .some((s) => s.track && s.track.kind === track.kind);

          if (!exists) {
            pcRef.current.addTrack(track, stream);
          }
        });
      }

      return stream;
    } catch (err) {
      console.error("Camera permission denied:", err);
      return null;
    }
  };

  // -------------------------------------------------------
  // ✅ CREATE PEER CONNECTION SAFELY
  // -------------------------------------------------------
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
      if (event.candidate && matchedRoom && socketRef.current) {
        socketRef.current.emit("ice-candidate", {
          roomId: matchedRoom,
          candidate: event.candidate,
        });
      }
    };

    return pc;
  };

  // -------------------------------------------------------
  // ✅ SOCKET SETUP
  // -------------------------------------------------------
  useEffect(() => {
    const socket = io(SIGNALING_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to signaling:", socket.id);
    });

    // Host or Viewer joins a room
    socket.on("paired", ({ roomId }) => {
      setMatchedRoom(roomId);
      if (!pcRef.current) pcRef.current = createPeerConnection();
    });

    socket.on("room-joined", (roomId) => {
      setMatchedRoom(roomId);
      if (!pcRef.current) pcRef.current = createPeerConnection();
    });

    // OFFER RECEIVED
    socket.on("offer", async (offer) => {
      if (!pcRef.current) pcRef.current = createPeerConnection();

      await startLocalVideoIfNotStarted();
      await pcRef.current.setRemoteDescription(offer);

      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);

      socket.emit("answer", { roomId: matchedRoom, answer });
    });

    // ANSWER RECEIVED
    socket.on("answer", async (answer) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(answer);
      }
    });

    // ICE CANDIDATE RECEIVED
    socket.on("ice-candidate", async (candidate) => {
      try {
        if (pcRef.current) {
          await pcRef.current.addIceCandidate(candidate);
        }
      } catch (err) {
        console.error("Error adding ICE candidate:", err);
      }
    });

    // CHAT MESSAGE RECEIVED
    socket.on("chat-message", ({ from, text, timestamp }) => {
      setMessages((prev) => [
        ...prev,
        { from, text, timestamp: timestamp || Date.now() },
      ]);
    });

    return () => socket.disconnect();
  }, [matchedRoom]);

  // -------------------------------------------------------
  // ✅ TIMER
  // -------------------------------------------------------
  useEffect(() => {
    let interval = null;

    if (callActive) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }

    return () => interval && clearInterval(interval);
  }, [callActive]);

  // -------------------------------------------------------
  // ✅ START CALL
  // -------------------------------------------------------
  const startCall = async () => {
    if (!matchedRoom) {
      console.warn("No room yet — join or match first.");
      return;
    }

    if (!pcRef.current) pcRef.current = createPeerConnection();

    await startLocalVideoIfNotStarted();

    const pc = pcRef.current;

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socketRef.current.emit("offer", { roomId: matchedRoom, offer });
    socketRef.current.emit("session-started", { roomId: matchedRoom });

    setCallActive(true);
    setSecondsElapsed(0);
  };

  // -------------------------------------------------------
  // ✅ END CALL
  // -------------------------------------------------------
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

  // -------------------------------------------------------
  // ✅ CHAT
  // -------------------------------------------------------
  const sendChatMessage = (text) => {
    if (!text || !socketRef.current || !matchedRoom) return;

    const msg = {
      roomId: matchedRoom,
      text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, { from: "me", text, timestamp: msg.timestamp }]);

    socketRef.current.emit("chat-message", msg);
  };

  // -------------------------------------------------------
  // ✅ MIC / CAMERA
  // -------------------------------------------------------
  const toggleMic = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !t.enabled));
    setMicOn((prev) => !prev);
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !t.enabled));
    setCameraOn((prev) => !prev);
  };

  // -------------------------------------------------------
  // ✅ SWITCH CAMERA
  // -------------------------------------------------------
  const switchCamera = async () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);

    if (!localStreamRef.current) return;

    localStreamRef.current.getVideoTracks().forEach((t) => t.stop());

    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: newMode },
      audio: true,
    });

    localStreamRef.current = newStream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = newStream;
    }

    if (pcRef.current) {
      const videoTrack = newStream.getVideoTracks()[0];
      const sender = pcRef.current
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");

      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }
    }
  };

  // -------------------------------------------------------
  // ✅ SCREEN SHARING
  // -------------------------------------------------------
  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      screenStreamRef.current = screenStream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      const screenTrack = screenStream.getVideoTracks()[0];

      const sender = pcRef.current
        ?.getSenders()
        .find((s) => s.track && s.track.kind === "video");

      if (sender && screenTrack) {
        await sender.replaceTrack(screenTrack);
      }

      screenTrack.onended = () => stopScreenShare();

      setScreenSharing(true);
    } catch (err) {
      console.error("Screen share error:", err);
    }
  };

  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    if (localStreamRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];

      const sender = pcRef.current
        ?.getSenders()
        .find((s) => s.track && s.track.kind === "video");

      if (sender && cameraTrack) {
        await sender.replaceTrack(cameraTrack);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }

    setScreenSharing(false);
  };

  // -------------------------------------------------------
  // ✅ RECORDING
  // -------------------------------------------------------
  const startRecording = () => {
    const stream =
      remoteVideoRef.current?.srcObject || localStreamRef.current;
    if (!stream) return;

    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
    });

    recorderRef.current = recorder;
    recordedChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, {
        type: "video/webm",
      });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "recording.webm";
      a.click();

      URL.revokeObjectURL(url);
    };

    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    setRecording(false);
  };

  // -------------------------------------------------------
  // ✅ FORMATTED TIMER
  // -------------------------------------------------------
  const formattedTime = () => {
    const m = Math.floor(secondsElapsed / 60)
      .toString()
      .padStart(2, "0");
    const s = (secondsElapsed % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // -------------------------------------------------------
  // ✅ RETURN API
  // -------------------------------------------------------
  return {
    localVideoRef,
    remoteVideoRef,

    messages,
    sendChatMessage,

    micOn,
    cameraOn,
    screenSharing,
    callActive,
    recording,
    formattedTime,

    startCall,
    endCall,
    toggleMic,
    toggleCamera,
    switchCamera,
    startScreenShare,
    stopScreenShare,
    startRecording,
    stopRecording,
  };
}
