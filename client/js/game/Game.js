/**
 * Game Class
 * Main game controller that ties all systems together
 * Manages game loop, initialization, and system coordination
 */

import * as THREE from "three";
import { GAME_CONFIG, ANIMATIONS, CHARACTERS } from "../utils/constants.js";
import { NetworkManager } from "../network/NetworkManager.js";
import { World } from "../world/World.js";
import { Player } from "./Player.js";
import { Camera } from "./Camera.js";
import { InputManager } from "./InputManager.js";
import { GraphicsManager, CinematicCamera } from "../graphics/index.js";

export class Game {
  constructor() {
    // Core Three.js components
    this.renderer = null;
    this.scene = null;

    // Game systems
    this.camera = null;
    this.inputManager = null;
    this.networkManager = null;
    this.world = null;

    // Local player
    this.localPlayer = null;

    // Remote players
    this.remotePlayers = new Map();

    // Game state
    this.isRunning = false;
    this.lastTime = 0;
    this.worldState = "normal";

    // Portal interaction cooldown
    this.portalCooldown = 0;

    // Portal transition state
    this.isTransitioning = false;
    this.transitionProgress = 0;
    this.transitionDuration = 2.0; // seconds for walk-through transition
    this.transitionTargetState = null;
    this.transitionWorldSwitched = false;

    // Bicycle state
    this.isRidingBicycle = false;
    this.bicycleObject = null;
    this.bicyclePosition = null;

    // Graphics manager for cinematic effects
    this.graphicsManager = null;

    // Use cinematic camera
    this.useCinematicCamera = true;

    // Debug mode
    this.debugMode = false;

    // Track if instructions have been shown
    this.instructionsShown = false;

    // Stats
    this.frameCount = 0;
    this.fps = 0;
    this.lastFpsUpdate = 0;
  }

  /**
   * Initializes the game
   */
  async init() {
    console.log("[Game] Initializing Stranger Things Game...");

    // Show loading screen
    this.showLoadingScreen("Initializing...");

    // Create renderer
    this.createRenderer();

    // Create scene
    this.scene = new THREE.Scene();

    // Create camera system (use cinematic camera for enhanced effects)
    if (this.useCinematicCamera) {
      this.camera = new CinematicCamera(this.renderer);
    } else {
      this.camera = new Camera(this.renderer);
    }

    // Create input manager
    this.inputManager = new InputManager(this.renderer.domElement);
    this.setupInputCallbacks();

    // Initialize graphics manager for cinematic rendering
    this.showLoadingScreen("Setting up graphics...");
    this.graphicsManager = new GraphicsManager(
      this.renderer,
      this.scene,
      this.camera,
    );
    await this.graphicsManager.init();

    // Initialize world
    this.showLoadingScreen("Loading world...");
    this.world = new World(this.scene);
    await this.world.init();

    // Initialize network
    this.showLoadingScreen("Connecting to server...");
    this.networkManager = new NetworkManager(this);

    try {
      const username = this.getUsername();
      const connectionData = await this.networkManager.connect(username);

      if (connectionData.singlePlayer) {
        console.log("[Game] Running in single-player mode");
      }
    } catch (error) {
      console.warn(
        "[Game] Network connection failed, continuing in single-player mode:",
        error,
      );
      // Continue anyway - single-player mode will be enabled
    }

    // Hide loading screen
    this.hideLoadingScreen();

    // Show instructions and wait for click (only once)
    if (!this.instructionsShown) {
      this.showInstructions();
      this.instructionsShown = true;
    } else {
      // Auto-lock pointer if instructions already shown
      this.renderer.domElement.click();
    }

    // Start game loop
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();

    console.log("[Game] Initialization complete");
  }

