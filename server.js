// server.js
// Only load dotenv locally (not needed on Render)
if (process.env.NODE_ENV !== "production") {
  try {
    require("dotenv").config();
  } catch (err) {
    console.warn("dotenv not installed in production, skipping...");
  }
}

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json());

// ✅ Health check route so root URL works
app.get("/", (req, res) => {
  res.send("✅ Zazza backend is running");
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/socket.io",
});

// In-memory room state
// roomId -> { host: socketId | null, viewers: Set<socketId> }
const rooms = new Map();

io.on("connection", (socket) => {
  console.log("✅ Connected:", socket.id);

  socket.on("join-room", ({ roomId, role, name }) => {
    if (!roomId || !role) return;
    socket.join(roomId);

    const existing = rooms.get(roomId) || { host: null, viewers: new Set() };
    if (role === "host") {
      existing.host = socket.id;
    } else {
      existing.viewers.add(socket.id);
    }
    rooms.set(roomId, existing);

    io.to(socket.id).emit("room-joined", { roomId, role });
    io.to(roomId).emit("viewer-count", existing.viewers.size);
    io.to(roomId).emit("system", `${name || role} joined`);
  });

  // WebRTC signaling relay
  socket.on("offer", ({ roomId, offer }) => {
    if (roomId && offer) socket.to(roomId).emit("offer", offer);
  });
  socket.on("answer", ({ roomId, answer }) => {
    if (roomId && answer) socket.to(roomId).emit("answer", answer);
  });
  socket.on("ice-candidate", ({ roomId, candidate }) => {
    if (roomId && candidate) socket.to(roomId).emit("ice-candidate", candidate);
  });

  // Chat
  socket.on("chat-message", (msg) => {
    if (!msg || !msg.roomId) return;
    io.to(msg.roomId).emit("chat-message", msg);
  });

  // Hearts (likes)
  socket.on("heart", ({ roomId }) => {
    if (!roomId) return;
    socket.to(roomId).emit("heart");
  });

  // Session time (host emits)
  socket.on("session-time", ({ roomId, seconds }) => {
    if (!roomId) return;
    io.to(roomId).emit("session-time", seconds);
  });

  socket.on("disconnect", () => {
    for (const [roomId, room] of rooms.entries()) {
      let changed = false;
      if (room.host === socket.id) {
        room.host = null;
        changed = true;
      }
      if (room.viewers.has(socket.id)) {
        room.viewers.delete(socket.id);
        changed = true;
      }
      if (changed) {
        rooms.set(roomId, room);
        io.to(roomId).emit("viewer-count", room.viewers.size);
      }
    }
    console.log("❌ Disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));
