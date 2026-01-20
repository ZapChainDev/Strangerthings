/**
 * CinematicCamera Class
 * Enhanced third-person camera with cinematic effects
 * Includes camera sway, breathing, FOV adjustments, and smooth transitions
 */

import * as THREE from "three";
import { GAME_CONFIG } from "../utils/constants.js";

export class CinematicCamera {
  constructor(renderer) {
    // Create perspective camera with cinematic FOV
    this.camera = new THREE.PerspectiveCamera(
      65, // Slightly wider FOV for cinematic feel
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = renderer;

    // Camera offset from player (over-the-shoulder)
    this.distance = GAME_CONFIG.CAMERA_DISTANCE || 5;
    this.height = GAME_CONFIG.CAMERA_HEIGHT || 2.5;
    this.offsetX = 0.5; // Slight offset to the right for over-shoulder view

    // Camera rotation (controlled by mouse)
    this.yaw = 0;
    this.pitch = 0.3;

    // Pitch limits
    this.minPitch = -0.5;
    this.maxPitch = 1.2;

    // Smoothing
    this.lerpSpeed = GAME_CONFIG.CAMERA_LERP_SPEED || 0.1;
    this.currentPosition = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();

    // Target reference
    this.target = null;

    // Mouse control state
    this.isMouseLocked = false;

    // ===== CINEMATIC EFFECTS =====

    // Camera sway/bob for walking
    this.swayEnabled = true;
    this.swayTime = 0;
    this.swayIntensity = {
      idle: { x: 0.003, y: 0.002 },
      walk: { x: 0.008, y: 0.012 },
      run: { x: 0.012, y: 0.018 },
    };
    this.currentSwayState = "idle";

    // Breathing effect (subtle camera movement)
    this.breathingTime = 0;
    this.breathingIntensity = 0.002;

    // FOV settings
    this.baseFOV = 65;
    this.targetFOV = 65;
    this.currentFOV = 65;
    this.fovLerpSpeed = 0.05;

    // FOV states
    this.fovStates = {
      idle: 65,
      walk: 67,
      run: 72,
      sprint: 78,
    };

    // Camera shake
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTime = 0;

    // Smooth rotation
    this.smoothYaw = 0;
    this.smoothPitch = 0.3;
    this.rotationLerpSpeed = 0.15;

    // Dolly zoom effect
    this.dollyZoomActive = false;
    this.dollyZoomFactor = 0;

    // Look-ahead (camera leads player movement)
    this.lookAheadEnabled = true;
    this.lookAheadAmount = 1.5;
    this.currentLookAhead = new THREE.Vector3();
    this.targetLookAhead = new THREE.Vector3();

    // Collision avoidance
    this.raycaster = new THREE.Raycaster();
    this.collisionLayers = [];
  }

  /**
   * Sets the target for the camera to follow
   */
  setTarget(target) {
    this.target = target;

    if (target) {
      const pos = target.getPosition();
      this.currentPosition.copy(this.calculateCameraPosition(pos));
      this.camera.position.copy(this.currentPosition);
    }
  }

  /**
   * Calculates the ideal camera position based on target and rotation
   */
  calculateCameraPosition(targetPos) {
    const position = new THREE.Vector3();

    // Calculate camera position based on spherical coordinates
    const horizontalDistance = this.distance * Math.cos(this.smoothPitch);
    const verticalDistance = this.distance * Math.sin(this.smoothPitch);

    position.x =
      targetPos.x -
      Math.sin(this.smoothYaw) * horizontalDistance +
      this.offsetX;
    position.y = targetPos.y + this.height + verticalDistance;
    position.z = targetPos.z - Math.cos(this.smoothYaw) * horizontalDistance;

    // Add look-ahead offset
    if (this.lookAheadEnabled) {
      position.x += this.currentLookAhead.x;
      position.z += this.currentLookAhead.z;
    }

    return position;
  }

  /**
   * Handles mouse movement for camera rotation
   */
  handleMouseMove(movementX, movementY) {
    if (!this.isMouseLocked) return;

    const sensitivity = GAME_CONFIG.CAMERA_ROTATION_SPEED || 0.002;

    // Update yaw (horizontal rotation)
    this.yaw -= movementX * sensitivity;

    // Update pitch (vertical rotation) with clamping
    this.pitch -= movementY * sensitivity;
    this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
  }

  /**
   * Sets mouse lock state
   */
  setMouseLocked(locked) {
    this.isMouseLocked = locked;
  }

  /**
   * Set movement state for camera effects
   */
  setMovementState(state) {
    this.currentSwayState = state;

    // Update target FOV based on movement
    if (this.fovStates[state] !== undefined) {
      this.targetFOV = this.fovStates[state];
    }
  }

  /**
   * Trigger camera shake
   */
  shake(intensity = 0.1, duration = 0.3) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTime = 0;
  }

