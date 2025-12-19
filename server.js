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

const rooms = new Map(); // roomId -> { host, viewers: [] }

io.on("connection", (socket) => {
  console.log("✅ Connected:", socket.id);

  socket.on("join-room", ({ roomId, role }) => {
    socket.join(roomId);
    let room = rooms.get(roomId) || { host: null, viewers: [] };

    if (role === "host") room.host = socket.id;
    else room.viewers.push(socket.id);

    rooms.set(roomId, room);

    io.to(socket.id).emit("room-joined", roomId);
    io.to(roomId).emit("viewer-count", room.viewers.length);
  });

  socket.on("chat-message", (msg) => {
    io.to(msg.roomId).emit("chat-message", msg);
  });

  socket.on("disconnect", () => {
    for (const [roomId, room] of rooms.entries()) {
      if (room.host === socket.id) room.host = null;
      room.viewers = room.viewers.filter((id) => id !== socket.id);
      rooms.set(roomId, room);
      io.to(roomId).emit("viewer-count", room.viewers.length);
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
