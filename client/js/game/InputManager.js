/**
 * InputManager Class
 * Handles keyboard and mouse input for player control
 * Manages pointer lock for mouse look
 */

import { KEY_BINDINGS } from "../utils/constants.js";

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;

    // Input states
    this.keys = {};
    this.keysPressed = {}; // Track new key presses (not held)
    this.mouseMovement = { x: 0, y: 0 };
    this.isPointerLocked = false;

    // Callbacks
    this.onMouseMove = null;
    this.onPointerLockChange = null;

    // Bind event handlers
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handlePointerLockChange = this.handlePointerLockChange.bind(this);
    this.handleClick = this.handleClick.bind(this);

    this.init();
  }

  /**
   * Initializes event listeners
   */
  init() {
    // Keyboard events
    document.addEventListener("keydown", this.handleKeyDown);
    document.addEventListener("keyup", this.handleKeyUp);

    // Mouse events
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener(
      "pointerlockchange",
      this.handlePointerLockChange
    );

    // Click to lock pointer
    this.canvas.addEventListener("click", this.handleClick);
  }

  /**
   * Handles keydown events
   */
  handleKeyDown(event) {
    // Track if this is a new key press (wasn't already held)
    if (!this.keys[event.code]) {
      this.keysPressed[event.code] = true;
    }

    this.keys[event.code] = true;

    // Prevent default for game keys
    if (this.isGameKey(event.code)) {
      event.preventDefault();
    }
  }

  /**
   * Handles keyup events
   */
  handleKeyUp(event) {
    this.keys[event.code] = false;
  }

  /**
   * Handles mouse movement
   */
  handleMouseMove(event) {
    if (!this.isPointerLocked) return;

    this.mouseMovement.x = event.movementX || 0;
    this.mouseMovement.y = event.movementY || 0;

    if (this.onMouseMove) {
      this.onMouseMove(this.mouseMovement.x, this.mouseMovement.y);
    }
  }

  /**
   * Handles canvas click - requests pointer lock
   */
  handleClick() {
    if (!this.isPointerLocked) {
      this.canvas.requestPointerLock();
    }
  }

  /**
   * Handles pointer lock state changes
   */
  handlePointerLockChange() {
    this.isPointerLocked = document.pointerLockElement === this.canvas;

    if (this.onPointerLockChange) {
      this.onPointerLockChange(this.isPointerLocked);
    }
  }

  /**
   * Checks if a key code is a game control key
   */
  isGameKey(code) {
    for (const binding of Object.values(KEY_BINDINGS)) {
      if (binding.includes(code)) return true;
    }
    return false;
  }

  /**
   * Checks if a specific action key is pressed
   */
  isKeyPressed(action) {
    const bindings = KEY_BINDINGS[action];
    if (!bindings) return false;

    return bindings.some((code) => this.keys[code]);
  }

  /**
   * Checks if a key was just pressed this frame (not held)
   */
  wasKeyJustPressed(action) {
    const bindings = KEY_BINDINGS[action];
    if (!bindings) return false;

    return bindings.some((code) => this.keysPressed[code]);
  }

  /**
   * Consumes a key press (prevents it from being detected again until released)
   */
  consumeKeyPress(action) {
    const bindings = KEY_BINDINGS[action];
    if (!bindings) return;

    bindings.forEach((code) => {
      this.keysPressed[code] = false;
    });
  }

  /**
   * Gets movement input as a normalized vector
   */
  getMovementInput() {
    let x = 0;
    let z = 0;

    if (this.isKeyPressed("FORWARD")) z -= 1;
    if (this.isKeyPressed("BACKWARD")) z += 1;
    if (this.isKeyPressed("LEFT")) x += 1;
    if (this.isKeyPressed("RIGHT")) x -= 1;

    // Normalize diagonal movement
    const length = Math.sqrt(x * x + z * z);
    if (length > 0) {
      x /= length;
      z /= length;
    }

    return { x, z };
  }

  /**
   * Checks if player is running
   */
  isRunning() {
    return this.isKeyPressed("RUN");
  }

  /**
   * Checks if interact key is pressed
   */
  isInteracting() {
    return this.isKeyPressed("INTERACT");
  }

  /**
   * Checks if door open key (G) is pressed
   */
  isDoorOpening() {
    return this.isKeyPressed("OPEN_DOOR");
  }

  /**
   * Checks if bicycle ride key (F) was just pressed
   */
  isRidingBicycle() {
    const justPressed = this.wasKeyJustPressed("RIDE_BICYCLE");
    if (justPressed) {
      this.consumeKeyPress("RIDE_BICYCLE");
    }
    return justPressed;
  }

  /**
   * Checks if jump key (Space) was just pressed
   */
  isJumping() {
    const justPressed = this.wasKeyJustPressed("JUMP");
    if (justPressed) {
      this.consumeKeyPress("JUMP");
    }
    return justPressed;
  }

  /**
   * Consumes mouse movement (resets after reading)
   */
  consumeMouseMovement() {
    const movement = { ...this.mouseMovement };
    this.mouseMovement.x = 0;
    this.mouseMovement.y = 0;
    return movement;
  }

  /**
   * Clears all pressed key flags (call at end of frame)
   */
  clearPressedKeys() {
    this.keysPressed = {};
  }

  /**
   * Cleans up event listeners
   */
  dispose() {
    document.removeEventListener("keydown", this.handleKeyDown);
    document.removeEventListener("keyup", this.handleKeyUp);
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener(
      "pointerlockchange",
      this.handlePointerLockChange
    );
    this.canvas.removeEventListener("click", this.handleClick);
  }
}
