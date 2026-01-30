/**
 * InputManager Class
 * Handles keyboard, mouse, and touch input for player control
 * Manages pointer lock for mouse look and virtual joystick for mobile
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

    // Mobile detection - be strict to avoid triggering on desktop with touch screens
    this.isMobile = this.detectMobile();
    // Only consider it a touch-only device if it's actually mobile AND has touch
    this.isTouchDevice =
      this.isMobile &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);

    // Touch input states
    this.touchMovement = { x: 0, z: 0 };
    this.touchLook = { x: 0, y: 0 };
    this.touchRunning = false;
    this.touchJump = false;
    this.touchAction = false;

    // Joystick state
    this.joystick = {
      active: false,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      touchId: null,
    };

    // Look touch state
    this.lookTouch = {
      active: false,
      lastX: 0,
      lastY: 0,
      touchId: null,
    };

    // Callbacks
    this.onMouseMove = null;
    this.onPointerLockChange = null;

    // Bind event handlers
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handlePointerLockChange = this.handlePointerLockChange.bind(this);
    this.handleClick = this.handleClick.bind(this);

    // Touch handlers
    this.handleTouchStart = this.handleTouchStart.bind(this);
    this.handleTouchMove = this.handleTouchMove.bind(this);
    this.handleTouchEnd = this.handleTouchEnd.bind(this);

    this.init();
  }

  /**
   * Detect if device is mobile - improved detection for touch devices
   */
  detectMobile() {
    // Check user agent for mobile devices
    const mobileUA =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      );

    // Check for touch support
    const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    // Check screen size (mobile typically < 768px width)
    const isMobileScreen = window.innerWidth < 768;

    // Consider mobile if: mobile UA OR (touch support AND small screen)
    const result = mobileUA || (hasTouch && isMobileScreen);

    console.log("[InputManager] Mobile detection:", {
      mobileUA,
      hasTouch,
      isMobileScreen,
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: result,
    });

    return result;
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
      this.handlePointerLockChange,
    );

    // Click to lock pointer (desktop only)
    this.canvas.addEventListener("click", this.handleClick);

    // Initialize mobile controls only on actual mobile devices
    console.log(
      "[InputManager] isMobile:",
      this.isMobile,
      "isTouchDevice:",
      this.isTouchDevice,
    );
    if (this.isMobile || this.isTouchDevice) {
      console.log("[InputManager] Initializing mobile controls...");
      this.initMobileControls();
    } else {
      console.log(
        "[InputManager] Skipping mobile controls - not a mobile device",
      );
    }

    // Listen for orientation/resize changes
    window.addEventListener("resize", () => {
      this.isMobile = this.detectMobile();
      this.updateMobileControlsVisibility();
      this.checkOrientation();
    });

    // Check orientation initially
    this.checkOrientation();

    // Add force mobile controls button handler
    const forceMobileBtn = document.getElementById("force-mobile-btn");
    if (forceMobileBtn) {
      forceMobileBtn.addEventListener("click", () => {
        console.log("[InputManager] Force mobile controls enabled");
        this.isMobile = true;
        this.isTouchDevice = true;
        this.initMobileControls();
        this.updateMobileControlsVisibility();
        forceMobileBtn.style.display = "none";
      });
    }
  }

  /**
   * Initialize mobile touch controls
   */
  initMobileControls() {
    console.log("[InputManager] Initializing mobile controls");

    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      const mobileControls = document.getElementById("mobile-controls");
      const mobileInstructions = document.getElementById("mobile-instructions");
      const desktopInstructions = document.getElementById("instructions");
      const controlsHelp = document.getElementById("controls-help");

      console.log("[InputManager] DOM elements found:", {
        mobileControls: !!mobileControls,
        mobileInstructions: !!mobileInstructions,
        desktopInstructions: !!desktopInstructions,
        controlsHelp: !!controlsHelp,
      });

      if (mobileControls) {
        mobileControls.style.display = "block";
        console.log("[InputManager] Mobile controls enabled");
      } else {
        console.error("[InputManager] mobile-controls element not found!");
      }

      // Show mobile instructions instead of desktop
      if (mobileInstructions) {
        mobileInstructions.style.display = "flex";
      }
      if (desktopInstructions) {
        desktopInstructions.style.display = "none";
      }
      if (controlsHelp) {
        controlsHelp.style.display = "none";
      }

      // Setup joystick touch events
      const joystickContainer = document.getElementById("joystick-container");
      if (joystickContainer) {
        joystickContainer.addEventListener(
          "touchstart",
          this.handleJoystickStart.bind(this),
          { passive: false },
        );
        joystickContainer.addEventListener(
          "touchmove",
          this.handleJoystickMove.bind(this),
          { passive: false },
        );
        joystickContainer.addEventListener(
          "touchend",
          this.handleJoystickEnd.bind(this),
          { passive: false },
        );
        joystickContainer.addEventListener(
          "touchcancel",
          this.handleJoystickEnd.bind(this),
          { passive: false },
        );
      }

      // Setup look area touch events
      const lookArea = document.getElementById("look-area");
      if (lookArea) {
        lookArea.addEventListener(
          "touchstart",
          this.handleLookStart.bind(this),
          {
            passive: false,
          },
        );
        lookArea.addEventListener("touchmove", this.handleLookMove.bind(this), {
          passive: false,
        });
        lookArea.addEventListener("touchend", this.handleLookEnd.bind(this), {
          passive: false,
        });
        lookArea.addEventListener(
          "touchcancel",
          this.handleLookEnd.bind(this),
          {
            passive: false,
          },
        );
      }

      // Setup action buttons
      this.setupMobileButtons();

      // Handle mobile instructions tap to start
      if (mobileInstructions) {
        mobileInstructions.addEventListener("touchstart", (e) => {
          e.preventDefault();
          mobileInstructions.style.display = "none";
          // Simulate pointer lock for mobile
          this.isPointerLocked = true;
          if (this.onPointerLockChange) {
            this.onPointerLockChange(true);
          }
        });
      }
    }, 100); // Small delay to ensure DOM is ready
  }

  /**
   * Setup mobile action buttons
   */
  setupMobileButtons() {
    const jumpBtn = document.getElementById("mobile-jump-btn");
    const runBtn = document.getElementById("mobile-run-btn");
    const actionBtn = document.getElementById("mobile-action-btn");

    // Jump button
    if (jumpBtn) {
      jumpBtn.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("[InputManager] Jump button pressed");
          this.touchJump = true;
          this.keysPressed["Space"] = true;
          this.keys["Space"] = true;
          jumpBtn.classList.add("pressed");
        },
        { passive: false },
      );

      jumpBtn.addEventListener(
        "touchend",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.keys["Space"] = false;
          this.keysPressed["Space"] = false;
          jumpBtn.classList.remove("pressed");
        },
        { passive: false },
      );

      console.log("[InputManager] Jump button configured");
    } else {
      console.error("[InputManager] Jump button not found!");
    }

    // Run button (hold to run)
    if (runBtn) {
      runBtn.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("[InputManager] Run button pressed");
          this.keys["ShiftLeft"] = true;
          this.touchRunning = true;
          runBtn.classList.add("pressed", "held");
        },
        { passive: false },
      );

      runBtn.addEventListener(
        "touchend",
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log("[InputManager] Run button released");
          this.keys["ShiftLeft"] = false;
          this.touchRunning = false;
          runBtn.classList.remove("pressed", "held");
        },
        { passive: false },
      );

      runBtn.addEventListener(
        "touchcancel",
        (e) => {
          console.log("[InputManager] Run button cancelled");
          this.keys["ShiftLeft"] = false;
          this.touchRunning = false;
          runBtn.classList.remove("pressed", "held");
        },
        { passive: false },
      );

      console.log("[InputManager] Run button configured");
    } else {
      console.error("[InputManager] Run button not found!");
    }

    // Action button (interact/door/bicycle)
    if (actionBtn) {
      actionBtn.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          // Trigger all interaction keys
          this.keysPressed["KeyE"] = true;
          this.keysPressed["KeyF"] = true;
          this.keysPressed["KeyG"] = true;
          this.keys["KeyE"] = true;
          this.keys["KeyF"] = true;
          this.keys["KeyG"] = true;
          this.touchAction = true;
          actionBtn.classList.add("pressed");
        },
        { passive: false },
      );

      actionBtn.addEventListener(
        "touchend",
        (e) => {
          e.preventDefault();
          this.keys["KeyE"] = false;
          this.keys["KeyF"] = false;
          this.keys["KeyG"] = false;
          actionBtn.classList.remove("pressed");
        },
        { passive: false },
      );
    }
  }

  /**
   * Handle joystick touch start
   */
  handleJoystickStart(e) {
    e.preventDefault();
    const touch = e.changedTouches[0];
    const joystickBase = document.getElementById("joystick-base");
    const rect = joystickBase.getBoundingClientRect();

    this.joystick.active = true;
    this.joystick.touchId = touch.identifier;
    this.joystick.startX = rect.left + rect.width / 2;
    this.joystick.startY = rect.top + rect.height / 2;
    this.joystick.currentX = touch.clientX;
    this.joystick.currentY = touch.clientY;

    this.updateJoystickVisual();
  }

  /**
   * Handle joystick touch move
   */
  handleJoystickMove(e) {
    e.preventDefault();
    if (!this.joystick.active) return;

    for (const touch of e.changedTouches) {
      if (touch.identifier === this.joystick.touchId) {
        this.joystick.currentX = touch.clientX;
        this.joystick.currentY = touch.clientY;
        this.updateJoystickVisual();
        break;
      }
    }
  }

  /**
   * Handle joystick touch end
   */
  handleJoystickEnd(e) {
    for (const touch of e.changedTouches) {
      if (touch.identifier === this.joystick.touchId) {
        this.joystick.active = false;
        this.joystick.touchId = null;
        this.touchMovement = { x: 0, z: 0 };
        this.resetJoystickVisual();
        break;
      }
    }
  }

  /**
   * Update joystick visual and calculate movement
   */
  updateJoystickVisual() {
    const thumb = document.getElementById("joystick-thumb");
    if (!thumb) return;

    const dx = this.joystick.currentX - this.joystick.startX;
    const dy = this.joystick.currentY - this.joystick.startY;
    const maxDistance = 35; // Max movement radius

    // Clamp to max distance
    const distance = Math.sqrt(dx * dx + dy * dy);
    let clampedX = dx;
    let clampedY = dy;

    if (distance > maxDistance) {
      clampedX = (dx / distance) * maxDistance;
      clampedY = (dy / distance) * maxDistance;
    }

    // Update visual
    thumb.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    thumb.classList.add("active");

    // Calculate normalized movement (inverted Z for forward/back)
    this.touchMovement.x = clampedX / maxDistance; // Left/Right
    this.touchMovement.z = clampedY / maxDistance; // Forward/Back
  }

  /**
   * Reset joystick visual
   */
  resetJoystickVisual() {
    const thumb = document.getElementById("joystick-thumb");
    if (thumb) {
      thumb.style.transform = "translate(0, 0)";
      thumb.classList.remove("active");
    }
  }

  /**
   * Handle look area touch start
   */
  handleLookStart(e) {
    e.preventDefault();
    const touch = e.changedTouches[0];

    this.lookTouch.active = true;
    this.lookTouch.touchId = touch.identifier;
    this.lookTouch.lastX = touch.clientX;
    this.lookTouch.lastY = touch.clientY;

    // If mobile instructions visible, hide them
    const mobileInstructions = document.getElementById("mobile-instructions");
    if (mobileInstructions && mobileInstructions.style.display !== "none") {
      mobileInstructions.style.display = "none";
      this.isPointerLocked = true;
      if (this.onPointerLockChange) {
        this.onPointerLockChange(true);
      }
    }
  }

  /**
   * Handle look area touch move
   */
  handleLookMove(e) {
    e.preventDefault();
    if (!this.lookTouch.active) return;

    for (const touch of e.changedTouches) {
      if (touch.identifier === this.lookTouch.touchId) {
        const sensitivity = 0.5;
        const dx = (touch.clientX - this.lookTouch.lastX) * sensitivity;
        const dy = (touch.clientY - this.lookTouch.lastY) * sensitivity;

        this.touchLook.x = dx;
        this.touchLook.y = dy;

        // Trigger mouse move callback
        if (this.onMouseMove) {
          this.onMouseMove(dx, dy);
        }

        this.lookTouch.lastX = touch.clientX;
        this.lookTouch.lastY = touch.clientY;
        break;
      }
    }
  }

  /**
   * Handle look area touch end
   */
  handleLookEnd(e) {
    for (const touch of e.changedTouches) {
      if (touch.identifier === this.lookTouch.touchId) {
        this.lookTouch.active = false;
        this.lookTouch.touchId = null;
        this.touchLook = { x: 0, y: 0 };
        break;
      }
    }
  }

  /**
   * Update mobile controls visibility
   */
  /**
   * Checks device orientation and shows warning if in portrait mode
   */
  checkOrientation() {
    const orientationWarning = document.getElementById("orientation-warning");
    if (!orientationWarning) return;

    // Check if device is in portrait mode
    const isPortrait = window.innerHeight > window.innerWidth;

    if (this.isMobile && isPortrait) {
      orientationWarning.style.display = "flex";
      console.log(
        "[InputManager] Portrait mode detected - showing orientation warning",
      );
    } else {
      orientationWarning.style.display = "none";
    }
  }

  /**
   * Updates mobile controls visibility based on device type
   */
  updateMobileControlsVisibility() {
    const mobileControls = document.getElementById("mobile-controls");
    const controlsHelp = document.getElementById("controls-help");
    const desktopInstructions = document.getElementById("instructions");

    if (this.isMobile || this.isTouchDevice) {
      if (mobileControls) mobileControls.style.display = "block";
      if (controlsHelp) controlsHelp.style.display = "none";
      if (desktopInstructions) desktopInstructions.style.display = "none";
    } else {
      if (mobileControls) mobileControls.style.display = "none";
      if (controlsHelp) controlsHelp.style.display = "block";
    }
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
   * Generic touch event handlers for canvas
   */
  handleTouchStart(e) {
    e.preventDefault();
  }

  handleTouchMove(e) {
    e.preventDefault();
  }

  handleTouchEnd(e) {
    e.preventDefault();
  }

  /**
   * Handles canvas click - requests pointer lock
   */
  handleClick() {
    // On mobile, simulate pointer lock
    if (this.isMobile) {
      this.isPointerLocked = true;
      if (this.onPointerLockChange) {
        this.onPointerLockChange(true);
      }
      return;
    }

    // Desktop: request actual pointer lock
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

    // Keyboard input
    if (this.isKeyPressed("FORWARD")) z -= 1;
    if (this.isKeyPressed("BACKWARD")) z += 1;
    if (this.isKeyPressed("LEFT")) x += 1;
    if (this.isKeyPressed("RIGHT")) x -= 1;

    // Add touch joystick input
    if (this.joystick.active) {
      // Touch joystick: x is left/right, z is forward/back
      // Invert x for correct left/right direction
      x += -this.touchMovement.x;
      z += this.touchMovement.z;
    }

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
    // Check keyboard or touch run button
    return this.isKeyPressed("RUN") || this.touchRunning;
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
    // Check for touch jump first
    if (this.touchJump) {
      this.touchJump = false; // Consume the jump
      return true;
    }

    // Check keyboard
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
    this.touchJump = false;
    this.touchAction = false;
  }

  /**
   * Check if running on mobile device
   */
  isMobileDevice() {
    return this.isMobile;
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
      this.handlePointerLockChange,
    );
    this.canvas.removeEventListener("click", this.handleClick);

    // Clean up mobile controls
    const joystickContainer = document.getElementById("joystick-container");
    if (joystickContainer) {
      joystickContainer.removeEventListener(
        "touchstart",
        this.handleJoystickStart,
      );
      joystickContainer.removeEventListener(
        "touchmove",
        this.handleJoystickMove,
      );
      joystickContainer.removeEventListener("touchend", this.handleJoystickEnd);
    }

    const lookArea = document.getElementById("look-area");
    if (lookArea) {
      lookArea.removeEventListener("touchstart", this.handleLookStart);
      lookArea.removeEventListener("touchmove", this.handleLookMove);
      lookArea.removeEventListener("touchend", this.handleLookEnd);
    }
  }
}
