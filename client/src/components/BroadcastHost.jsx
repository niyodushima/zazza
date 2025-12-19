// src/components/BroadcastHost.jsx
import React, { useEffect, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import ChatPanel from "./ChatPanel";

export default function BroadcastHost() {
  const [username] = useState("Host");
  const {
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
  } = useWebRTC("host", username);

  useEffect(() => {
    if (typeof joinRoom === "function") joinRoom("demo-room");
  }, []);

  return
