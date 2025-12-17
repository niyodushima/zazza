// src/hooks/useWebRTC.js
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SIGNALING_URL = "https://zazza-backend.onrender.com";

export function useWebRTC(role) {
  const socketRef = useRef(null);
  const pcRef = useRef(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Guard against double initialization
    if (socketRef.current || pcRef.current) return;

    const socket = io(SIGNALING_URL, {
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
      setConnected(true);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", { candidate: event.candidate });
      }
    };

    async function enableLocalMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });
      } catch (err) {
        console.error("[WEBRTC] Error accessing media:", err);
      }
    }

    enableLocalMedia();

    socket.on("connect", () => {
      if (role === "host") {
        socket.emit("host-join");
      } else {
        socket.emit("viewer-join");
      }
    });

    if (role === "host") {
      socket.on("viewer-joined", async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("offer", { offer });
        } catch (err) {
          console.error("[HOST] Error creating offer:", err);
        }
      });

      socket.on("answer", async ({ answer }) => {
        try {
          await pc.setRemoteDescription(answer);
        } catch (err) {
          console.error("[HOST] Error setting remote answer:", err);
        }
      });
    } else {
      socket.on("offer", async ({ offer }) => {
        try {
          await pc.setRemoteDescription(offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", { answer });
        } catch (err) {
          console.error("[VIEWER] Error handling offer:", err);
        }
      });
    }

    socket.on("ice-candidate", async ({ candidate }) => {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error("[WEBRTC] Error adding ICE candidate:", err);
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (pcRef.current) pcRef.current.close();
    };
  }, [role]);

  return {
    socket: socketRef,
    localVideoRef,
    remoteVideoRef,
    connected,
  };
}
