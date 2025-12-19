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
  transports: ["websocket"], // ✅ force WebSocket
  path: "/socket.io",
});

// roomId -> { host: socketId, viewers: [] }
const rooms = new Map();

io.on("connection", (socket) => {
  console.log("✅ Connected:", socket.id);

  socket.on("join-room", ({ roomId, role }) => {
    socket.join(roomId);
    let room = rooms.get(roomId) || { host: null, viewers: [] };

    if (role === "host") {
      room.host = socket.id;
    } else {
      if (!room.viewers.includes(socket.id)) {
        room.viewers.push(socket.id);
      }
    }

    rooms.set(roomId, room);

    io.to(socket.id).emit("room-joined", roomId);
    io.to(roomId).emit("viewer-count", room.viewers.length); // ✅ static number
  });

  // WebRTC signaling relay
  socket.on("offer", ({ roomId, offer }) => {
    socket.to(roomId).emit("offer", offer);
  });
  socket.on("answer", ({ roomId, answer }) => {
    socket.to(roomId).emit("answer", answer);
  });
  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", candidate);
  });

  // Chat
  socket.on("chat-message", (msg) => {
    io.to(msg.roomId).emit("chat-message", msg);
  });

  socket.on("disconnect", () => {
    for (const [roomId, room] of rooms.entries()) {
      if (room.host === socket.id) {
        room.host = null;
      }
      room.viewers = room.viewers.filter((id) => id !== socket.id);
      rooms.set(roomId, room);
      io.to(roomId).emit("viewer-count", room.viewers.length);
    }
    console.log("❌ Disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
