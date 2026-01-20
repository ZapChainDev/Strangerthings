/**
 * Camera Class
 * Third-person over-the-shoulder camera with smooth following
 * Handles mouse look and collision avoidance
 */

import * as THREE from "three";
import { GAME_CONFIG } from "../utils/constants.js";

export class Camera {
  constructor(renderer) {
    // Create perspective camera
    this.camera = new THREE.PerspectiveCamera(
      60, // FOV
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = renderer;

    // Camera offset from player (over-the-shoulder)
    this.distance = GAME_CONFIG.CAMERA_DISTANCE;
    this.height = GAME_CONFIG.CAMERA_HEIGHT;
    this.offsetX = 0.5; // Slight offset to the right for over-shoulder view

    // Camera rotation (controlled by mouse)
    this.yaw = 0; // Horizontal rotation
    this.pitch = 0.3; // Vertical rotation (looking slightly down)

    // Pitch limits
    this.minPitch = -0.5;
    this.maxPitch = 1.2;

    // Smoothing
    this.lerpSpeed = GAME_CONFIG.CAMERA_LERP_SPEED;
    this.currentPosition = new THREE.Vector3();
    this.targetPosition = new THREE.Vector3();

    // Target (player) reference
    this.target = null;

    // Mouse control state
    this.isMouseLocked = false;
  }

  /**
   * Sets the target for the camera to follow
   */
  setTarget(target) {
    this.target = target;

    // Initialize camera position
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
    const horizontalDistance = this.distance * Math.cos(this.pitch);
    const verticalDistance = this.distance * Math.sin(this.pitch);

    position.x =
      targetPos.x - Math.sin(this.yaw) * horizontalDistance + this.offsetX;
    position.y = targetPos.y + this.height + verticalDistance;
    position.z = targetPos.z - Math.cos(this.yaw) * horizontalDistance;

    return position;
  }

  /**
   * Handles mouse movement for camera rotation
   */
  handleMouseMove(movementX, movementY) {
    if (!this.isMouseLocked) return;

    const sensitivity = GAME_CONFIG.CAMERA_ROTATION_SPEED;

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
   * Updates camera position and look target
   */
  update(deltaTime) {
    if (!this.target) return;

    const targetPos = this.target.getPosition();

    // Calculate target camera position
    this.targetPosition.copy(this.calculateCameraPosition(targetPos));

    // Smooth interpolation to target position
    this.currentPosition.lerp(this.targetPosition, this.lerpSpeed);
    this.camera.position.copy(this.currentPosition);

    // Look at point slightly above player
    const lookTarget = new THREE.Vector3(
      targetPos.x,
      targetPos.y + 1.5, // Look at head height
      targetPos.z
    );
    this.camera.lookAt(lookTarget);
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
   * Gets the camera's current yaw (for player rotation)
   */
  getYaw() {
    return this.yaw;
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
