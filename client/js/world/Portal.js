/**
 * Portal Class
 * Wall-mounted crack portal with sticky red vessels
 * Walk through to transition between Normal world and Upside Down
 */

import * as THREE from "three";

export class Portal {
  constructor(scene, x, z, name = "Portal", rotation = 0) {
    this.scene = scene;
    this.position = { x, y: 0, z };
    this.name = name;
    this.rotation = rotation; // Y-axis rotation to face different directions

    // Portal mesh components
    this.portalGroup = null;
    this.portalLight = null;
    this.vessels = [];
    this.particles = null;

    // Animation
    this.time = 0;
    this.active = true;

    // Trigger zone for walk-through detection
    this.triggerBox = null;
    this.crackWidth = 3.0; // Wide enough to peek through
    this.crackHeight = 4.5; // Tall crack

    // Track player position for directional walk-through detection
    this.playerWasInside = false;
    this.lastPlayerZ = null; // Track last Z position in local space
  }

  /**
   * Initializes the portal visual on a building wall
   * The crack is positioned on the front wall at z + depth/2
   */
  init() {
    this.portalGroup = new THREE.Group();
    this.portalGroup.position.set(this.position.x, 0, this.position.z);
    this.portalGroup.rotation.y = this.rotation;

    // Offset the crack to be on the front wall of the portal building
    // The building is 10 units deep, so front wall is at z + 5
    this.crackOffset = 5;

    // Create the crack on the wall
    this.createWallCrack();

    // Create sticky red vessels around the crack
    this.createVessels();

    // Create glowing inner void
    this.createInnerVoid();

    // Create pulsing light
    this.createPortalLight();

    // Create floating particles
    this.createPortalParticles();

    this.scene.add(this.portalGroup);
  }

  /**
   * Creates the jagged crack shape on the wall - BIG crack to peek through
   */
  createWallCrack() {
    // Outer crack border (dark red/black edge) - LARGER crack
    const crackShape = new THREE.Shape();

    // Jagged crack outline - much bigger for peeking through
    crackShape.moveTo(0, 0.05);
    crackShape.lineTo(-0.8, 0.4);
    crackShape.lineTo(-0.5, 0.9);
    crackShape.lineTo(-1.0, 1.4);
    crackShape.lineTo(-0.7, 1.9);
    crackShape.lineTo(-1.2, 2.5);
    crackShape.lineTo(-0.8, 3.0);
    crackShape.lineTo(-1.1, 3.5);
    crackShape.lineTo(-0.6, 4.0);
    crackShape.lineTo(-0.8, 4.3);
    crackShape.lineTo(0, 4.5);
    crackShape.lineTo(0.7, 4.3);
    crackShape.lineTo(1.0, 4.0);
    crackShape.lineTo(0.6, 3.5);
    crackShape.lineTo(1.1, 3.0);
    crackShape.lineTo(0.7, 2.5);
    crackShape.lineTo(1.2, 1.9);
    crackShape.lineTo(0.9, 1.4);
    crackShape.lineTo(1.1, 0.9);
    crackShape.lineTo(0.7, 0.4);
    crackShape.lineTo(1.0, 0.05);
    crackShape.lineTo(0, 0.05);

    const crackGeo = new THREE.ShapeGeometry(crackShape);
    const crackMat = new THREE.MeshBasicMaterial({
      color: 0x220000,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });

    const crack = new THREE.Mesh(crackGeo, crackMat);
    crack.position.set(0, 0, this.crackOffset + 0.01);
    this.portalGroup.add(crack);

    // Add branch cracks spreading from main crack
    this.createBranchCracks();
  }

  /**
   * Creates branch cracks spreading from the main BIGGER crack
   */
  createBranchCracks() {
    const branchMat = new THREE.MeshBasicMaterial({
      color: 0x330000,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });

    // Bigger branch cracks for larger opening
    const branchData = [
      { startY: 0.6, side: -1, length: 1.8 },
      { startY: 1.4, side: 1, length: 2.0 },
      { startY: 2.2, side: -1, length: 1.5 },
      { startY: 3.0, side: 1, length: 1.8 },
      { startY: 1.8, side: -1, length: 1.2 },
      { startY: 3.6, side: -1, length: 1.0 },
      { startY: 3.8, side: 1, length: 0.8 },
      { startY: 0.9, side: 1, length: 1.4 },
    ];

    branchData.forEach((data) => {
      const branchShape = new THREE.Shape();
      const startX = 0.8 * data.side;
      const endX = (0.8 + data.length) * data.side;

      branchShape.moveTo(startX, data.startY);
      branchShape.lineTo(startX + 0.15 * data.side, data.startY + 0.2);
      branchShape.lineTo(endX, data.startY + 0.15);
      branchShape.lineTo(endX + 0.15 * data.side, data.startY);
      branchShape.lineTo(endX, data.startY - 0.1);
      branchShape.lineTo(startX + 0.15 * data.side, data.startY - 0.15);
      branchShape.lineTo(startX, data.startY);

      const branchGeo = new THREE.ShapeGeometry(branchShape);
      const branch = new THREE.Mesh(branchGeo, branchMat);
      branch.position.set(0, 0, this.crackOffset + 0.005);
      this.portalGroup.add(branch);
    });
  }

