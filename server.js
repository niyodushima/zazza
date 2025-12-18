// backend/server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // tighten in production
    methods: ["GET", "POST"],
  },
});

// Simple in-memory room / matchmaking store
const waitingSockets = new Set(); // for random match
const rooms = new Map(); // roomId -> [socketId1, socketId2]

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // ---------- Random matchmaking ----------
  socket.on("join-random", () => {
    if (waitingSockets.size === 0) {
      waitingSockets.add(socket.id);
      console.log("Socket waiting for match:", socket.id);
      return;
    }

    const [partnerId] = waitingSockets;
    waitingSockets.delete(partnerId);

    const roomId = `room-${socket.id}-${partnerId}`;
    rooms.set(roomId, [socket.id, partnerId]);

    socket.join(roomId);
    io.to(partnerId).socketsJoin(roomId); // both in same room

    io.to(socket.id).emit("paired", { roomId });
    io.to(partnerId).emit("paired", { roomId });

    console.log(`Paired ${socket.id} and ${partnerId} in ${roomId}`);
  });

  // ---------- Manual room join ----------
  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    const members = rooms.get(roomId) || [];
    const updated = [...members, socket.id];
    rooms.set(roomId, updated);

    io.to(socket.id).emit("room-joined", roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  // ---------- WebRTC signaling ----------
  socket.on("offer", ({ roomId, offer }) => {
    socket.to(roomId).emit("offer", offer);
  });

  socket.on("answer", ({ roomId, answer }) => {
    socket.to(roomId).emit("answer", answer);
  });

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", candidate);
  });

  // ---------- Chat ----------
  socket.on("chat-message", ({ roomId, text, timestamp }) => {
    io.to(roomId).emit("chat-message", {
      from: socket.id,
      text,
      timestamp,
    });
  });

  // ---------- Session events (for credits) ----------
  socket.on("session-started", ({ roomId }) => {
    console.log(`Session started in ${roomId}`);
    // TODO: create Session record in DB, mark start time
  });

  socket.on("session-ended", ({ roomId, durationSeconds }) => {
    console.log(
      `Session ended in ${roomId}, duration: ${durationSeconds} seconds`
    );
    // TODO:
    // 1. Look up session record by roomId
    // 2. Compute billable minutes Math.ceil(durationSeconds / 60)
    // 3. Deduct credits from learner, add to mentor
    // 4. Save final session details
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    waitingSockets.delete(socket.id);

    // Remove from rooms
    for (const [roomId, members] of rooms.entries()) {
      if (members.includes(socket.id)) {
        const updated = members.filter((id) => id !== socket.id);
        if (updated.length === 0) {
          rooms.delete(roomId);
        } else {
          rooms.set(roomId, updated);
        }
      }
    }
  });
});

app.get("/", (req, res) => {
  res.send("Xchange signaling server is running.");
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Signaling server listening on port ${PORT}`);
});
