const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Track connected viewers
let viewerCount = 0;

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // -----------------------------
  // HOST JOINS
  // -----------------------------
  socket.on("host-join", () => {
    socket.join("host");
    console.log("Host joined room: host");
  });

  // -----------------------------
  // VIEWER JOINS
  // -----------------------------
  socket.on("viewer-join", () => {
    socket.join("viewer");
    viewerCount++;
    io.emit("viewer-count", viewerCount);

    // Notify host
    io.to("host").emit("viewer-joined", socket.id);
  });

  // -----------------------------
  // WEBRTC SIGNALING (ROOM-BASED)
  // -----------------------------
  socket.on("offer", ({ offer }) => {
    io.to("viewer").emit("offer", { from: socket.id, offer });
  });

  socket.on("answer", ({ answer }) => {
    io.to("host").emit("answer", { from: socket.id, answer });
  });

  socket.on("ice-candidate", ({ candidate }) => {
    // Relay ICE to both sides
    socket.to("host").emit("ice-candidate", { candidate });
    socket.to("viewer").emit("ice-candidate", { candidate });
  });

  // -----------------------------
  // REAL-TIME CHAT
  // -----------------------------
  socket.on("chat-message", (data) => {
    io.emit("chat-message", data);
  });

  // -----------------------------
  // REAL-TIME HEARTS
  // -----------------------------
  socket.on("heart", () => {
    io.emit("heart");
  });

  // -----------------------------
  // DISCONNECT
  // -----------------------------
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    viewerCount = Math.max(0, viewerCount - 1);
    io.emit("viewer-count", viewerCount);
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
