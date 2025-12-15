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
    console.log("Host joined:", socket.id);
  });

  // -----------------------------
  // VIEWER JOINS
  // -----------------------------
  socket.on("viewer-join", () => {
    viewerCount++;
    io.emit("viewer-count", viewerCount);

    // Notify host
    io.to("host").emit("viewer-joined", socket.id);
  });

  // -----------------------------
  // WEBRTC SIGNALING
  // -----------------------------
  socket.on("offer", ({ targetId, offer }) => {
    io.to(targetId).emit("offer", { from: socket.id, offer });
  });

  socket.on("answer", ({ targetId, answer }) => {
    io.to(targetId).emit("answer", { from: socket.id, answer });
  });

  socket.on("ice-candidate", ({ targetId, candidate }) => {
    io.to(targetId).emit("ice-candidate", { from: socket.id, candidate });
  });

  // -----------------------------
  // REAL-TIME CHAT
  // -----------------------------
  socket.on("chat-message", (data) => {
    // data = { name, message }
    io.emit("chat-message", data);
  });

  // -----------------------------
  // REAL-TIME HEARTS
  // -----------------------------
  socket.on("heart", () => {
    // Broadcast to everyone (host + viewers)
    io.emit("heart");
  });

  // -----------------------------
  // DISCONNECT
  // -----------------------------
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);

    // If a viewer disconnects, reduce count
    viewerCount = Math.max(0, viewerCount - 1);
    io.emit("viewer-count", viewerCount);
  });
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
