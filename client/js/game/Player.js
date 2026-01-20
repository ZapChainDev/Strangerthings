/**
 * Player Class (Client-side)
 * Handles local player movement, animation, and mesh
 * Also used as base for remote player representation
 */

import * as THREE from "three";
import { GAME_CONFIG, ANIMATIONS } from "../utils/constants.js";

export class Player {
  constructor(scene, isLocal = false) {
    this.scene = scene;
    this.isLocal = isLocal;

    // Player state
    this.position = new THREE.Vector3(0, 0, 0);
    this.rotation = 0; // Y-axis rotation
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.animation = ANIMATIONS.IDLE;
    this.worldState = "normal";

    // Movement state
    this.isMoving = false;
    this.isRunning = false;
    this.isJumping = false;
    this.verticalVelocity = 0;
    this.animationTime = 0;
    this.isTransitioning = false; // Lock movement during portal transition

    // Mesh components
    this.mesh = null;
    this.nameTag = null;

    // Username
    this.username = "Player";
  }

  /**
   * Creates the player mesh (low-poly character)
   */
  createMesh(color = 0x4488ff) {
    this.mesh = new THREE.Group();

    // Body (capsule-like shape using cylinder + spheres) - use MeshBasicMaterial for visibility
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.35, 1, 8);
    const bodyMaterial = new THREE.MeshBasicMaterial({
      color: color,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.8;
    this.mesh.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const headMaterial = new THREE.MeshBasicMaterial({
      color: 0xffccaa,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.55;
    this.mesh.add(head);

    // Hair
    const hairGeometry = new THREE.SphereGeometry(
      0.27,
      8,
      8,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );
    const hairMaterial = new THREE.MeshBasicMaterial({
      color: 0x332211,
    });
    const hair = new THREE.Mesh(hairGeometry, hairMaterial);
    hair.position.y = 1.6;
    this.mesh.add(hair);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.6, 6);
    const armMaterial = new THREE.MeshBasicMaterial({
      color: color,
    });

    // Left arm
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.4, 0.9, 0);
    leftArm.rotation.z = 0.2;
    leftArm.name = "leftArm";
    this.mesh.add(leftArm);

    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.4, 0.9, 0);
    rightArm.rotation.z = -0.2;
    rightArm.name = "rightArm";
    this.mesh.add(rightArm);

    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.1, 0.12, 0.5, 6);
    const legMaterial = new THREE.MeshBasicMaterial({
      color: 0x3344aa,
    });

