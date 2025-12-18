import { io } from "socket.io-client";

const SIGNALING_URL = "https://zazza-backend.onrender.com";

export function useWebRTC(role = "viewer", username = "Guest") {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const socket = io(SIGNALING_URL, {
      transports: ["websocket"], // ✅ skip polling
      path: "/socket.io",
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to signaling:", socket.id);
    });

    // ✅ Messaging: single source of truth
    socket.on("chat-message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => socket.disconnect();
  }, []);

  const sendChatMessage = (text) => {
    if (!text || !socketRef.current || !matchedRoom) return;
    const msg = {
      roomId: matchedRoom,
      user: username,
      text,
      timestamp: Date.now(),
    };
    socketRef.current.emit("chat-message", msg);
    // ❌ don’t setMessages locally — rely on server rebroadcast
  };

  return { messages, sendChatMessage };
}
