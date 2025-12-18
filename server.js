const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // or your frontend URL
    methods: ["GET", "POST"],
  },
  transports: ["websocket"], // ✅ force WebSocket transport
  path: "/socket.io",        // ✅ default path
});

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.on("join-room", ({ roomId, role }) => {
    socket.join(roomId);
    io.to(socket.id).emit("room-joined", roomId);
  });

  // ✅ Messaging: rebroadcast to room
  socket.on("chat-message", (msg) => {
    io.to(msg.roomId).emit("chat-message", msg);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});