  /**
   * Initializes the game when network is already connected
   * Used when character selection happens before game init
   */
  async initWithNetwork() {
    console.log("[Game] Initializing with existing network connection...");

    // Show loading screen
    this.showLoadingScreen("Initializing...");

    // Create renderer if not already created
    if (!this.renderer) {
      this.createRenderer();
    }

    // Create scene
    this.scene = new THREE.Scene();

    // Create camera system (use cinematic camera for enhanced effects)
    if (this.useCinematicCamera) {
      this.camera = new CinematicCamera(this.renderer);
    } else {
      this.camera = new Camera(this.renderer);
    }

    // Create input manager
    this.inputManager = new InputManager(this.renderer.domElement);
    this.setupInputCallbacks();

    // Initialize graphics manager for cinematic rendering
    this.showLoadingScreen("Setting up graphics...");
    this.graphicsManager = new GraphicsManager(
      this.renderer,
      this.scene,
      this.camera,
    );
    await this.graphicsManager.init();

    // Initialize world
    this.showLoadingScreen("Loading world...");
    this.world = new World(this.scene);
    await this.world.init();

    // Network is already connected, just need to wait for player:joined event
    // The networkManager is already set up from main.js

    // Hide loading screen
    this.hideLoadingScreen();

    // Show instructions and wait for click (only once)
    if (!this.instructionsShown) {
      this.showInstructions();
      this.instructionsShown = true;
    } else {
      // Auto-lock pointer if instructions already shown
      this.renderer.domElement.click();
    }

    // Start game loop
    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();

    console.log("[Game] Initialization with network complete");
  }

  /**
   * Creates the WebGL renderer
   */
  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = false; // Disabled for performance
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    document
      .getElementById("game-container")
      .appendChild(this.renderer.domElement);

