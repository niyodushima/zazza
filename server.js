// server.js (UPDATED FOR B2)
// This version upgrades your existing backend without replacing your architecture.

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // tighten later
    methods: ["GET", "POST"],
  },
});

// ✅ In-memory matchmaking + rooms
const waitingSockets = new Set();
const rooms = new Map(); // roomId -> [socketId1, socketId2]

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  // -------------------------------
  // ✅ RANDOM MATCHMAKING
  // -------------------------------
  socket.on("join-random", () => {
    if (waitingSockets.size === 0) {
      waitingSockets.add(socket.id);
      console.log("🔵 Waiting for match:", socket.id);
      return;
    }

    const [partnerId] = waitingSockets;
    waitingSockets.delete(partnerId);

    const roomId = `room-${socket.id}-${partnerId}`;
    rooms.set(roomId, [socket.id, partnerId]);

    socket.join(roomId);
    io.to(partnerId).socketsJoin(roomId);

    io.to(socket.id).emit("paired", { roomId });
    io.to(partnerId).emit("paired", { roomId });

    console.log(`✅ Paired ${socket.id} with ${partnerId} in ${roomId}`);
  });

  // -------------------------------
  // ✅ MANUAL ROOM JOIN
  // -------------------------------
  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    const members = rooms.get(roomId) || [];
    const updated = [...members, socket.id];
    rooms.set(roomId, updated);

    io.to(socket.id).emit("room-joined", roomId);

    console.log(`✅ ${socket.id} joined room ${roomId}`);
  });

  // -------------------------------
  // ✅ WEBRTC SIGNALING
  // -------------------------------
  socket.on("offer", ({ roomId, offer }) => {
    console.log(`📨 Offer sent to room ${roomId}`);
    socket.to(roomId).emit("offer", offer);
  });

  socket.on("answer", ({ roomId, answer }) => {
    console.log(`📨 Answer sent to room ${roomId}`);
    socket.to(roomId).emit("answer", answer);
  });

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", candidate);
  });

  // -------------------------------
  // ✅ CHAT MESSAGING
  // -------------------------------
  socket.on("chat-message", ({ roomId, text, timestamp }) => {
    io.to(roomId).emit("chat-message", {
      from: socket.id,
      text,
      timestamp,
    });
  });

  // -------------------------------
  // ✅ SESSION EVENTS (for credits)
  // -------------------------------
  socket.on("session-started", ({ roomId }) => {
    console.log(`🟢 Session started in ${roomId}`);
    // TODO: Save session start in DB
  });

  socket.on("session-ended", ({ roomId, durationSeconds }) => {
    console.log(
      `🔴 Session ended in ${roomId} — Duration: ${durationSeconds}s`
    );

    // TODO:
    // 1. Fetch session record
    // 2. Compute billable minutes
    // 3. Deduct credits from learner
    // 4. Add earnings to mentor
    // 5. Save session summary
  });

  // -------------------------------
  // ✅ CLEANUP ON DISCONNECT
  // -------------------------------
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);

    waitingSockets.delete(socket.id);

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

// -------------------------------
// ✅ ROOT ENDPOINT
// -------------------------------
app.get("/", (req, res) => {
  res.send("✅ Xchange signaling server running.");
});

// -------------------------------
// ✅ START SERVER
// -------------------------------
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});
