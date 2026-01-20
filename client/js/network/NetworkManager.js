/**
 * NetworkManager Class
 * Handles all client-server communication via Socket.io
 * Manages player synchronization, world state changes, and interpolation
 *
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  ARCHITECTURE NOTE: WebSocket vs Firebase Responsibilities                    ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  WebSocket (Socket.io) handles:                                               ║
 * ║  - Real-time player position updates (~20 updates/second)                     ║
 * ║  - Player rotation and animation state                                        ║
 * ║  - Low-latency game loop synchronization                                      ║
 * ║  - Player join/leave notifications                                            ║
 * ║                                                                                ║
 * ║  Firebase handles (via FirebaseManager):                                      ║
 * ║  - Player authentication (UID-based identity)                                 ║
 * ║  - Persistent player profiles                                                 ║
 * ║  - Room/lobby metadata                                                        ║
 * ║  - Global world state (low-frequency changes)                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { GAME_CONFIG, CHARACTERS } from "../utils/constants.js";

export class NetworkManager {
  constructor(game) {
    this.game = game;
    this.socket = null;
    this.playerId = null;
    this.firebaseUid = null; // Firebase UID for persistent identity
    this.connected = false;
    this.selectedCharacterId = null; // Currently selected character

    // Remote players data with interpolation buffers
    this.remotePlayers = new Map(); // playerId -> { data, mesh, interpolation }

    // Movement update throttling
    this.lastSentPosition = { x: 0, y: 0, z: 0 };
    this.lastSentRotation = 0;
    this.lastSendTime = 0;
    this.sendInterval = 1000 / GAME_CONFIG.NETWORK_TICK_RATE;

    // Callbacks for character selection
    this.onCharacterSelectScreen = null;
    this.onCharacterSelected = null;
    this.onCharacterSelectFailed = null;
    this.onCharacterStateChanged = null;
  }

  /**
   * Sets the Firebase UID for persistent identity
   * Called after Firebase authentication completes
   * @param {string} uid - Firebase UID
   */
  setFirebaseUid(uid) {
    this.firebaseUid = uid;
    console.log("[Network] Firebase UID set:", uid);
  }

  /**
   * Connects to the game server
   * @param {string} username - Player display name
   * @param {string} roomId - Room to join (defaults to 'hawkins-1')
   */
  connect(username = "Player", roomId = "hawkins-1") {
    return new Promise((resolve, reject) => {
      // Connect to server (same origin in production)
      this.socket = io();

      this.socket.on("connect", () => {
        console.log("[Network] Connected to server");
        this.connected = true;

        // Request to join game with Firebase UID for identity
        this.socket.emit("player:join", {
          username,
          uid: this.firebaseUid, // Send Firebase UID for persistent identity
          roomId: roomId,
        });
      });

      // Handle character selection screen (new flow)
      this.socket.on("player:selectCharacterScreen", (data) => {
        console.log("[Network] Character selection screen:", data);
        this.playerId = data.id;
        if (this.onCharacterSelectScreen) {
          this.onCharacterSelectScreen(data);
        }
        resolve(data);
      });

      // Handle successful character selection
      this.socket.on("character:selected", (data) => {
        console.log("[Network] Character selected:", data.characterId);
        this.selectedCharacterId = data.characterId;
        if (this.onCharacterSelected) {
          this.onCharacterSelected(data);
        }
      });

      // Handle failed character selection
      this.socket.on("character:selectFailed", (data) => {
        console.log("[Network] Character selection failed:", data.error);
        if (this.onCharacterSelectFailed) {
          this.onCharacterSelectFailed(data);
        }
      });

      // Handle character state changes (when someone selects/leaves)
      this.socket.on("character:stateChanged", (data) => {
        console.log("[Network] Character state changed");
        if (this.onCharacterStateChanged) {
          this.onCharacterStateChanged(data);
        }
      });

      // Handle successful join (after character selection and ready)
      this.socket.on("player:joined", (data) => {
        console.log("[Network] Joined game:", data);
        this.playerId = data.id;

        // Initialize local player with server position
        this.game.initLocalPlayer(data.player);

        // Add existing players
        data.players.forEach((playerData) => {
          this.addRemotePlayer(playerData);
        });
      });

      // Handle new player spawning
      this.socket.on("player:spawned", (data) => {
        console.log("[Network] Player spawned:", data.player.username);
        this.addRemotePlayer(data.player);
      });

      // Handle player leaving
      this.socket.on("player:left", (data) => {
        console.log("[Network] Player left:", data.id);
        this.removeRemotePlayer(data.id);
      });

      // Handle player updates (position, rotation, animation)
      this.socket.on("players:update", (data) => {
        this.handlePlayersUpdate(data.players);
      });

      // Handle world state change confirmation
      this.socket.on("player:worldChanged", (data) => {
        console.log("[Network] World changed to:", data.worldState);

        // Clear current remote players
        this.remotePlayers.forEach((_, id) => this.removeRemotePlayer(id));

        // Add players from new world state
        data.players.forEach((playerData) => {
          this.addRemotePlayer(playerData);
        });
      });

      // Handle errors
      this.socket.on("error", (data) => {
        console.error("[Network] Error:", data.message);
        reject(new Error(data.message));
      });

      this.socket.on("disconnect", () => {
        console.log("[Network] Disconnected from server");
        this.connected = false;
      });

      // Timeout for connection
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error("Connection timeout"));
        }
      }, 5000);
    });
  }

  /**
   * Sends character selection to server
   */
  selectCharacter(characterId) {
    if (!this.connected) return;
    console.log("[Network] Selecting character:", characterId);
    this.socket.emit("player:selectCharacter", { characterId });
  }

  /**
   * Sends ready signal to start the game
   */
  sendReady() {
    if (!this.connected) return;
    console.log("[Network] Sending ready signal");
    this.socket.emit("player:ready", {});
  }

  /**
   * Adds a remote player to the scene
   */
  addRemotePlayer(playerData) {
    if (playerData.id === this.playerId) return;
    if (this.remotePlayers.has(playerData.id)) return;

    // Create player mesh through game
    const mesh = this.game.createPlayerMesh(playerData);

    // Store player with interpolation data
    this.remotePlayers.set(playerData.id, {
      data: playerData,
      mesh: mesh,
      interpolation: {
        startPos: { ...playerData.position },
        endPos: { ...playerData.position },
        startRot: playerData.rotation,
        endRot: playerData.rotation,
        startTime: Date.now(),
        duration: this.sendInterval,
      },
    });

    console.log(`[Network] Added remote player: ${playerData.username}`);
  }

  /**
   * Removes a remote player from the scene
   */
  removeRemotePlayer(playerId) {
    const player = this.remotePlayers.get(playerId);
    if (player) {
      this.game.removePlayerMesh(player.mesh);
      this.remotePlayers.delete(playerId);
    }
  }

  /**
   * Handles batch player updates from server
   */
  handlePlayersUpdate(updates) {
    updates.forEach((update) => {
      const player = this.remotePlayers.get(update.id);
      if (!player) return;

      // Update interpolation targets
      player.interpolation.startPos = { ...player.interpolation.endPos };
      player.interpolation.endPos = update.position;
      player.interpolation.startRot = player.interpolation.endRot;
      player.interpolation.endRot = update.rotation;
      player.interpolation.startTime = Date.now();

      // Update animation state
      if (update.animation) {
        player.data.animation = update.animation;
        // TODO: Trigger animation change on mesh
      }
    });
  }

  /**
   * Sends local player movement to server (throttled)
   */
  sendMovement(position, rotation, animation) {
    if (!this.connected) return;

    const now = Date.now();
    if (now - this.lastSendTime < this.sendInterval) return;

    // Check if movement is significant
    const posDelta =
      Math.abs(position.x - this.lastSentPosition.x) +
      Math.abs(position.y - this.lastSentPosition.y) +
      Math.abs(position.z - this.lastSentPosition.z);
    const rotDelta = Math.abs(rotation - this.lastSentRotation);

    if (posDelta < 0.01 && rotDelta < 0.01) return;

    this.socket.emit("player:move", {
      position: { x: position.x, y: position.y, z: position.z },
      rotation: rotation,
      animation: animation,
    });

    this.lastSentPosition = { ...position };
    this.lastSentRotation = rotation;
    this.lastSendTime = now;
  }

  /**
   * Sends world state change to server
   */
  sendWorldChange(worldState) {
    if (!this.connected) return;

    this.socket.emit("player:worldChange", { worldState });
  }

  /**
   * Updates remote player interpolation
   * Called every frame for smooth movement
   */
  updateInterpolation() {
    const now = Date.now();

    this.remotePlayers.forEach((player) => {
      const interp = player.interpolation;
      let t = (now - interp.startTime) / interp.duration;
      t = Math.min(1, Math.max(0, t));

      // Smooth interpolation using ease-out
      const smoothT = 1 - Math.pow(1 - t, 2);

      // Interpolate position
      player.mesh.position.x =
        interp.startPos.x + (interp.endPos.x - interp.startPos.x) * smoothT;
      player.mesh.position.y =
        interp.startPos.y + (interp.endPos.y - interp.startPos.y) * smoothT;
      player.mesh.position.z =
        interp.startPos.z + (interp.endPos.z - interp.startPos.z) * smoothT;

      // Interpolate rotation (handle wrapping)
      let rotDiff = interp.endRot - interp.startRot;
      if (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
      if (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
      player.mesh.rotation.y = interp.startRot + rotDiff * smoothT;
    });
  }

  /**
   * Disconnects from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
    this.remotePlayers.clear();
  }
}
