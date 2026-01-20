/**
 * GameServer Class
 * Handles all multiplayer game logic, room management, and player synchronization
 * Server is authoritative - validates and broadcasts player states
 *
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  SERVER ARCHITECTURE: WebSocket vs Firebase                                   ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  This server handles REAL-TIME gameplay via WebSocket (Socket.io):            ║
 * ║  - Player positions: 20 updates/second, ~50ms latency requirement             ║
 * ║  - Player rotations and animations                                            ║
 * ║  - Collision detection and physics                                            ║
 * ║  - Join/leave notifications                                                   ║
 * ║                                                                                ║
 * ║  Firebase handles PERSISTENCE (via client-side FirebaseManager):              ║
 * ║  - Player identity (UID persists across sessions)                             ║
 * ║  - Profile storage (name, preferences)                                        ║
 * ║  - Room metadata (for lobby display)                                          ║
 * ║  - Global world state (low-frequency sync)                                    ║
 * ║                                                                                ║
 * ║  WHY NOT FIREBASE FOR REAL-TIME?                                              ║
 * ║  - Latency: Firestore ~100-300ms vs WebSocket ~10-50ms                        ║
 * ║  - Cost: 20 ticks/sec × 30 players = 51M writes/day (free tier: 20K)          ║
 * ║  - Scalability: Firestore not designed for game loop frequency                ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const Room = require("./Room");
const Player = require("./Player");
const { v4: uuidv4 } = require("uuid");

// Server configuration constants
const CONFIG = {
  MAX_PLAYERS_PER_ROOM: 30,
  TICK_RATE: 20, // Server updates per second
  POSITION_THRESHOLD: 0.01, // Minimum movement to broadcast
  ROTATION_THRESHOLD: 0.01, // Minimum rotation to broadcast
  WORLD_BOUNDS: {
    minX: -500,
    maxX: 500,
    minZ: -500,
    maxZ: 500,
  },
};

class GameServer {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> Room
    this.players = new Map(); // socketId -> Player
    this.socketToRoom = new Map(); // socketId -> roomId
    this.uidToSocket = new Map(); // Firebase UID -> socketId (for reconnection handling)

    // Create default room
    this.createRoom("hawkins-1");

    // Set up connection handler
    this.io.on("connection", (socket) => this.handleConnection(socket));

    // Start game loop
    this.startGameLoop();

    console.log("[GameServer] Initialized with default room: hawkins-1");
  }

  /**
   * Creates a new game room
   */
  createRoom(roomId) {
    const room = new Room(roomId, CONFIG.MAX_PLAYERS_PER_ROOM);
    this.rooms.set(roomId, room);
    console.log(`[GameServer] Room created: ${roomId}`);
    return room;
  }

  /**
   * Handles new player connection
   */
  handleConnection(socket) {
    console.log(`[GameServer] Player connected: ${socket.id}`);

    // Handle player join request
    socket.on("player:join", (data) => this.handlePlayerJoin(socket, data));

    // Handle character selection
    socket.on("player:selectCharacter", (data) =>
      this.handleCharacterSelect(socket, data)
    );

    // Handle player ready (after character selection)
    socket.on("player:ready", (data) => this.handlePlayerReady(socket, data));

    // Handle player movement updates
    socket.on("player:move", (data) => this.handlePlayerMove(socket, data));

    // Handle world state change (Normal <-> Upside Down)
    socket.on("player:worldChange", (data) =>
      this.handleWorldChange(socket, data)
    );

    // Handle animation state changes
    socket.on("player:animation", (data) =>
      this.handleAnimationChange(socket, data)
    );

    // Handle chat messages (optional feature)
    socket.on("player:chat", (data) => this.handleChat(socket, data));

    // Handle disconnection
    socket.on("disconnect", () => this.handleDisconnect(socket));
  }

  /**
   * Handles player joining a room
   * Now accepts Firebase UID for persistent identity
   * Player joins in "lobby" state until they select a character
   */
  handlePlayerJoin(socket, data) {
    const { username = "Player", uid = null, roomId = "hawkins-1" } = data;

    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit("error", { message: "Room not found" });
      return;
    }

    if (room.isFull()) {
      socket.emit("error", { message: "Room is full" });
      return;
    }

    // Handle reconnection: if UID already connected, disconnect old socket
    if (uid && this.uidToSocket.has(uid)) {
      const oldSocketId = this.uidToSocket.get(uid);
      if (oldSocketId !== socket.id) {
        console.log(
          `[GameServer] UID ${uid} reconnected, cleaning old session`
        );
        // The old socket will be cleaned up when it disconnects
      }
    }

    // Create player with spawn position (but don't add to room yet - they need to select character)
    const spawnPos = this.getSpawnPosition();
    const player = new Player(socket.id, username, spawnPos);

    // Store Firebase UID for identity tracking (not for persistence - that's Firestore's job)
    player.firebaseUid = uid;

    // Register player (but not in room until character selected)
    this.players.set(socket.id, player);
    this.socketToRoom.set(socket.id, roomId);
    if (uid) {
      this.uidToSocket.set(uid, socket.id);
    }

    // Join socket room for broadcasts
    socket.join(roomId);

    // Send player the character selection screen with available characters
    socket.emit("player:selectCharacterScreen", {
      id: socket.id,
      uid: uid,
      characters: room.getCharacterStates(),
    });

    console.log(
      `[GameServer] ${username} (UID: ${
        uid || "none"
      }) connected to ${roomId}, awaiting character selection`
    );
  }

  /**
   * Handles character selection
   */
  handleCharacterSelect(socket, data) {
    const { characterId } = data;
    const player = this.players.get(socket.id);
    const roomId = this.socketToRoom.get(socket.id);

    if (!player || !roomId) {
      socket.emit("error", { message: "Player not found" });
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit("error", { message: "Room not found" });
      return;
    }

    // Try to select the character
    const result = room.selectCharacter(socket.id, characterId);

    if (!result.success) {
      socket.emit("character:selectFailed", {
        error: result.error,
        characters: room.getCharacterStates(),
      });
      return;
    }

    // Update player with selected character
    player.setCharacter(characterId);

    // Notify the player of successful selection
    socket.emit("character:selected", {
      characterId: characterId,
      characters: room.getCharacterStates(),
    });

    // Notify all other players in the room about character state change
    socket.to(roomId).emit("character:stateChanged", {
      characters: room.getCharacterStates(),
    });

    console.log(
      `[GameServer] ${player.username} selected character: ${characterId}`
    );
  }

  /**
   * Handles player ready (after character selection, start the game)
   */
  handlePlayerReady(socket, data) {
    const player = this.players.get(socket.id);
    const roomId = this.socketToRoom.get(socket.id);

    if (!player || !roomId) {
      socket.emit("error", { message: "Player not found" });
      return;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit("error", { message: "Room not found" });
      return;
    }

    // Check if player has selected a character
    if (!player.characterId) {
      socket.emit("error", { message: "Please select a character first" });
      return;
    }

    // Now add player to the room
    room.addPlayer(player);

    // Send player their initial state and existing players
    socket.emit("player:joined", {
      id: socket.id,
      uid: player.firebaseUid,
      player: player.serialize(),
      players: room
        .getPlayersInWorldState(player.worldState)
        .filter((p) => p.id !== socket.id)
        .map((p) => p.serialize()),
    });

    // Notify other players in same world state
    socket.to(roomId).emit("player:spawned", {
      player: player.serialize(),
    });

    console.log(
      `[GameServer] ${player.username} (${
        player.characterId
      }) joined room ${roomId} (${room.getPlayerCount()}/${
        CONFIG.MAX_PLAYERS_PER_ROOM
      })`
    );
  }

  /**
   * Handles player movement updates
   * Server validates and broadcasts to relevant players
   */
  handlePlayerMove(socket, data) {
    const player = this.players.get(socket.id);
    if (!player) return;

    const { position, rotation, animation } = data;

    // Validate position bounds
    if (position) {
      position.x = Math.max(
        CONFIG.WORLD_BOUNDS.minX,
        Math.min(CONFIG.WORLD_BOUNDS.maxX, position.x)
      );
      position.z = Math.max(
        CONFIG.WORLD_BOUNDS.minZ,
        Math.min(CONFIG.WORLD_BOUNDS.maxZ, position.z)
      );
    }

    // Check if update is significant enough to broadcast
    const posChanged =
      position &&
      player.hasPositionChanged(position, CONFIG.POSITION_THRESHOLD);
    const rotChanged =
      rotation !== undefined &&
      player.hasRotationChanged(rotation, CONFIG.ROTATION_THRESHOLD);
    const animChanged = animation && player.animation !== animation;

    if (!posChanged && !rotChanged && !animChanged) return;

    // Update player state
    if (position) player.setPosition(position);
    if (rotation !== undefined) player.setRotation(rotation);
    if (animation) player.animation = animation;

    player.lastUpdate = Date.now();

    // Mark for broadcast
    player.needsBroadcast = true;
  }

  /**
   * Handles world state change (entering/exiting Upside Down)
   */
  handleWorldChange(socket, data) {
    const player = this.players.get(socket.id);
    const roomId = this.socketToRoom.get(socket.id);
    if (!player || !roomId) return;

    const room = this.rooms.get(roomId);
    const oldWorldState = player.worldState;
    const newWorldState = data.worldState;

    // Validate world state
    if (newWorldState !== "normal" && newWorldState !== "upsideDown") return;
    if (oldWorldState === newWorldState) return;

    // Update player world state
    player.worldState = newWorldState;

    // Notify players in OLD world state that this player left
    const oldWorldPlayers = room
      .getPlayersInWorldState(oldWorldState)
      .filter((p) => p.id !== socket.id);

    oldWorldPlayers.forEach((p) => {
      this.io.to(p.id).emit("player:left", { id: socket.id });
    });

    // Notify players in NEW world state that this player appeared
    const newWorldPlayers = room
      .getPlayersInWorldState(newWorldState)
      .filter((p) => p.id !== socket.id);

    newWorldPlayers.forEach((p) => {
      this.io.to(p.id).emit("player:spawned", { player: player.serialize() });
    });

    // Send new world players to the switching player
    socket.emit("player:worldChanged", {
      worldState: newWorldState,
      players: newWorldPlayers.map((p) => p.serialize()),
    });

    console.log(`[GameServer] ${player.username} switched to ${newWorldState}`);
  }

  /**
   * Handles animation state changes
   */
  handleAnimationChange(socket, data) {
    const player = this.players.get(socket.id);
    if (!player) return;

    player.animation = data.animation;
    player.needsBroadcast = true;
  }

  /**
   * Handles chat messages
   */
  handleChat(socket, data) {
    const player = this.players.get(socket.id);
    const roomId = this.socketToRoom.get(socket.id);
    if (!player || !roomId) return;

    const room = this.rooms.get(roomId);

    // Only send to players in same world state
    room.getPlayersInWorldState(player.worldState).forEach((p) => {
      this.io.to(p.id).emit("player:chat", {
        id: socket.id,
        username: player.username,
        message: data.message.substring(0, 200), // Limit message length
      });
    });
  }

  /**
   * Handles player disconnection
   */
  handleDisconnect(socket) {
    const player = this.players.get(socket.id);
    const roomId = this.socketToRoom.get(socket.id);

    if (player && roomId) {
      const room = this.rooms.get(roomId);
      if (room) {
        // Remove player (this also releases their character)
        const releasedCharacter = room.removePlayer(socket.id);

        // Notify other players in same world state that player left
        room.getPlayersInWorldState(player.worldState).forEach((p) => {
          this.io.to(p.id).emit("player:left", { id: socket.id });
        });

        // If a character was released, notify all players in room
        if (releasedCharacter) {
          this.io.to(roomId).emit("character:stateChanged", {
            characters: room.getCharacterStates(),
          });
        }

        console.log(
          `[GameServer] ${player.username} (UID: ${
            player.firebaseUid || "none"
          }) disconnected from ${roomId}${
            releasedCharacter
              ? `, released character: ${releasedCharacter}`
              : ""
          }`
        );
      }

      // Clean up UID mapping
      if (player.firebaseUid) {
        this.uidToSocket.delete(player.firebaseUid);
      }
    }

    this.players.delete(socket.id);
    this.socketToRoom.delete(socket.id);
  }

  /**
   * Gets a spawn position for new players
   */
  getSpawnPosition() {
    // Spawn in town center with slight randomization
    return {
      x: (Math.random() - 0.5) * 20,
      y: 0,
      z: (Math.random() - 0.5) * 20,
    };
  }

  /**
   * Main game loop - broadcasts player updates at fixed tick rate
   */
  startGameLoop() {
    setInterval(() => {
      this.rooms.forEach((room, roomId) => {
        // Group players by world state for efficient broadcasting
        const normalPlayers = room.getPlayersInWorldState("normal");
        const upsideDownPlayers = room.getPlayersInWorldState("upsideDown");

        // Broadcast updates within each world state
        this.broadcastUpdates(normalPlayers, roomId);
        this.broadcastUpdates(upsideDownPlayers, roomId);
      });
    }, 1000 / CONFIG.TICK_RATE);
  }

  /**
   * Broadcasts player updates to other players in same world state
   */
  broadcastUpdates(players, roomId) {
    const updates = [];

    players.forEach((player) => {
      if (player.needsBroadcast) {
        updates.push({
          id: player.id,
          position: player.position,
          rotation: player.rotation,
          animation: player.animation,
        });
        player.needsBroadcast = false;
      }
    });

    if (updates.length > 0) {
      // Send updates to all players in this group
      players.forEach((player) => {
        const relevantUpdates = updates.filter((u) => u.id !== player.id);
        if (relevantUpdates.length > 0) {
          this.io
            .to(player.id)
            .emit("players:update", { players: relevantUpdates });
        }
      });
    }
  }
}

module.exports = GameServer;
