/**
 * World Class
 * Manages the game world including terrain, lighting, fog, and the Upside Down mechanic
 * Handles transitions between normal and Upside Down world states
 */

import * as THREE from "three";
import { GAME_CONFIG, WORLD_STATES } from "../utils/constants.js";
import { ChunkManager } from "./ChunkManager.js";
import { Environment } from "./Environment.js";
import { Portal } from "./Portal.js";
import { UpsideDownEffects } from "./UpsideDownEffects.js";

export class World {
  constructor(scene) {
    this.scene = scene;
    this.currentState = "normal";

    // World components
    this.chunkManager = null;
    this.environment = null;
    this.upsideDownEffects = null;
    this.portals = [];

    // Materials that change between world states
    this.worldMaterials = {
      ground: null,
      trees: null,
      buildings: null,
    };

    // Audio (placeholder for atmospheric sounds)
    this.ambientSound = null;

    // Transition effect
    this.isTransitioning = false;
    this.transitionProgress = 0;
  }

  /**
   * Initializes the world with all components
   */
  async init() {
    console.log("[World] Initializing...");

    // Create materials for both world states
    this.createMaterials();

    // Initialize environment (lighting, fog, skybox)
    this.environment = new Environment(this.scene);
    this.environment.init(WORLD_STATES[this.currentState]);

    // Initialize chunk manager for terrain and objects
    this.chunkManager = new ChunkManager(this.scene, this.worldMaterials);
    await this.chunkManager.init();

    // Initialize Upside Down effects (starts inactive)
    this.upsideDownEffects = new UpsideDownEffects(this.scene);

    // Create portal objects for world switching
    this.createPortals();

    console.log("[World] Initialization complete");
  }

  /**
   * Creates materials that will swap between world states
   */
  createMaterials() {
    const state = WORLD_STATES[this.currentState];

    // Ground material - use MeshBasicMaterial for visibility (grass/sand)
    this.worldMaterials.ground = new THREE.MeshBasicMaterial({
      color: state.groundColor,
    });

    // Tree material
    this.worldMaterials.trees = new THREE.MeshLambertMaterial({
      color: state.treeColor,
      flatShading: true,
      emissive: state.treeColor,
      emissiveIntensity: 0.2,
    });

    // Building material
    this.worldMaterials.buildings = new THREE.MeshLambertMaterial({
      color: state.buildingColor,
      flatShading: true,
      emissive: state.buildingColor,
      emissiveIntensity: 0.25,
    });

    // Tree trunk material (shared)
    this.worldMaterials.trunk = new THREE.MeshLambertMaterial({
      color: 0x3d2817,
      flatShading: true,
      emissive: 0x3d2817,
      emissiveIntensity: 0.2,
    });
  }

  /**
   * Creates portal objects that trigger world state changes
   * Portals are buildings with a crack entrance and a door inside
   * Opening the door takes you to the Upside Down
   */
  createPortals() {
    // Create portal buildings with cracks on their walls
    const portalLocations = [
      { x: 25, z: 25, rotation: 0, name: "Hawkins Lab Crack" },
      { x: -35, z: 45, rotation: Math.PI / 2, name: "Byers House Crack" },
      { x: 5, z: -55, rotation: Math.PI, name: "School Basement Crack" },
    ];

    // Store portal doors for interaction
    this.portalDoors = [];

    portalLocations.forEach((loc) => {
      // Create portal building structure with interior door
      const portalDoor = this.createPortalBuilding(loc.x, loc.z, loc.rotation);
      if (portalDoor) {
        this.portalDoors.push({
          door: portalDoor,
          location: loc,
          buildingPos: new THREE.Vector3(loc.x, 0, loc.z),
          buildingRotation: loc.rotation,
        });
      }

      // Create the crack portal on the front wall (just visuals now)
      const portal = new Portal(
        this.scene,
        loc.x,
        loc.z,
        loc.name,
        loc.rotation
      );
      portal.init();
      this.portals.push(portal);
    });
  }