  /**
   * Creates sticky red vessels/tendrils around the BIGGER crack
   */
  createVessels() {
    const vesselMat = new THREE.MeshBasicMaterial({
      color: 0x8b0000,
      transparent: true,
      opacity: 0.9,
    });

    const stickyMat = new THREE.MeshBasicMaterial({
      color: 0xaa2222,
      transparent: true,
      opacity: 0.7,
    });

    // Create main vessels wrapping around the crack edges - BIGGER positions
    const vesselConfigs = [
      // Left side vessels - spread wider
      { x: -1.0, y: 0.4, z: 0.1, scaleY: 1.2, rotZ: 0.3 },
      { x: -1.1, y: 1.3, z: 0.15, scaleY: 1.5, rotZ: 0.2 },
      { x: -1.0, y: 2.2, z: 0.1, scaleY: 1.3, rotZ: -0.1 },
      { x: -0.9, y: 3.2, z: 0.12, scaleY: 1.0, rotZ: 0.15 },
      { x: -0.7, y: 4.0, z: 0.1, scaleY: 0.8, rotZ: 0.25 },
      // Right side vessels
      { x: 1.0, y: 0.5, z: 0.1, scaleY: 1.3, rotZ: -0.25 },
      { x: 1.1, y: 1.6, z: 0.13, scaleY: 1.4, rotZ: -0.15 },
      { x: 1.0, y: 2.5, z: 0.11, scaleY: 1.1, rotZ: 0.1 },
      { x: 0.9, y: 3.4, z: 0.1, scaleY: 0.9, rotZ: -0.2 },
      { x: 0.7, y: 4.1, z: 0.12, scaleY: 0.7, rotZ: -0.3 },
      // Top vessels
      { x: -0.4, y: 4.3, z: 0.1, scaleY: 0.6, rotZ: 1.2 },
      { x: 0.3, y: 4.35, z: 0.12, scaleY: 0.5, rotZ: -1.1 },
      // Bottom vessels
      { x: -0.5, y: 0.2, z: 0.1, scaleY: 0.5, rotZ: 0.8 },
      { x: 0.5, y: 0.15, z: 0.11, scaleY: 0.45, rotZ: -0.9 },
    ];

    vesselConfigs.forEach((config, index) => {
      // Main vessel tube - thicker
      const vesselGeo = new THREE.CylinderGeometry(
        0.12,
        0.18,
        config.scaleY,
        6
      );
      const vessel = new THREE.Mesh(vesselGeo, vesselMat);
      vessel.position.set(config.x, config.y, this.crackOffset + config.z);
      vessel.rotation.z = config.rotZ;
      this.portalGroup.add(vessel);
      this.vessels.push(vessel);

      // Sticky drips hanging from vessels
      if (index % 2 === 0) {
        const dripGeo = new THREE.ConeGeometry(
          0.08,
          0.2 + ((index * 0.03) % 0.25),
          4
        );
        const drip = new THREE.Mesh(dripGeo, stickyMat);
        drip.position.set(
          config.x + (((index * 0.1) % 0.1) - 0.05),
          config.y - config.scaleY / 2 - 0.15,
          this.crackOffset + config.z
        );
        drip.rotation.x = Math.PI;
        this.portalGroup.add(drip);
        this.vessels.push(drip);
      }
    });

    // Create web-like sticky strands across the crack
    this.createStickyStrands();
  }

