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

  // ----- Initialize PeerConnection -----
  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        // Add TURN here later
        // {
        //   urls: "turn:your-turn-server:3478",
        //   username: "user",
        //   credential: "pass",
        // },
      ],
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

  // ----- Socket + signaling setup -----
  useEffect(() => {
    socket.current = io("http://172.20.10.7:3000");

    socket.current.on("connect", () => {
      console.log("Connected to signaling server:", socket.current.id);
    });

    socket.current.on("paired", ({ roomId }) => {
      console.log("Paired in room", roomId);
      setMatchedRoom(roomId);
      peerConnection.current = createPeerConnection();
      attachLocalTracksToPeerConnection();
    });

    socket.current.on("room-joined", (joinedRoomId) => {
      console.log("Joined room", joinedRoomId);
      setMatchedRoom(joinedRoomId);
      peerConnection.current = createPeerConnection();
      attachLocalTracksToPeerConnection();
    });

    socket.current.on("offer", async (offer) => {
      console.log("Received offer");
      if (!peerConnection.current) {
        peerConnection.current = createPeerConnection();
        attachLocalTracksToPeerConnection();
      }

      await peerConnection.current.setRemoteDescription(offer);

      const answer = await peerConnection.current.createAnswer();
      await peerConnection.current.setLocalDescription(answer);

      socket.current.emit("answer", { roomId: matchedRoom, answer });
    });

    socket.current.on("answer", async (answer) => {
      console.log("Received answer");
      if (!peerConnection.current) return;
      await peerConnection.current.setRemoteDescription(answer);
    });

    socket.current.on("ice-candidate", async (candidate) => {
      console.log("Received ICE candidate");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedRoom]);

  // ----- Start local media -----
  useEffect(() => {
    async function startLocalVideo() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: true,
        });

        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        if (peerConnection.current) {
          attachLocalTracksToPeerConnection();
        }
      } catch (err) {
        console.error("Error accessing camera/mic:", err);
      }
    }

    startLocalVideo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const attachLocalTracksToPeerConnection = () => {
    if (!localStreamRef.current || !peerConnection.current) return;

    localStreamRef.current.getTracks().forEach((track) => {
      const senders = peerConnection.current.getSenders();
      const exists = senders.some((s) => s.track && s.track.kind === track.kind);
      if (!exists) {
        peerConnection.current.addTrack(track, localStreamRef.current);
      }
    });
  };

  // ----- Matchmaking & Rooms -----
  const handleRandomMatch = () => {
    if (!socket.current) return;
    socket.current.emit("join-random");
  };

  const handleJoinRoom = () => {
    if (!socket.current || !roomId) return;
    socket.current.emit("join-room", roomId);
  };

  // ----- Start call (send offer) -----
  const startCall = async () => {
    if (!peerConnection.current) {
      peerConnection.current = createPeerConnection();
      attachLocalTracksToPeerConnection();
    }

    if (!matchedRoom) {
      console.warn("No room yet – use Random Match or Join Room first.");
      return;
    }

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    socket.current.emit("offer", { roomId: matchedRoom, offer });
  };

  // ----- Media controls -----
  const handleToggleMic = () => {
    if (!localStreamRef.current) return;

    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });

    setMicOn((prev) => !prev);
  };

  const handleToggleCamera = () => {
    if (!localStreamRef.current) return;

    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });

    setCameraOn((prev) => !prev);
  };

  const handleSwitchCamera = async () => {
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

    if (peerConnection.current) {
      const videoTrack = newStream.getVideoTracks()[0];
      const sender = peerConnection.current
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");

      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }
    }
  };

  // ----- End call -----
  const handleEndCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (peerConnection.current) {
      peerConnection.current.ontrack = null;
      peerConnection.current.onicecandidate = null;
      peerConnection.current.close();
      peerConnection.current = null;
    }

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
  };

  // ----- Recording (remote or local) -----
  const startRecording = () => {
    const streamToRecord =
      remoteVideoRef.current?.srcObject || localStreamRef.current;
    if (!streamToRecord) {
      console.warn("No stream to record yet");
      return;
    }

    const mediaRecorder = new MediaRecorder(streamToRecord, {
      mimeType: "video/webm;codecs=vp9",
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data]);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = "recording.webm";
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      setRecordedChunks([]);
    };

    mediaRecorder.start();
    setRecorder(mediaRecorder);
    setRecording(true);
  };

  const stopRecording = () => {
    if (recorder) {
      recorder.stop();
      setRecording(false);
      setRecorder(null);
    }
  };

  return (
    <div className="video-container">
      <div className="video-wrapper">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="remote-video"
        />
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="local-video"
        />
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
