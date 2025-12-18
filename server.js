// server.js (FINAL)
// Signaling server with chat history + accurate viewer counts

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

// ✅ In-memory state
const rooms = new Map();       // roomId -> [socketIds]
const chatHistory = new Map(); // roomId -> [messages]

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  // -------------------------------
  // MANUAL ROOM JOIN
  // -------------------------------
  socket.on("join-room", (roomId) => {
    socket.join(roomId);

    const members = rooms.get(roomId) || [];
    const updated = [...members, socket.id];
    rooms.set(roomId, updated);

    io.to(socket.id).emit("room-joined", roomId);

    // ✅ Send existing chat history
    const history = chatHistory.get(roomId) || [];
    io.to(socket.id).emit("chat-history", history);

    // ✅ Broadcast viewer count (actual room membership)
    io.to(roomId).emit("viewer-count", updated.length);

    console.log(`✅ ${socket.id} joined room ${roomId} (count: ${updated.length})`);
  });

  // -------------------------------
  // WEBRTC SIGNALING
  // -------------------------------
  socket.on("offer", ({ roomId, offer }) => {
    socket.to(roomId).emit("offer", offer);
  });

  socket.on("answer", ({ roomId, answer }) => {
    socket.to(roomId).emit("answer", answer);
  });

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", candidate);
  });

  // -------------------------------
  // CHAT MESSAGING (with history)
  // -------------------------------
  socket.on("chat-message", ({ roomId, user, text, timestamp }) => {
    const msg = { user, text, timestamp };

    const history = chatHistory.get(roomId) || [];
    history.push(msg);
    chatHistory.set(roomId, history);

    io.to(roomId).emit("chat-message", msg);
    console.log(`💬 Message in ${roomId} from ${user}: ${text}`);
  });

  // -------------------------------
  // CLEANUP ON DISCONNECT
  // -------------------------------
  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);

    for (const [roomId, members] of rooms.entries()) {
      if (members.includes(socket.id)) {
        const updated = members.filter((id) => id !== socket.id);

        if (updated.length === 0) {
          rooms.delete(roomId);
          chatHistory.delete(roomId);
        } else {
          rooms.set(roomId, updated);
          io.to(roomId).emit("viewer-count", updated.length);
        }
      }
    }
  });
});

// -------------------------------
// ROOT ENDPOINT
// -------------------------------
app.get("/", (req, res) => {
  res.send("✅ Xchange signaling server running.");
});

// -------------------------------
// START SERVER
// -------------------------------
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Signaling server running on port ${PORT}`);
});
