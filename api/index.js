/**
 * Vercel Serverless Function Entry Point
 */

const express = require("express");
const { Server } = require("socket.io");
const path = require("path");

const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, "../client")));

// Main route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

module.exports = app;