    // Left leg
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, 0.25, 0);
    leftLeg.name = "leftLeg";
    this.mesh.add(leftLeg);

    // Right leg
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, 0.25, 0);
    rightLeg.name = "rightLeg";
    this.mesh.add(rightLeg);

    // Add shadow
    this.mesh.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
      }
    });

    // Add a strong point light to the player so they're always visible
    this.playerLight = new THREE.PointLight(0xffffff, 3.0, 20, 1);
    this.playerLight.position.set(0, 1.5, 0);
    this.mesh.add(this.playerLight);

    this.scene.add(this.mesh);
    return this.mesh;
  }

  /**
   * Creates a name tag above the player (for remote players)
   */
  createNameTag(username) {
    this.username = username;

    // Create canvas for name
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.width = 256;
    canvas.height = 64;

    // Draw background
    context.fillStyle = "rgba(0, 0, 0, 0.5)";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw text
    context.fillStyle = "white";
    context.font = "bold 32px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(username, canvas.width / 2, canvas.height / 2);

    // Create sprite
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
    });

    this.nameTag = new THREE.Sprite(material);
    this.nameTag.scale.set(2, 0.5, 1);
    this.nameTag.position.y = 2.2;

    this.mesh.add(this.nameTag);
  }

  /**
   * Updates player position from server data
   */
  setPosition(pos) {
    this.position.set(pos.x, pos.y, pos.z);
    if (this.mesh) {
      this.mesh.position.copy(this.position);
    }
  }

  /**
   * Updates player rotation
   */
  setRotation(rotation) {
    this.rotation = rotation;
    if (this.mesh) {
      this.mesh.rotation.y = rotation;
    }
  }

  /**
   * Updates animation state
   */
  setAnimation(anim) {
    if (this.animation !== anim) {
      this.animation = anim;
      // Simple animation would go here
    }
  }

  /**
   * Updates player appearance for world state (normal vs upside down)
   */
  setWorldState(state) {
    this.worldState = state;
    if (!this.mesh) return;

    const isUpsideDown = state === "upsideDown";

    // Update player light intensity for visibility
    if (this.playerLight) {
      this.playerLight.intensity = isUpsideDown ? 5.0 : 3.0;
      this.playerLight.distance = isUpsideDown ? 30 : 20;
      this.playerLight.color.setHex(isUpsideDown ? 0x8899cc : 0xffffff);
    }

    // Update material emissive intensity for better visibility
    this.mesh.traverse((child) => {
      if (
        child.isMesh &&
        child.material &&
        child.material.emissiveIntensity !== undefined
      ) {
        child.material.emissiveIntensity = isUpsideDown ? 0.6 : 0.4;
      }
    });
  }

  /**
   * Simple procedural walk animation
   */
  updateAnimation(deltaTime) {
    if (!this.mesh) return;

    this.animationTime += deltaTime;

    const leftArm = this.mesh.getObjectByName("leftArm");
    const rightArm = this.mesh.getObjectByName("rightArm");
    const leftLeg = this.mesh.getObjectByName("leftLeg");
    const rightLeg = this.mesh.getObjectByName("rightLeg");
    const body = this.mesh.children[0]; // Get body mesh

    if (this.animation === ANIMATIONS.IDLE) {
      // Subtle breathing animation
      const breathe = Math.sin(this.animationTime * 2) * 0.02;
      if (leftArm) {
        leftArm.rotation.x = 0;
        leftArm.rotation.z = 0.2;
      }
      if (rightArm) {
        rightArm.rotation.x = 0;
        rightArm.rotation.z = -0.2;
      }
      if (leftLeg) leftLeg.rotation.x = 0;
      if (rightLeg) rightLeg.rotation.x = 0;
      if (body) body.position.y = 0.8 + breathe;
    } else if (this.animation === ANIMATIONS.WALK) {
      // Realistic walking animation
      const walkSpeed = 6;
      const swing = Math.sin(this.animationTime * walkSpeed);
      const bounce = Math.abs(Math.sin(this.animationTime * walkSpeed)) * 0.08;

      // Arms swing opposite to legs
      if (leftArm) {
        leftArm.rotation.x = swing * 0.6;
        leftArm.rotation.z = 0.1 + swing * 0.1;
      }
      if (rightArm) {
        rightArm.rotation.x = -swing * 0.6;
        rightArm.rotation.z = -0.1 - swing * 0.1;
      }

      // Legs swing
      if (leftLeg) leftLeg.rotation.x = -swing * 0.8;
      if (rightLeg) rightLeg.rotation.x = swing * 0.8;

      // Body bounce while walking
      if (body) body.position.y = 0.8 - bounce;
    } else if (this.animation === ANIMATIONS.RUN) {
      // Faster, more exaggerated running animation
      const runSpeed = 10;
      const swing = Math.sin(this.animationTime * runSpeed);
      const bounce = Math.abs(Math.sin(this.animationTime * runSpeed)) * 0.15;

      // Arms pump faster
      if (leftArm) {
        leftArm.rotation.x = swing * 1.2;
        leftArm.rotation.z = 0;
      }
      if (rightArm) {
        rightArm.rotation.x = -swing * 1.2;
        rightArm.rotation.z = 0;
      }

      // Legs swing more dramatically
      if (leftLeg) leftLeg.rotation.x = -swing * 1.1;
      if (rightLeg) rightLeg.rotation.x = swing * 1.1;

      // More body bounce while running
      if (body) body.position.y = 0.8 - bounce;
    } else if (this.animation === ANIMATIONS.JUMP) {
      // Jump pose - arms up, legs bent
      if (leftArm) {
        leftArm.rotation.x = -0.5;
        leftArm.rotation.z = 0.3;
      }
      if (rightArm) {
        rightArm.rotation.x = -0.5;
        rightArm.rotation.z = -0.3;
      }
      if (leftLeg) leftLeg.rotation.x = 0.3;
      if (rightLeg) rightLeg.rotation.x = 0.3;
      if (body) body.position.y = 0.8;
    }
  }

  /**
   * Gets mesh position for camera/collision
   */
  getPosition() {
    return this.mesh ? this.mesh.position.clone() : this.position.clone();
  }

  /**
   * Gets mesh rotation
   */
  getRotation() {
    return this.mesh ? this.mesh.rotation.y : this.rotation;
  }

  /**
   * Removes player mesh from scene
   */
  dispose() {
    if (this.mesh) {
      this.scene.remove(this.mesh);

      this.mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (child.material.map) child.material.map.dispose();
          child.material.dispose();
        }
      });
    }
  }
}
