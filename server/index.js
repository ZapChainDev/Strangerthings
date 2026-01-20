/**
 * Server Entry Point
 * Sets up Express server with Socket.io for multiplayer functionality
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const GameServer = require("./GameServer");

const PORT = process.env.PORT || 3000;

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Configure Socket.io with CORS for development
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Serve static files from client directory
app.use(express.static(path.join(__dirname, "../client")));

// Serve Three.js from CDN redirect or local
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// Initialize game server with Socket.io instance
const gameServer = new GameServer(io);

// Start listening
server.listen(PORT, () => {
  console.log(`
    ╔═══════════════════════════════════════════════════╗
    ║     STRANGER THINGS MULTIPLAYER GAME SERVER       ║
    ║                                                   ║
    ║   Server running on http://localhost:${PORT}         ║
    ║   Waiting for players to connect...               ║
    ╚═══════════════════════════════════════════════════╝
    `);
});