  /**
   * Creates a portal house structure - walk through crack entrance, find door inside
   * Opening the door inside takes you to the Upside Down
   */
  createPortalBuilding(x, z, rotation) {
    const width = 12;
    const depth = 12;
    const height = 5;
    const wallThickness = 0.4;

    // Dark, abandoned-looking material
    const wallMat = new THREE.MeshBasicMaterial({ color: 0x3a3a3a });
    const floorMat = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });
    const innerWallMat = new THREE.MeshBasicMaterial({ color: 0x2d2d2d });

    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotation;

    // Floor
    const floorGeo = new THREE.BoxGeometry(width, 0.1, depth);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = 0.05;
    group.add(floor);

    // Door dimensions for the back wall opening
    const doorWidth = 2.5;
    const doorHeight = 3.5;

    // Back wall with doorway opening (left side of door)
    const backSideWidth = (width - doorWidth) / 2;
    const backSideGeo = new THREE.BoxGeometry(
      backSideWidth,
      height,
      wallThickness
    );

    const backLeft = new THREE.Mesh(backSideGeo, wallMat);
    backLeft.position.set(
      -width / 2 + backSideWidth / 2,
      height / 2,
      -depth / 2
    );
    backLeft.userData.isWall = true;
    backLeft.userData.isBuilding = true;
    group.add(backLeft);

    // Back wall (right side of door)
    const backRight = new THREE.Mesh(backSideGeo, wallMat);
    backRight.position.set(
      width / 2 - backSideWidth / 2,
      height / 2,
      -depth / 2
    );
    backRight.userData.isWall = true;
    backRight.userData.isBuilding = true;
    group.add(backRight);

    // Back wall above door
    const backTopGeo = new THREE.BoxGeometry(
      doorWidth,
      height - doorHeight,
      wallThickness
    );
    const backTop = new THREE.Mesh(backTopGeo, wallMat);
    backTop.position.set(0, height - (height - doorHeight) / 2, -depth / 2);
    backTop.userData.isWall = true;
    backTop.userData.isBuilding = true;
    group.add(backTop);

    // Left wall (SOLID)
    const sideWallGeo = new THREE.BoxGeometry(wallThickness, height, depth);
    const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
    leftWall.position.set(-width / 2, height / 2, 0);
    leftWall.userData.isWall = true;
    leftWall.userData.isBuilding = true;
    group.add(leftWall);

    // Right wall (SOLID)
    const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
    rightWall.position.set(width / 2, height / 2, 0);
    rightWall.userData.isWall = true;
    rightWall.userData.isBuilding = true;
    group.add(rightWall);

    // Front wall with crack opening (entrance)
    const crackWidth = 3.5;
    const frontSideWidth = (width - crackWidth) / 2;
    const frontSideGeo = new THREE.BoxGeometry(
      frontSideWidth,
      height,
      wallThickness
    );

    const frontLeft = new THREE.Mesh(frontSideGeo, wallMat);
    frontLeft.position.set(
      -width / 2 + frontSideWidth / 2,
      height / 2,
      depth / 2
    );
    frontLeft.userData.isWall = true;
    frontLeft.userData.isBuilding = true;
    group.add(frontLeft);

    const frontRight = new THREE.Mesh(frontSideGeo, wallMat);
    frontRight.position.set(
      width / 2 - frontSideWidth / 2,
      height / 2,
      depth / 2
    );
    frontRight.userData.isWall = true;
    frontRight.userData.isBuilding = true;
    group.add(frontRight);

    // Top of crack opening
    const crackHeight = 4.5;
    const topGeo = new THREE.BoxGeometry(
      crackWidth,
      height - crackHeight,
      wallThickness
    );
    const topWall = new THREE.Mesh(topGeo, wallMat);
    topWall.position.set(0, height - (height - crackHeight) / 2, depth / 2);
    topWall.userData.isWall = true;
    topWall.userData.isBuilding = true;
    group.add(topWall);

    // Roof
    const roofGeo = new THREE.BoxGeometry(width + 0.5, 0.2, depth + 0.5);
    const roofMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = height;
    group.add(roof);

    // === INTERIOR DOOR at the back (this is the PORTAL DOOR) ===
    // doorWidth and doorHeight already defined above for back wall opening
    const doorThickness = 0.15;
    const doorMat = new THREE.MeshBasicMaterial({ color: 0x880000 }); // Dark red door

    const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, doorThickness);
    const portalDoor = new THREE.Mesh(doorGeo, doorMat);

    // Position door at the back wall, slightly in front of it
    portalDoor.position.set(
      0,
      doorHeight / 2,
      -depth / 2 + wallThickness / 2 + 0.1
    );

    // Mark as portal door
    portalDoor.userData.isDoor = true;
    portalDoor.userData.isPortalDoor = true; // Special flag for world switching
    portalDoor.userData.isOpen = false;
    portalDoor.userData.isWall = true; // Door acts as wall when closed
    portalDoor.userData.closedPosition = portalDoor.position.clone();
    portalDoor.userData.closedRotation = portalDoor.rotation.clone();
    portalDoor.userData.doorPivot = new THREE.Vector3(
      -doorWidth / 2,
      0,
      -depth / 2 + wallThickness / 2 + 0.1
    );

    group.add(portalDoor);

    // Door frame (glowing red outline)
    const frameColor = 0x660000;
    const frameMat = new THREE.MeshBasicMaterial({ color: frameColor });

    // Left frame
    const frameThickness = 0.15;
    const leftFrameGeo = new THREE.BoxGeometry(
      frameThickness,
      doorHeight + 0.2,
      0.2
    );
    const leftFrame = new THREE.Mesh(leftFrameGeo, frameMat);
    leftFrame.position.set(
      -doorWidth / 2 - frameThickness / 2,
      doorHeight / 2,
      -depth / 2 + wallThickness / 2 + 0.15
    );
    group.add(leftFrame);

    // Right frame
    const rightFrame = new THREE.Mesh(leftFrameGeo, frameMat);
    rightFrame.position.set(
      doorWidth / 2 + frameThickness / 2,
      doorHeight / 2,
      -depth / 2 + wallThickness / 2 + 0.15
    );
    group.add(rightFrame);

    // Top frame
    const topFrameGeo = new THREE.BoxGeometry(
      doorWidth + frameThickness * 2,
      frameThickness,
      0.2
    );
    const topFrame = new THREE.Mesh(topFrameGeo, frameMat);
    topFrame.position.set(
      0,
      doorHeight + frameThickness / 2,
      -depth / 2 + wallThickness / 2 + 0.15
    );
    group.add(topFrame);

    // Eerie glow from behind the door
    const doorLight = new THREE.PointLight(0xff0000, 3, 8);
    doorLight.position.set(0, 2, -depth / 2 - 1);
    group.add(doorLight);

    // Store building for collision detection
    if (!this.portalBuildings) this.portalBuildings = [];
    this.portalBuildings.push(group);
    this.portalBuildings.push(group);

    this.scene.add(group);

    // Return the door reference for interaction
    return portalDoor;
  }

  /**
   * Switches between Normal and Upside Down world states
   * Only swaps visual properties, not geometry
   */
  async switchWorldState(newState, onComplete) {
    if (this.isTransitioning) return;
    if (this.currentState === newState) return;

    console.log(`[World] Switching to ${newState}...`);
    this.isTransitioning = true;

    const targetState = WORLD_STATES[newState];

    // Animate transition
    await this.animateTransition(targetState);

    // Activate/deactivate Upside Down effects
    if (newState === "upsideDown") {
      const buildingPositions = this.chunkManager
        ? this.chunkManager.getBuildingPositions()
        : [];
      this.upsideDownEffects.activate(buildingPositions);
    } else {
      this.upsideDownEffects.deactivate();
    }

    this.currentState = newState;
    this.isTransitioning = false;

    if (onComplete) onComplete();
  }

  /**
   * Animates the world state transition
   */
  animateTransition(targetState) {
    return new Promise((resolve) => {
      const duration = 1500; // 1.5 second transition
      const startTime = Date.now();
      const currentState = WORLD_STATES[this.currentState];

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease in-out
        const t =
          progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        // Interpolate colors
        this.lerpMaterialColors(currentState, targetState, t);

        // Update environment
        this.environment.lerp(currentState, targetState, t);

        // Flash effect at midpoint
        if (progress > 0.45 && progress < 0.55) {
          this.scene.background = new THREE.Color(0xffffff);
        } else {
          const bgColor = this.lerpColor(
            currentState.skyColor,
            targetState.skyColor,
            t
          );
          this.scene.background = new THREE.Color(bgColor);
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Ensure final state is exact
          this.applyWorldState(targetState);
          resolve();
        }
      };

      animate();
    });
  }

  /**
   * Interpolates material colors during transition
   */
  lerpMaterialColors(fromState, toState, t) {
    const groundColor = this.lerpColor(
      fromState.groundColor,
      toState.groundColor,
      t
    );
    const treeColor = this.lerpColor(fromState.treeColor, toState.treeColor, t);
    const buildingColor = this.lerpColor(
      fromState.buildingColor,
      toState.buildingColor,
      t
    );

    // Determine if transitioning to Upside Down for emissive intensity
    const toUpsideDown = toState === WORLD_STATES.upsideDown;
    const treeEmissive = toUpsideDown ? 0.2 + t * 0.6 : 0.8 - t * 0.6;
    const buildingEmissive = toUpsideDown ? 0.25 + t * 0.95 : 1.2 - t * 0.95;

    this.worldMaterials.ground.color.setHex(groundColor);

    this.worldMaterials.trees.color.setHex(treeColor);
    this.worldMaterials.trees.emissive.setHex(treeColor);
    this.worldMaterials.trees.emissiveIntensity = treeEmissive;

    this.worldMaterials.buildings.color.setHex(buildingColor);
    this.worldMaterials.buildings.emissive.setHex(buildingColor);
    this.worldMaterials.buildings.emissiveIntensity = buildingEmissive;
  }

  /**
   * Linearly interpolates between two hex colors
   */
  lerpColor(color1, color2, t) {
    const r1 = (color1 >> 16) & 255;
    const g1 = (color1 >> 8) & 255;
    const b1 = color1 & 255;

    const r2 = (color2 >> 16) & 255;
    const g2 = (color2 >> 8) & 255;
    const b2 = color2 & 255;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return (r << 16) | (g << 8) | b;
  }

  /**
   * Applies a world state immediately (no transition)
   */
  applyWorldState(state) {
    const isUpsideDown = state === WORLD_STATES.upsideDown;

    // Much higher emissive intensity for Upside Down to make objects self-illuminating
    const groundEmissive = isUpsideDown ? 1.0 : 0.15;
    const treeEmissive = isUpsideDown ? 0.8 : 0.2;
    const buildingEmissive = isUpsideDown ? 1.2 : 0.25;

    this.worldMaterials.ground.color.setHex(state.groundColor);

    this.worldMaterials.trees.color.setHex(state.treeColor);
    this.worldMaterials.trees.emissive.setHex(state.treeColor);
    this.worldMaterials.trees.emissiveIntensity = treeEmissive;

    this.worldMaterials.buildings.color.setHex(state.buildingColor);
    this.worldMaterials.buildings.emissive.setHex(state.buildingColor);
    this.worldMaterials.buildings.emissiveIntensity = buildingEmissive;

    // Also update trunk material for Upside Down
    if (this.worldMaterials.trunk) {
      this.worldMaterials.trunk.emissiveIntensity = isUpsideDown ? 0.6 : 0.2;
    }

    this.environment.apply(state);
    this.scene.background = new THREE.Color(state.skyColor);

    // Keep building colors same in both worlds - only sky differs
    const buildingColor = 0x5a5a6a;
    const roofColor = 0x3a2a1a;
    const roadColor = 0x2a2a2a;
    if (this.chunkManager) {
      this.chunkManager.updateBuildingColors(
        buildingColor,
        roofColor,
        roadColor
      );
    }
  }

  /**
   * Checks if player walks through any portal
   * Returns direction ('into' or 'outof') if player crossed through, null otherwise
   */
  checkPortalProximity(playerPosition) {
    for (const portal of this.portals) {
      // Check if player walked through the portal and get direction
      const direction = portal.checkWalkThrough(playerPosition);
      if (direction) {
        return direction;
      }
    }

    return null;
  }

  /**
   * Checks if player is near any portal (for UI prompt)
   */
  isPlayerNearPortal(playerPosition) {
    for (const portal of this.portals) {
      if (portal.isPlayerNear(playerPosition)) {
        return portal;
      }
    }
    return null;
  }

  /**
   * Gets the nearest portal door to the player
   */
  getNearestPortalDoor(playerPosition, maxDistance = 3) {
    if (!this.portalDoors) return null;

    let nearest = null;
    let minDist = maxDistance;

    for (const portalDoorData of this.portalDoors) {
      const door = portalDoorData.door;
      if (!door) continue;

      // Get door world position
      const doorWorldPos = new THREE.Vector3();
      door.getWorldPosition(doorWorldPos);

      const dx = playerPosition.x - doorWorldPos.x;
      const dz = playerPosition.z - doorWorldPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < minDist) {
        minDist = dist;
        nearest = portalDoorData;
      }
    }

    return nearest;
  }

  /**
   * Updates chunk loading based on player position
   */
  updateChunks(playerPosition) {
    if (this.chunkManager) {
      this.chunkManager.update(playerPosition);
    }
  }

  /**
   * Updates portal animations
   */
  updatePortals(deltaTime) {
    this.portals.forEach((portal) => portal.update(deltaTime));
  }

  /**
   * Main update loop
   */
  update(deltaTime, playerPosition) {
    this.updateChunks(playerPosition);
    this.updatePortals(deltaTime);

    if (this.environment) {
      this.environment.update(deltaTime);
    }

    // Update Upside Down effects
    if (this.upsideDownEffects) {
      this.upsideDownEffects.update(deltaTime);
      this.upsideDownEffects.updateCenter(playerPosition);
    }
  }

  /**
   * Gets the current world state
   */
  getWorldState() {
    return this.currentState;
  }
}
