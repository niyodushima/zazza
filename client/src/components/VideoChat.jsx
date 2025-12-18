// src/components/VideoChat.jsx
import React, { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./VideoChat.css";

const SIGNALING_URL = "https://zazza-backend.onrender.com";

export default function VideoChat() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  const socket = useRef(null);
  const peerConnection = useRef(null);

  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [facingMode, setFacingMode] = useState("user");

  const [roomId, setRoomId] = useState("");
  const [matchedRoom, setMatchedRoom] = useState(null);

  const [recorder, setRecorder] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

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
      if (event.candidate && matchedRoom && socket.current) {
        socket.current.emit("ice-candidate", {
          roomId: matchedRoom,
          candidate: event.candidate,
        });
      }
    };

    return pc;
  };

  const attachLocalTracksToPeerConnection = () => {
    if (!localStreamRef.current || !peerConnection.current) return;

    localStreamRef.current.getTracks().forEach((track) => {
      const senders = peerConnection.current.getSenders();
      const exists = senders.some(
        (s) => s.track && s.track.kind === track.kind
      );

      if (!exists) {
        peerConnection.current.addTrack(track, localStreamRef.current);
      }
    });
  };

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

  // ---------- Socket + signaling ----------

  useEffect(() => {
    socket.current = io(SIGNALING_URL);

    socket.current.on("connect", () => {
      console.log("Connected to signaling server:", socket.current.id);
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

    socket.current.on("answer", async (answer) => {
      if (peerConnection.current) {
        await peerConnection.current.setRemoteDescription(answer);
      }
    });

    socket.current.on("ice-candidate", async (candidate) => {
      try {
        if (peerConnection.current) {
          await peerConnection.current.addIceCandidate(candidate);
        }
      } catch (err) {
        console.error("Error adding ICE candidate", err);
      }
    });

    // Chat messages
    socket.current.on("chat-message", ({ from, text, timestamp }) => {
      setMessages((prev) => [
        ...prev,
        { from, text, timestamp: timestamp || Date.now() },
      ]);
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedRoom]);

  // ---------- Timer ----------

  useEffect(() => {
    let interval = null;

    if (callActive) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    } else if (!callActive && secondsElapsed !== 0) {
      clearInterval(interval);
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

  // ---------- Matchmaking & rooms ----------

  const handleRandomMatch = () => {
    if (!socket.current) return;
    socket.current.emit("join-random");
  };

  const handleJoinRoom = () => {
    if (!socket.current || !roomId) return;
    socket.current.emit("join-room", roomId);
  };

  // ---------- Call control ----------

  const startCall = async () => {
    if (!peerConnection.current) {
      peerConnection.current = createPeerConnection();
    }

    await startLocalVideoIfNotStarted();
    attachLocalTracksToPeerConnection();

    if (!matchedRoom) {
      console.warn("No room yet – use Random Match or Join Room first.");
      return;
    }

    const offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);

    socket.current.emit("offer", { roomId: matchedRoom, offer });

    setCallActive(true);
    setSecondsElapsed(0);

    socket.current.emit("session-started", { roomId: matchedRoom });
  };

  const handleEndCall = () => {
    if (callActive && socket.current && matchedRoom) {
      socket.current.emit("session-ended", {
        roomId: matchedRoom,
        durationSeconds: secondsElapsed,
      });
    }

    setCallActive(false);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
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

  // ---------- Media controls ----------

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
      const senders = peerConnection.current.getSenders();
      const sender = senders.find(
        (s) => s.track && s.track.kind === "video"
      );

      if (sender && videoTrack) {
        await sender.replaceTrack(videoTrack);
      }
    }
  };

  // ---------- Screen sharing ----------

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

      if (peerConnection.current) {
        const senders = peerConnection.current.getSenders();
        const sender = senders.find(
          (s) => s.track && s.track.kind === "video"
        );

        if (sender && screenTrack) {
          await sender.replaceTrack(screenTrack);
        }
      }

      screenTrack.onended = () => {
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

      if (peerConnection.current) {
        const senders = peerConnection.current.getSenders();
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

  // ---------- Chat ----------

  const sendChatMessage = () => {
    if (!chatInput.trim() || !socket.current || !matchedRoom) return;

    const msg = {
      roomId: matchedRoom,
      text: chatInput.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [
      ...prev,
      { from: "me", text: msg.text, timestamp: msg.timestamp },
    ]);

    socket.current.emit("chat-message", msg);
    setChatInput("");
  };

  // ---------- Recording ----------

  const startRecording = () => {
    const stream =
      (remoteVideoRef.current && remoteVideoRef.current.srcObject) ||
      localStreamRef.current;
    if (!stream) return;

    const mediaRecorder = new MediaRecorder(stream, {
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
    if (recorder) {
      recorder.stop();
      setRecording(false);
      setRecorder(null);
    }
  };

  // ---------- UI ----------

  const formattedTime = () => {
    const minutes = Math.floor(secondsElapsed / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (secondsElapsed % 60).toString().padStart(2, "0");
    return minutes + ":" + seconds;
  };

  return (
    <div className="videochat-container">
      <div className="video-section">
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

          <div className="main-controls">
            <button className="control-btn" onClick={startCall}>
              Start Call
            </button>

            <button className="control-btn" onClick={handleToggleMic}>
              {micOn ? "Mute" : "Unmute"}
            </button>

            <button className="control-btn" onClick={handleToggleCamera}>
              {cameraOn ? "Camera Off" : "Camera On"}
            </button>

            <button
              className="control-btn"
              onClick={screenSharing ? stopScreenShare : startScreenShare}
            >
              {screenSharing ? "Stop Sharing" : "Share Screen"}
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

            <div className="session-timer">Session: {formattedTime()}</div>
          </div>
        </div>
      </div>

      <div className="chat-section">
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.from === "me"
                  ? "chat-msg chat-msg-me"
                  : "chat-msg chat-msg-them"
              }
            >
              <span className="chat-text">{m.text}</span>
            </div>
          ))}
        </div>

        <div className="chat-input-row">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => {
              if (e.key === "Enter") sendChatMessage();
            }}
          />
          <button className="control-btn" onClick={sendChatMessage}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
