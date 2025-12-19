// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/socket.io", // ✅ must match client
});

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.on("join-room", ({ roomId, role }) => {
    socket.join(roomId);
    console.log(`🔗 ${socket.id} joined room ${roomId} as ${role}`);
    io.to(socket.id).emit("room-joined", roomId);
  });

  // ✅ Chat relay
  socket.on("chat-message", (msg) => {
    console.log("💬 Message:", msg);
    io.to(msg.roomId).emit("chat-message", msg);
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
