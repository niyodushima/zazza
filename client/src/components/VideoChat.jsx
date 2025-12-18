// src/VideoChat.jsx
import React, { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./VideoChat.css";

export default function VideoChat() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  const socket = useRef(null);
  const peerConnection = useRef(null);

  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [facingMode, setFacingMode] = useState("user");

  const [roomId, setRoomId] = useState("");
  const [matchedRoom, setMatchedRoom] = useState(null);

  const [recorder, setRecorder] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);

  // ✅ Create PeerConnection
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
      if (event.candidate && matchedRoom && socket.current) {
        socket.current.emit("ice-candidate", {
          roomId: matchedRoom,
          candidate: event.candidate,
        });
      }
    };

    return pc;
  };

  // ✅ Ensure camera is ready before signaling
  const startLocalVideoIfNotStarted = async () => {
    if (!localStreamRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: true,
      });

      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    }

    if (peerConnection.current) {
      attachLocalTracksToPeerConnection();
    }
  };

  // ✅ Attach tracks safely
  const attachLocalTracksToPeerConnection = () => {
    if (!localStreamRef.current || !peerConnection.current) return;

    localStreamRef.current.getTracks().forEach((track) => {
      const exists = peerConnection.current
        .getSenders()
        .some((s) => s.track && s.track.kind === track.kind);

      if (!exists) {
        peerConnection.current.addTrack(track, localStreamRef.current);
      }
    });
  };

  // ✅ Socket + signaling
  useEffect(() => {
    socket.current = io("https://zazza-backend.onrender.com");

    socket.current.on("connect", () => {
      console.log("Connected:", socket.current.id);
    });

    socket.current.on("paired", async ({ roomId }) => {
      setMatchedRoom(roomId);
      peerConnection.current = createPeerConnection();
      await startLocalVideoIfNotStarted();
    });

    socket.current.on("room-joined", async (joinedRoomId) => {
      setMatchedRoom(joinedRoomId);
      peerConnection.current = createPeerConnection();
      await startLocalVideoIfNotStarted();
    });

    // ✅ Viewer receives offer
    socket.current.on("offer", async (offer) => {
      if (!peerConnection.current) {
        peerConnection.current = createPeerConnection();
      }

      await startLocalVideoIfNotStarted();
      attachLocalTracksToPeerConnection();

      await peerConnection.current.setRemoteDescription(offer);

      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      socket.current.emit("answer", { roomId: matchedRoom, answer });
    });

    // ✅ Host receives answer
    socket.current.on("answer", async (answer) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(answer);
      }
    });

    // ✅ ICE candidates
    socket.current.on("ice-candidate", async (candidate) => {
      try {
        if (peerConnection.current) {
          await peerConnection.current.addIceCandidate(candidate);
        }
      } catch (err) {
        console.error("Error adding ICE candidate", err);
      }
    });

    return () => {
      socket.current.disconnect();
    };
  }, [matchedRoom]);

  // ✅ Start local video on mount
  useEffect(() => {
    startLocalVideoIfNotStarted();
  }, [facingMode]);

  // ✅ Matchmaking
  const handleRandomMatch = () => {
    socket.current.emit("join-random");
  };

  const handleJoinRoom = () => {
    if (roomId) {
      socket.current.emit("join-room", roomId);
    }
  };

  // ✅ Start call (host)
  const startCall = async () => {
    if (!peerConnection.current) {
      peerConnection.current = createPeerConnection();
    }

    await startLocalVideoIfNotStarted();
    attachLocalTracksToPeerConnection();

    if (!matchedRoom) {
      console.warn("Join a room first");
      return;
    }

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    socket.current.emit("offer", { roomId: matchedRoom, offer });
  };

  // ✅ Media controls
  const handleToggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setMicOn((prev) => !prev);
  };

  const handleToggleCamera = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setCameraOn((prev) => !prev);
  };

  const handleSwitchCamera = async () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);

    localStreamRef.current?.getVideoTracks().forEach((t) => t.stop());

    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: newMode },
      audio: true,
    });

    localStreamRef.current = newStream;
    localVideoRef.current.srcObject = newStream;

    const videoTrack = newStream.getVideoTracks()[0];
    const sender = peerConnection.current
      ?.getSenders()
      .find((s) => s.track?.kind === "video");

    if (sender && videoTrack) {
      await sender.replaceTrack(videoTrack);
    }
  };

  // ✅ End call
  const handleEndCall = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  // ✅ Recording
  const startRecording = () => {
    const stream =
      remoteVideoRef.current?.srcObject || localStreamRef.current;
    if (!stream) return;

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9",
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        setRecordedChunks((prev) => [...prev, e.data]);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "recording.webm";
      a.click();

      URL.revokeObjectURL(url);
      setRecordedChunks([]);
    };

    mediaRecorder.start();
    setRecorder(mediaRecorder);
    setRecording(true);
  };

  const stopRecording = () => {
    recorder?.stop();
    setRecording(false);
    setRecorder(null);
  };

  return (
    <div className="video-container">
      <div className="video-wrapper">
        <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
        <video ref={localVideoRef} autoPlay muted playsInline className="local-video" />
      </div>

      <div className="controls">
        <div className="matchmaking">
          <button className="control-btn" onClick={handleRandomMatch}>
            Random Match
          </button>

          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />

          <button className="control-btn" onClick={handleJoinRoom}>
            Join Room
          </button>
        </div>

        <button className="control-btn" onClick={startCall}>
          Start Call
        </button>

        <button className="control-btn" onClick={handleToggleMic}>
          {micOn ? "Mute" : "Unmute"}
        </button>

        <button className="control-btn" onClick={handleToggleCamera}>
          {cameraOn ? "Camera Off" : "Camera On"}
        </button>

        <button className="control-btn" onClick={handleSwitchCamera}>
          Switch Camera
        </button>

        <button
          className="control-btn"
          onClick={recording ? stopRecording : startRecording}
        >
          {recording ? "Stop Recording" : "Start Recording"}
        </button>

        <button className="end-btn" onClick={handleEndCall}>
          End Call
        </button>
      </div>
    </div>
  );
}