    // Handle window resize
    window.addEventListener("resize", () => this.handleResize());
  }

  /**
   * Sets up input callbacks
   */
  setupInputCallbacks() {
    // Mouse look callback
    this.inputManager.onMouseMove = (x, y) => {
      this.camera.handleMouseMove(x, y);
    };

    // Pointer lock callback
    this.inputManager.onPointerLockChange = (locked) => {
      this.camera.setMouseLocked(locked);

      // Initialize/resume audio on pointer lock (requires user interaction)
      if (locked && this.graphicsManager) {
        this.graphicsManager.initAudio();
      }
    };

    // Quality settings dropdown
    const qualitySelect = document.getElementById("quality-select");
    if (qualitySelect) {
      qualitySelect.addEventListener("change", (e) => {
        if (this.graphicsManager) {
          this.graphicsManager.setQuality(e.target.value);
          console.log(`[Game] Quality set to: ${e.target.value}`);
        }
      });
    }
  }

  /**
   * Initializes the local player with server data
   */
  initLocalPlayer(playerData) {
    console.log("[Game] Initializing local player:", playerData);

    this.localPlayer = new Player(this.scene, true);

    // Use character color if available
    let playerColor = 0x4488ff; // Default blue
    if (playerData.characterId && CHARACTERS[playerData.characterId]) {
      playerColor = CHARACTERS[playerData.characterId].color;
    }

    this.localPlayer.createMesh(playerColor);
    this.localPlayer.setPosition(playerData.position);
    this.localPlayer.setRotation(playerData.rotation);
    this.localPlayer.worldState = playerData.worldState;
    this.localPlayer.characterId = playerData.characterId;

    // Set camera to follow local player
    this.camera.setTarget(this.localPlayer);

    // Create bicycle near spawn
    this.createBicycle(5, 5);
  }

  /**
   * Creates a mesh for a remote player
   */
  createPlayerMesh(playerData) {
    const player = new Player(this.scene, false);

    // Use character color if available, otherwise fall back to random color
    let playerColor;
    if (playerData.characterId && CHARACTERS[playerData.characterId]) {
      playerColor = CHARACTERS[playerData.characterId].color;
    } else {
      // Fallback: random color for each player
      const colors = [
        0xff4444, 0x44ff44, 0xffff44, 0xff44ff, 0x44ffff, 0xffaa44,
      ];
      const colorIndex = Math.abs(playerData.id.charCodeAt(0)) % colors.length;
      playerColor = colors[colorIndex];
    }

    player.createMesh(playerColor);

    // Create name tag with character name if available
    let displayName = playerData.username;
    if (playerData.characterId && CHARACTERS[playerData.characterId]) {
      displayName = `${CHARACTERS[playerData.characterId].icon} ${
        playerData.username
      }`;
    }
    player.createNameTag(displayName);

    player.setPosition(playerData.position);
    player.setRotation(playerData.rotation);
    player.setAnimation(playerData.animation);
    player.characterId = playerData.characterId;

    this.remotePlayers.set(playerData.id, player);

    return player.mesh;
  }

  /**
   * Removes a remote player's mesh
   */
  removePlayerMesh(mesh) {
    // Find and remove the player associated with this mesh
    for (const [id, player] of this.remotePlayers) {
      if (player.mesh === mesh) {
        player.dispose();
        this.remotePlayers.delete(id);
        break;
      }
    }
  }

  /**
   * Main game loop
   */
  gameLoop() {
    if (!this.isRunning) return;

    requestAnimationFrame(() => this.gameLoop());

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Cap delta time to prevent huge jumps
    const cappedDelta = Math.min(deltaTime, 0.1);

    // Update game systems
    this.update(cappedDelta);

    // Render
    this.render();

    // Update FPS counter
    this.updateFPS(currentTime);
  }

  /**
   * Updates all game systems
   */
  update(deltaTime) {
    // Update local player movement
    this.updateLocalPlayer(deltaTime);

    // Update camera
    this.camera.update(deltaTime);

    // Update world (chunks, portals)
    if (this.localPlayer) {
      const pos = this.localPlayer.getPosition();
      this.world.update(deltaTime, pos);

      // Check for portal proximity
      this.checkPortalInteraction(pos);

      // Check for walking through open portal door
      this.checkPortalDoorWalkthrough(pos);

      // Check for door interaction
      this.checkDoorInteraction(pos);

      // Check for bicycle interaction
      this.checkBicycleInteraction(pos);

      // Update graphics manager with player position for particles and lighting
      if (this.graphicsManager) {
        this.graphicsManager.update(deltaTime, pos);
      }
    }

    // Update portal transition
    if (this.isTransitioning) {
      this.updatePortalTransition(deltaTime);
    }

    // Update remote player interpolation
    this.networkManager.updateInterpolation();

    // Update remote player animations
    this.remotePlayers.forEach((player) => {
      player.updateAnimation(deltaTime);
    });

    // Update cooldowns
    if (this.portalCooldown > 0) {
      this.portalCooldown -= deltaTime;
    }

    // Clear input manager pressed keys at end of frame
    this.inputManager.clearPressedKeys();
  }

  /**
   * Updates local player movement based on input
   */
  updateLocalPlayer(deltaTime) {
    if (!this.localPlayer) return;

    // Allow movement during portal transition (walk through like a door)
    // Only skip if player is explicitly locked
    if (this.localPlayer.isTransitioning) {
      return;
    }

    // Get movement input
    const movement = this.inputManager.getMovementInput();
    const isRunning = this.inputManager.isRunning();
    const isJumping = this.inputManager.isJumping();

    // Get current position
    const pos = this.localPlayer.getPosition();
    const groundLevel = 0;
    const isOnGround = pos.y <= groundLevel + 0.01;

    // Handle jumping
    if (isJumping && isOnGround && !this.localPlayer.isJumping) {
      this.localPlayer.verticalVelocity = GAME_CONFIG.JUMP_FORCE;
      this.localPlayer.isJumping = true;
    }

    // Apply gravity
    if (!isOnGround || this.localPlayer.verticalVelocity > 0) {
      this.localPlayer.verticalVelocity -= GAME_CONFIG.GRAVITY * deltaTime;
      pos.y += this.localPlayer.verticalVelocity * deltaTime;

      // Ground collision
      if (pos.y <= groundLevel) {
        pos.y = groundLevel;
        this.localPlayer.verticalVelocity = 0;
        this.localPlayer.isJumping = false;
      }
    }

    // Determine animation state
    let animation = ANIMATIONS.IDLE;
    if (this.localPlayer.isJumping) {
      animation = ANIMATIONS.JUMP;
    } else if (movement.x !== 0 || movement.z !== 0) {
      animation = isRunning ? ANIMATIONS.RUN : ANIMATIONS.WALK;
    }

    // Calculate movement speed
    let speed = isRunning
      ? GAME_CONFIG.PLAYER_RUN_SPEED
      : GAME_CONFIG.PLAYER_SPEED;

    // Use bicycle speed if riding
    if (this.isRidingBicycle) {
      speed = GAME_CONFIG.BICYCLE_SPEED;
    }

    // Get camera-relative movement direction
    const forward = this.camera.getForwardDirection();
    const right = this.camera.getRightDirection();

    // Calculate movement vector
    const moveX =
      (forward.x * movement.z + right.x * movement.x) * speed * deltaTime;
    const moveZ =
      (forward.z * movement.z + right.z * movement.x) * speed * deltaTime;

    // Store current Y position before horizontal movement
    const currentY = pos.y;
    const newPos = pos.clone();
    newPos.x += moveX;
    newPos.z += moveZ;

    // Check for wall collisions
    if (!this.checkWallCollision(newPos)) {
      // No collision, update position
      pos.x = newPos.x;
      pos.z = newPos.z;
    } else {
      // Try moving along one axis at a time (sliding)
      const testX = pos.clone();
      testX.x += moveX;
      if (!this.checkWallCollision(testX)) {
        pos.x = testX.x;
      }

      const testZ = pos.clone();
      testZ.x = pos.x;
      testZ.z += moveZ;
      if (!this.checkWallCollision(testZ)) {
        pos.z = testZ.z;
      }
    }

    // Keep player in world bounds
    pos.x = Math.max(-450, Math.min(450, pos.x));
    pos.z = Math.max(-450, Math.min(450, pos.z));

    this.localPlayer.setPosition(pos);

    // Update bicycle position if riding
    if (this.isRidingBicycle && this.bicycleObject) {
      this.bicycleObject.position.set(pos.x, 0.5, pos.z);
      this.bicycleObject.rotation.y = this.localPlayer.getRotation();
    }

    // Update rotation to face movement direction
    if (movement.x !== 0 || movement.z !== 0) {
      const targetRotation = Math.atan2(moveX, moveZ);
      this.localPlayer.setRotation(targetRotation);
    }

    // Update animation
    this.localPlayer.setAnimation(animation);
    this.localPlayer.updateAnimation(deltaTime);

    // Update cinematic camera movement state for sway/FOV effects
    if (this.camera.setMovementState) {
      if (this.localPlayer.isJumping) {
        this.camera.setMovementState("idle");
      } else if (isRunning && (movement.x !== 0 || movement.z !== 0)) {
        this.camera.setMovementState("run");
      } else if (movement.x !== 0 || movement.z !== 0) {
        this.camera.setMovementState("walk");
      } else {
        this.camera.setMovementState("idle");
      }
    }

    // Send to server
    this.networkManager.sendMovement(
      pos,
      this.localPlayer.getRotation(),
      animation,
    );
  }

  /**
   * Checks if a position collides with any walls (including portal building walls)
   */
  checkWallCollision(position) {
    const playerRadius = GAME_CONFIG.PLAYER_RADIUS;

    // Check chunk building walls
    if (this.world && this.world.chunkManager) {
      const chunks = this.world.chunkManager.chunks;

      for (const [key, chunk] of chunks) {
        for (const mesh of chunk.buildings) {
          if (mesh.userData.isWall) {
            const wallBox = new THREE.Box3().setFromObject(mesh);
            const playerSphere = new THREE.Sphere(
              new THREE.Vector3(position.x, 1, position.z),
              playerRadius,
            );

            if (wallBox.intersectsSphere(playerSphere)) {
              return true;
            }
          }
        }
      }
    }

    // Check portal building walls and doors
    if (this.world && this.world.portalBuildings) {
      for (const building of this.world.portalBuildings) {
        let hasCollision = false;

        building.traverse((child) => {
          // Skip if already found collision
          if (hasCollision) return;

          // Skip objects that aren't walls
          if (!child.userData.isWall) return;

          // Skip open doors - they don't block
          if (child.userData.isDoor && child.userData.isOpen) {
            return;
          }

          const wallBox = new THREE.Box3().setFromObject(child);
          const playerSphere = new THREE.Sphere(
            new THREE.Vector3(position.x, 1, position.z),
            playerRadius,
          );

          if (wallBox.intersectsSphere(playerSphere)) {
            hasCollision = true;
          }
        });

        if (hasCollision) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Checks if player walks through an OPEN portal door to switch worlds
   */
  checkPortalDoorWalkthrough(playerPosition) {
    if (this.portalCooldown > 0 || this.isTransitioning) return;
    if (!this.world || !this.world.portalDoors) return;

    for (const portalDoorData of this.world.portalDoors) {
      const door = portalDoorData.door;
      if (!door || !door.userData.isOpen) continue; // Only check open doors

      // Get building position and rotation
      const buildingPos = portalDoorData.buildingPos;
      const buildingRot = portalDoorData.buildingRotation;

      // Convert player position to local space of the building
      const localX = playerPosition.x - buildingPos.x;
      const localZ = playerPosition.z - buildingPos.z;

      // Rotate to local space
      const cos = Math.cos(-buildingRot);
      const sin = Math.sin(-buildingRot);
      const rotatedX = localX * cos - localZ * sin;
      const rotatedZ = localX * sin + localZ * cos;

      // Door is at the back of the building (z = -depth/2 = -6)
      const doorZ = -6;
      const doorWidth = 2.5;

      // Check if player is in the doorway zone (X within door width, Z near door)
      const inDoorX = Math.abs(rotatedX) < doorWidth / 2 + 0.5;
      const inDoorZ = rotatedZ > doorZ - 1.5 && rotatedZ < doorZ + 1.5;

      if (inDoorX && inDoorZ) {
        // Track player's Z position to detect crossing
        if (!this.lastPortalDoorZ) {
          this.lastPortalDoorZ = {};
        }

        const doorId = door.uuid;
        const lastZ = this.lastPortalDoorZ[doorId];

        if (lastZ !== undefined) {
          // Detect crossing the door threshold
          if (
            (lastZ < doorZ && rotatedZ >= doorZ) ||
            (lastZ >= doorZ && rotatedZ < doorZ)
          ) {
            this.triggerWorldSwitch();
            this.lastPortalDoorZ[doorId] = rotatedZ;
            return;
          }
        }

        this.lastPortalDoorZ[doorId] = rotatedZ;
        return;
      }
    }
  }

  /**
   * Checks for portal area - shows info when inside portal building
   */
  checkPortalInteraction(playerPosition) {
    // Show portal prompt when near portal building entrance
    const nearbyPortal = this.world.isPlayerNearPortal(playerPosition);
    const prompt = document.getElementById("portal-prompt");
    if (prompt) {
      if (nearbyPortal) {
        prompt.textContent = "Enter the crack and find the door inside...";
        prompt.style.display = "block";
      } else {
        prompt.style.display = "none";
      }
    }
  }

  /**
   * Checks for nearby bicycle and handles interaction
   */
  checkBicycleInteraction(playerPosition) {
    if (!this.bicyclePosition) return;

    const dx = playerPosition.x - this.bicyclePosition.x;
    const dz = playerPosition.z - this.bicyclePosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    const interactionDistance = 2;
    const bicyclePrompt = document.getElementById("bicycle-prompt");

    if (distance < interactionDistance && !this.isRidingBicycle) {
      // Show bicycle prompt
      if (bicyclePrompt) {
        bicyclePrompt.textContent = "Press F to Ride Bicycle";
        bicyclePrompt.style.display = "block";
      }

      // Handle mounting bicycle
      if (this.inputManager.isRidingBicycle()) {
        this.mountBicycle();
      }
    } else if (!this.isRidingBicycle) {
      // Hide prompt when not near bicycle and not riding
      if (bicyclePrompt) {
        bicyclePrompt.style.display = "none";
      }
    }

    // Handle dismounting (can dismount anywhere while riding)
    if (this.isRidingBicycle) {
      if (bicyclePrompt) {
        bicyclePrompt.textContent = "Press F to Dismount Bicycle";
        bicyclePrompt.style.display = "block";
      }

      if (this.inputManager.isRidingBicycle()) {
        this.dismountBicycle();
      }
    }
  }

  /**
   * Mounts the bicycle
   */
  mountBicycle() {
    this.isRidingBicycle = true;
    const bicyclePrompt = document.getElementById("bicycle-prompt");
    if (bicyclePrompt) {
      bicyclePrompt.textContent = "Press F to Dismount Bicycle";
      bicyclePrompt.style.display = "block";
    }

    // Hide bicycle from its parked position, attach to player
    if (this.bicycleObject) {
      this.bicycleObject.visible = true;
    }
  }

  /**
   * Dismounts the bicycle
   */
  dismountBicycle() {
    this.isRidingBicycle = false;
    const bicyclePrompt = document.getElementById("bicycle-prompt");
    if (bicyclePrompt) {
      bicyclePrompt.style.display = "none";
    }

    // Place bicycle at current position
    if (this.bicycleObject && this.localPlayer) {
      const pos = this.localPlayer.getPosition();
      this.bicyclePosition = new THREE.Vector3(pos.x, 0.5, pos.z);
      this.bicycleObject.position.copy(this.bicyclePosition);
    }
  }

  /**
   * Creates a bicycle object in the world
   */
  createBicycle(x, z) {
    const bicycle = new THREE.Group();

    // Frame color (red bicycle)
    const frameMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const tireMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const seatMat = new THREE.MeshBasicMaterial({ color: 0x3a3a3a });

    // Back wheel
    const backWheelGeo = new THREE.TorusGeometry(0.35, 0.08, 8, 16);
    backWheelGeo.rotateY(Math.PI / 2);
    const backWheel = new THREE.Mesh(backWheelGeo, tireMat);
    backWheel.position.set(0, 0.35, -0.6);
    bicycle.add(backWheel);

    // Front wheel
    const frontWheel = new THREE.Mesh(backWheelGeo, tireMat);
    frontWheel.position.set(0, 0.35, 0.6);
    bicycle.add(frontWheel);

    // Frame - main tube (diagonal)
    const mainTubeGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
    mainTubeGeo.rotateZ(Math.PI / 4);
    const mainTube = new THREE.Mesh(mainTubeGeo, frameMat);
    mainTube.position.set(0, 0.6, -0.2);
    bicycle.add(mainTube);

    // Seat tube (vertical)
    const seatTubeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8);
    const seatTube = new THREE.Mesh(seatTubeGeo, frameMat);
    seatTube.position.set(0, 0.5, -0.6);
    bicycle.add(seatTube);

    // Down tube (from front to bottom)
    const downTubeGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
    downTubeGeo.rotateZ(-Math.PI / 6);
    const downTube = new THREE.Mesh(downTubeGeo, frameMat);
    downTube.position.set(0, 0.4, 0.1);
    bicycle.add(downTube);

    // Handlebars
    const handlebarGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8);
    handlebarGeo.rotateZ(Math.PI / 2);
    const handlebar = new THREE.Mesh(handlebarGeo, frameMat);
    handlebar.position.set(0, 0.9, 0.6);
    bicycle.add(handlebar);

    // Handlebar stem
    const stemGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8);
    const stem = new THREE.Mesh(stemGeo, frameMat);
    stem.position.set(0, 0.7, 0.6);
    bicycle.add(stem);

    // Seat
    const seatGeo = new THREE.BoxGeometry(0.15, 0.08, 0.3);
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(0, 0.85, -0.6);
    bicycle.add(seat);

    // Pedals (simplified)
    const pedalGeo = new THREE.BoxGeometry(0.12, 0.05, 0.08);
    const leftPedal = new THREE.Mesh(pedalGeo, frameMat);
    leftPedal.position.set(-0.15, 0.25, -0.2);
    bicycle.add(leftPedal);

    const rightPedal = new THREE.Mesh(pedalGeo, frameMat);
    rightPedal.position.set(0.15, 0.25, -0.2);
    bicycle.add(rightPedal);

    // Position bicycle in world
    bicycle.position.set(x, 0.5, z);
    this.scene.add(bicycle);

    this.bicycleObject = bicycle;
    this.bicyclePosition = new THREE.Vector3(x, 0.5, z);
  }

  /**
   * Checks for door interaction (including portal doors inside the crack buildings)
   */
  checkDoorInteraction(playerPosition) {
    if (!this.world) return;

    const interactionDistance = 3;
    let nearestDoor = null;
    let minDistance = interactionDistance;
    let isPortalDoor = false;

    // First check for portal doors in the world
    const portalDoorData = this.world.getNearestPortalDoor(
      playerPosition,
      interactionDistance,
    );
    if (portalDoorData) {
      const door = portalDoorData.door;
      const doorWorldPos = new THREE.Vector3();
      door.getWorldPosition(doorWorldPos);

      const dx = playerPosition.x - doorWorldPos.x;
      const dz = playerPosition.z - doorWorldPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < minDistance) {
        minDistance = distance;
        nearestDoor = door;
        isPortalDoor = true;
      }
    }

    // Then check for regular doors in chunks
    if (this.world.chunkManager) {
      const chunks = this.world.chunkManager.chunks;
      for (const [key, chunk] of chunks) {
        for (const mesh of chunk.buildings) {
          if (mesh.userData.isDoor && !mesh.userData.isPortalDoor) {
            const doorPos = mesh.position;
            const dx = playerPosition.x - doorPos.x;
            const dz = playerPosition.z - doorPos.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance < minDistance) {
              minDistance = distance;
              nearestDoor = mesh;
              isPortalDoor = false;
            }
          }
        }
      }
    }

    // Show door prompt
    const doorPrompt = document.getElementById("door-prompt");
    if (doorPrompt) {
      if (nearestDoor) {
        if (isPortalDoor) {
          const doorState = nearestDoor.userData.isOpen ? "Close" : "Open";
          doorPrompt.textContent = `Press G to ${doorState} Portal Door`;
          doorPrompt.style.display = "block";
        } else {
          const doorState = nearestDoor.userData.isOpen ? "Close" : "Open";
          doorPrompt.textContent = `Press G to ${doorState} Door`;
          doorPrompt.style.display = "block";
        }
      } else {
        doorPrompt.style.display = "none";
      }
    }

    // Handle door opening
    if (nearestDoor && this.inputManager.isDoorOpening()) {
      if (isPortalDoor) {
        this.togglePortalDoor(nearestDoor);
      } else {
        this.toggleDoor(nearestDoor);
      }
    }
  }

  /**
   * Toggles a portal door - opening it allows passage, walking through switches worlds
   */
  togglePortalDoor(door) {
    if (!door.userData.isDoor) return;
    if (this.isTransitioning) return; // Don't trigger if already transitioning

    const isOpen = door.userData.isOpen;

    if (!isOpen) {
      // Opening the portal door
      door.userData.isOpen = true;
      door.userData.isWall = false; // Remove wall collision when open

      // Animate door opening
      const pivot = door.userData.doorPivot;
      if (pivot) {
        const angle = Math.PI / 2;
        const dx = door.userData.closedPosition.x - pivot.x;
        const dz = door.userData.closedPosition.z - pivot.z;

        door.position.x = pivot.x + dx * Math.cos(angle) - dz * Math.sin(angle);
        door.position.z = pivot.z + dx * Math.sin(angle) + dz * Math.cos(angle);
        door.rotation.y = angle;
      }

      // Trigger world switch after opening
      setTimeout(() => {
        this.triggerWorldSwitch();
      }, 300);
    }
    // If door is already open, pressing G does nothing - just walk through!
    // The door stays open for easy return trips
  }

  /**
   * Toggles door open/closed state
   */
  toggleDoor(door) {
    if (!door.userData.isDoor) return;

    const isOpen = door.userData.isOpen;
    door.userData.isOpen = !isOpen;

    if (!isOpen) {
      // Opening door - rotate 90 degrees around pivot
      const pivot = door.userData.doorPivot;
      const angle = Math.PI / 2; // 90 degrees

      // Calculate new position after rotation
      const dx = door.userData.closedPosition.x - pivot.x;
      const dz = door.userData.closedPosition.z - pivot.z;

      door.position.x = pivot.x + dx * Math.cos(angle) - dz * Math.sin(angle);
      door.position.z = pivot.z + dx * Math.sin(angle) + dz * Math.cos(angle);
      door.rotation.y = angle;
    } else {
      // Closing door - restore original position
      door.position.copy(door.userData.closedPosition);
      door.rotation.copy(door.userData.closedRotation);
    }
  }

  /**
   * Triggers a world state switch when walking through the crack
   * Player can keep moving - like walking through an open door
   */
  triggerWorldSwitch() {
    if (this.isTransitioning) return;

    const newState = this.worldState === "normal" ? "upsideDown" : "normal";

    console.log(`[Game] Walking through crack to ${newState}...`);

    // Set cooldown to prevent spam
    this.portalCooldown = 2;

    // Start transition - but don't lock movement!
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.transitionTargetState = newState;
    this.transitionDuration = 1.5; // Quick transition as you walk through

    // Player keeps walking - no movement lock
    // this.localPlayer.isTransitioning = false; // Allow movement

    // Trigger camera shake as you pass through the membrane
    if (this.camera.shake) {
      this.camera.shake(0.2, 0.5);
    }
  }

  /**
   * Updates the portal transition animation (walk-through effect)
   * Player keeps walking while world changes around them
   */
  updatePortalTransition(deltaTime) {
    if (!this.isTransitioning || !this.localPlayer) return;

    this.transitionProgress += deltaTime / this.transitionDuration;

    // Easing function for smooth transition
    const easeInOutCubic = (t) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const easedProgress = easeInOutCubic(Math.min(this.transitionProgress, 1));

    // Add camera shake during transition
    if (this.transitionProgress < 1 && Math.random() < 0.25) {
      if (this.camera.shake) {
        this.camera.shake(0.05, 0.1);
      }
    }

    // Gradually fade world transition
    const fadePoint = 0.5; // Transition world at halfway point

    if (!this.transitionWorldSwitched && this.transitionProgress >= fadePoint) {
      // Switch the world visuals at the midpoint
      this.transitionWorldSwitched = true;

      // Notify server
      this.networkManager.sendWorldChange(this.transitionTargetState);

      // Switch world visuals
      this.world.switchWorldState(this.transitionTargetState, () => {
        this.worldState = this.transitionTargetState;

        // Update graphics manager for new world state
        if (this.graphicsManager) {
          this.graphicsManager.setWorldState(this.transitionTargetState);
        }

        // Update local player appearance for new world state
        if (this.localPlayer) {
          this.localPlayer.setWorldState(this.transitionTargetState);
        }

        // Update remote players appearance
        this.remotePlayers.forEach((player) => {
          if (player.setWorldState) {
            player.setWorldState(this.transitionTargetState);
          }
        });

        // Update UI
        this.updateWorldStateUI();
      });
    }

    // Complete transition
    if (this.transitionProgress >= 1) {
      this.isTransitioning = false;
      this.transitionProgress = 0;
      this.transitionWorldSwitched = false;

      // Unlock player movement
      if (this.localPlayer) {
        this.localPlayer.isTransitioning = false;
      }

      console.log(
        `[Game] Transition to ${this.transitionTargetState} complete`,
      );
    }
  }

  /**
   * Updates UI to reflect current world state
   */
  updateWorldStateUI() {
    const indicator = document.getElementById("world-indicator");
    if (indicator) {
      indicator.textContent =
        this.worldState === "normal" ? "Normal World" : "The Upside Down";
      indicator.className =
        this.worldState === "normal" ? "normal" : "upside-down";
    }

    // Toggle body class for CSS styling of UI elements
    if (this.worldState === "upsideDown") {
      document.body.classList.add("upside-down");
    } else {
      document.body.classList.remove("upside-down");
    }
  }

  /**
   * Renders the scene
   */
  render() {
    // Use graphics manager for cinematic post-processing rendering
    if (this.graphicsManager && this.graphicsManager.isInitialized) {
      this.graphicsManager.render();
    } else {
      this.renderer.render(this.scene, this.camera.getCamera());
    }
  }

  /**
   * Handles window resize
   */
  handleResize() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.handleResize();

    // Update graphics manager on resize
    if (this.graphicsManager) {
      this.graphicsManager.handleResize(window.innerWidth, window.innerHeight);
    }
  }

  /**
   * Gets username from user
   */
  getUsername() {
    // Check URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const urlName = urlParams.get("name");
    if (urlName) return urlName.substring(0, 20);

    // Otherwise use default with random number
    return "Player" + Math.floor(Math.random() * 1000);
  }

  /**
   * Shows loading screen with message
   */
  showLoadingScreen(message) {
    const loading = document.getElementById("loading");
    const loadingText = document.getElementById("loading-text");
    if (loading) loading.style.display = "flex";
    if (loadingText) loadingText.textContent = message;
  }

  /**
   * Hides loading screen
   */
  hideLoadingScreen() {
    const loading = document.getElementById("loading");
    if (loading) loading.style.display = "none";
  }

  /**
   * Shows error message
   */
  showError(message) {
    const loading = document.getElementById("loading");
    const loadingText = document.getElementById("loading-text");
    if (loading) loading.style.display = "flex";
    if (loadingText) {
      loadingText.textContent = message;
      loadingText.style.color = "#ff4444";
    }
  }

  /**
   * Updates FPS counter
   */
  updateFPS(currentTime) {
    this.frameCount++;

    if (currentTime - this.lastFpsUpdate >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = currentTime;

      // Update FPS display if debug mode
      const fpsDisplay = document.getElementById("fps");
      if (fpsDisplay) {
        fpsDisplay.textContent = `FPS: ${this.fps}`;
      }
    }
  }

  /**
   * Shows instructions overlay and waits for click to start
   */
  showInstructions() {
    const instructions = document.getElementById("instructions");
    if (instructions) {
      instructions.style.display = "flex";

      // Add click handler to hide instructions and request pointer lock
      const handleClick = () => {
        instructions.style.display = "none";
        this.renderer.domElement.click(); // Trigger pointer lock
        instructions.removeEventListener("click", handleClick);
      };

      instructions.addEventListener("click", handleClick);
    }
  }

  /**
   * Cleans up game resources
   */
  dispose() {
    this.isRunning = false;

    if (this.inputManager) this.inputManager.dispose();
    if (this.networkManager) this.networkManager.disconnect();
    if (this.localPlayer) this.localPlayer.dispose();

    this.remotePlayers.forEach((player) => player.dispose());
    this.remotePlayers.clear();

    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