  /**
   * Updates camera position and look target
   */
  update(deltaTime, playerVelocity = null) {
    if (!this.target) return;

    const targetPos = this.target.getPosition();

    // Smooth rotation interpolation
    this.smoothYaw = THREE.MathUtils.lerp(
      this.smoothYaw,
      this.yaw,
      this.rotationLerpSpeed
    );
    this.smoothPitch = THREE.MathUtils.lerp(
      this.smoothPitch,
      this.pitch,
      this.rotationLerpSpeed
    );

    // Update look-ahead based on player velocity
    if (playerVelocity && this.lookAheadEnabled) {
      this.targetLookAhead.set(
        playerVelocity.x * this.lookAheadAmount,
        0,
        playerVelocity.z * this.lookAheadAmount
      );
      this.currentLookAhead.lerp(this.targetLookAhead, 0.05);
    }

    // Calculate target camera position
    this.targetPosition.copy(this.calculateCameraPosition(targetPos));

    // Smooth interpolation to target position
    this.currentPosition.lerp(this.targetPosition, this.lerpSpeed);

    // Apply camera sway
    if (this.swayEnabled) {
      this.swayTime += deltaTime;
      const sway =
        this.swayIntensity[this.currentSwayState] || this.swayIntensity.idle;

      const swayX = Math.sin(this.swayTime * 3) * sway.x;
      const swayY = Math.sin(this.swayTime * 6) * sway.y;

      this.currentPosition.x += swayX;
      this.currentPosition.y += swayY;
    }

    // Apply breathing effect
    this.breathingTime += deltaTime;
    const breathX =
      Math.sin(this.breathingTime * 0.8) * this.breathingIntensity;
    const breathY =
      Math.sin(this.breathingTime * 1.2) * this.breathingIntensity * 0.5;
    this.currentPosition.x += breathX;
    this.currentPosition.y += breathY;

    // Apply camera shake
    if (this.shakeDuration > 0) {
      this.shakeTime += deltaTime;

      if (this.shakeTime < this.shakeDuration) {
        const shakeAmount =
          this.shakeIntensity * (1 - this.shakeTime / this.shakeDuration);
        this.currentPosition.x += (Math.random() - 0.5) * shakeAmount;
        this.currentPosition.y += (Math.random() - 0.5) * shakeAmount;
        this.currentPosition.z += (Math.random() - 0.5) * shakeAmount;
      } else {
        this.shakeDuration = 0;
        this.shakeIntensity = 0;
      }
    }

    // Set camera position
    this.camera.position.copy(this.currentPosition);

    // Look at point slightly above player
    const lookTarget = new THREE.Vector3(
      targetPos.x,
      targetPos.y + 1.5,
      targetPos.z
    );
    this.camera.lookAt(lookTarget);

    // Smooth FOV interpolation
    this.currentFOV = THREE.MathUtils.lerp(
      this.currentFOV,
      this.targetFOV,
      this.fovLerpSpeed
    );
    if (Math.abs(this.currentFOV - this.camera.fov) > 0.01) {
      this.camera.fov = this.currentFOV;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Gets the camera's forward direction (for player movement)
   */
  getForwardDirection() {
    return new THREE.Vector3(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw)
    ).normalize();
  }

  /**
   * Gets the camera's right direction (for strafing)
   */
  getRightDirection() {
    return new THREE.Vector3(
      Math.cos(this.yaw),
      0,
      -Math.sin(this.yaw)
    ).normalize();
  }

  /**
   * Gets the camera's current yaw
   */
  getYaw() {
    return this.yaw;
  }

  /**
   * Set FOV directly
   */
  setFOV(fov) {
    this.targetFOV = fov;
  }

  /**
   * Enable/disable camera sway
   */
  setSwayEnabled(enabled) {
    this.swayEnabled = enabled;
  }

  /**
   * Handles window resize
   */
  handleResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Gets the Three.js camera object
   */
  getCamera() {
    return this.camera;
  }
}