  /**
   * Creates web-like sticky strands across the BIGGER crack opening
   */
  createStickyStrands() {
    const strandMat = new THREE.MeshBasicMaterial({
      color: 0x991111,
      transparent: true,
      opacity: 0.5,
    });

    // Wider strands for bigger crack
    const strandConfigs = [
      { y: 0.6, leftX: -0.9, rightX: 0.85, sag: 0.15 },
      { y: 1.3, leftX: -1.0, rightX: 0.95, sag: 0.2 },
      { y: 2.0, leftX: -1.1, rightX: 1.0, sag: 0.18 },
      { y: 2.7, leftX: -0.95, rightX: 0.9, sag: 0.15 },
      { y: 3.4, leftX: -0.8, rightX: 0.75, sag: 0.12 },
      { y: 4.0, leftX: -0.5, rightX: 0.45, sag: 0.1 },
    ];

    strandConfigs.forEach((config) => {
      // Create a curved strand using a tube - thicker
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(config.leftX, config.y, this.crackOffset + 0.05),
        new THREE.Vector3(0, config.y - config.sag, this.crackOffset + 0.2),
        new THREE.Vector3(config.rightX, config.y, this.crackOffset + 0.05)
      );

      const tubeGeo = new THREE.TubeGeometry(curve, 10, 0.035, 5, false);
      const strand = new THREE.Mesh(tubeGeo, strandMat);
      this.portalGroup.add(strand);
      this.vessels.push(strand);
    });
  }

  /**
   * Creates the glowing inner void of the crack - BIGGER for peeking
   */
  createInnerVoid() {
    // Inner glow shape - much larger
    const innerShape = new THREE.Shape();
    innerShape.moveTo(0, 0.15);
    innerShape.lineTo(-0.6, 0.5);
    innerShape.lineTo(-0.4, 1.0);
    innerShape.lineTo(-0.8, 1.5);
    innerShape.lineTo(-0.5, 2.0);
    innerShape.lineTo(-0.9, 2.5);
    innerShape.lineTo(-0.6, 3.0);
    innerShape.lineTo(-0.8, 3.5);
    innerShape.lineTo(-0.4, 4.0);
    innerShape.lineTo(-0.5, 4.2);
    innerShape.lineTo(0, 4.35);
    innerShape.lineTo(0.5, 4.2);
    innerShape.lineTo(0.7, 4.0);
    innerShape.lineTo(0.5, 3.5);
    innerShape.lineTo(0.85, 3.0);
    innerShape.lineTo(0.55, 2.5);
    innerShape.lineTo(0.9, 2.0);
    innerShape.lineTo(0.6, 1.5);
    innerShape.lineTo(0.75, 1.0);
    innerShape.lineTo(0.5, 0.5);
    innerShape.lineTo(0.7, 0.15);
    innerShape.lineTo(0, 0.15);

    const innerGeo = new THREE.ShapeGeometry(innerShape);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xff2222,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });

    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.set(0, 0, this.crackOffset + 0.02);
    inner.name = "innerGlow";
    this.portalGroup.add(inner);

    // Deep void center - bigger hole to peek through
    const voidShape = new THREE.Shape();
    voidShape.moveTo(0, 0.3);
    voidShape.lineTo(-0.4, 0.7);
    voidShape.lineTo(-0.25, 1.2);
    voidShape.lineTo(-0.5, 1.7);
    voidShape.lineTo(-0.3, 2.2);
    voidShape.lineTo(-0.55, 2.7);
    voidShape.lineTo(-0.35, 3.2);
    voidShape.lineTo(-0.5, 3.7);
    voidShape.lineTo(-0.2, 4.0);
    voidShape.lineTo(0, 4.1);
    voidShape.lineTo(0.25, 4.0);
    voidShape.lineTo(0.45, 3.7);
    voidShape.lineTo(0.3, 3.2);
    voidShape.lineTo(0.5, 2.7);
    voidShape.lineTo(0.35, 2.2);
    voidShape.lineTo(0.55, 1.7);
    voidShape.lineTo(0.3, 1.2);
    voidShape.lineTo(0.45, 0.7);
    voidShape.lineTo(0.2, 0.3);
    voidShape.lineTo(0, 0.3);

    const voidGeo = new THREE.ShapeGeometry(voidShape);
    const voidMat = new THREE.MeshBasicMaterial({
      color: 0x110000,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });

    const voidMesh = new THREE.Mesh(voidGeo, voidMat);
    voidMesh.position.set(0, 0, this.crackOffset + 0.03);
    this.portalGroup.add(voidMesh);
  }

  /**
   * Creates the pulsing red light from the crack - brighter for bigger crack
   */
  createPortalLight() {
    this.portalLight = new THREE.PointLight(0xff0000, 6, 15);
    this.portalLight.position.set(0, 2.2, this.crackOffset + 0.5);
    this.portalGroup.add(this.portalLight);

    // Secondary dim light for ambient glow
    const ambientLight = new THREE.PointLight(0x880000, 2.5, 10);
    ambientLight.position.set(0, 2.2, this.crackOffset - 0.5);
    this.portalGroup.add(ambientLight);

    // Wall glow effect - larger
    const wallGlowGeo = new THREE.CircleGeometry(3.5, 16);
    const wallGlowMat = new THREE.MeshBasicMaterial({
      color: 0x660000,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });

    const wallGlow = new THREE.Mesh(wallGlowGeo, wallGlowMat);
    wallGlow.position.set(0, 1.8, this.crackOffset - 0.02);
    this.portalGroup.add(wallGlow);
  }

  /**
   * Creates floating particles around the portal crack (optimized)
   */
  createPortalParticles() {
    const particleCount = 30; // Reduced for performance
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 3;
      positions[i * 3 + 1] = Math.random() * 4 + 0.2;
      positions[i * 3 + 2] = this.crackOffset + Math.random() * 0.8 + 0.1;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xff4444,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
    });

    this.particles = new THREE.Points(geometry, material);
    this.portalGroup.add(this.particles);
  }

  /**
   * Updates portal animation (optimized - less frequent updates)
   */
  update(deltaTime) {
    if (!this.active) return;

    this.time += deltaTime;

    // Only update every few frames for performance
    this.updateCounter = (this.updateCounter || 0) + 1;
    if (this.updateCounter % 3 !== 0) return; // Skip 2 out of 3 frames

    // Pulse light intensity
    if (this.portalLight) {
      this.portalLight.intensity = 4 + Math.sin(this.time * 2.5) * 1.5;
    }

    // Pulse inner glow opacity
    const innerGlow = this.portalGroup.getObjectByName("innerGlow");
    if (innerGlow && innerGlow.material) {
      innerGlow.material.opacity = 0.6 + Math.sin(this.time * 3) * 0.2;
    }

    // Simple particle rotation instead of per-particle animation
    if (this.particles) {
      this.particles.rotation.y += deltaTime * 0.1;
    }
  }

  /**
   * Checks if player is walking through the portal crack
   * Returns direction: 'into' when walking into building, 'outof' when walking out, null otherwise
   * This makes the portal work like a real doorway - walk in/out naturally
   */
  checkWalkThrough(playerPosition) {
    // Convert player position to local space
    const localPos = new THREE.Vector3(
      playerPosition.x - this.position.x,
      playerPosition.y,
      playerPosition.z - this.position.z
    );

    // Rotate point to local space
    const cos = Math.cos(-this.rotation);
    const sin = Math.sin(-this.rotation);
    const rotatedX = localPos.x * cos - localPos.z * sin;
    const rotatedZ = localPos.x * sin + localPos.z * cos;

    // Check if player is in the trigger zone at the front wall (crackOffset)
    const inX = Math.abs(rotatedX) < this.crackWidth / 2;
    const inY = playerPosition.y >= 0 && playerPosition.y < this.crackHeight;
    // Trigger zone spans from just before to just after the crack
    const inZ =
      rotatedZ > this.crackOffset - 1.5 && rotatedZ < this.crackOffset + 1.5;

    const isInside = inX && inY && inZ;

    // Detect crossing through the crack threshold
    let crossDirection = null;

    if (isInside && this.lastPlayerZ !== null) {
      const threshold = this.crackOffset; // The crack wall position
      const previousZ = this.lastPlayerZ;

      // Check if player crossed the threshold
      if (previousZ < threshold && rotatedZ >= threshold) {
        // Walking INTO the building (from outside to inside)
        crossDirection = "into";
      } else if (previousZ >= threshold && rotatedZ < threshold) {
        // Walking OUT OF the building (from inside to outside)
        crossDirection = "outof";
      }
    }

    // Always update tracking
    this.playerWasInside = isInside;
    if (isInside) {
      this.lastPlayerZ = rotatedZ;
    } else {
      // Reset when player leaves the trigger area
      this.lastPlayerZ = rotatedZ; // Keep tracking even outside
    }

    return crossDirection;
  }

  /**
   * Checks if player is near the portal building (for UI prompt)
   */
  isPlayerNear(playerPosition) {
    const dx = playerPosition.x - this.position.x;
    const dz = playerPosition.z - this.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    return distance < 5; // Slightly larger radius for building
  }

  /**
   * Gets the portal's trigger radius (for legacy compatibility)
   */
  getTriggerRadius() {
    return 2;
  }

  /**
   * Gets the position players should face when entering
   */
  getEntryDirection() {
    return new THREE.Vector3(
      Math.sin(this.rotation),
      0,
      Math.cos(this.rotation)
    );
  }

  /**
   * Disposes of portal resources
   */
  dispose() {
    if (this.portalGroup) {
      this.scene.remove(this.portalGroup);

      this.portalGroup.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
    }
  }
}
