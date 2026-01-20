/**
 * GraphicsManager Class
 * Central manager for all graphics systems
 * Coordinates post-processing, lighting, atmosphere, and visual state changes
 */

import * as THREE from "three";
import { PostProcessing } from "./PostProcessing.js";
import { AtmosphereSystem } from "./AtmosphereSystem.js";
import { LightingSystem } from "./LightingSystem.js";
import { AudioSystem } from "./AudioSystem.js";
import { getMaterialFactory } from "./MaterialFactory.js";

export class GraphicsManager {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    // Graphics subsystems
    this.postProcessing = null;
    this.atmosphereSystem = null;
    this.lightingSystem = null;
    this.audioSystem = null;
    this.materialFactory = null;

    // Current state
    this.isUpsideDown = false;
    this.isInitialized = false;
    this.time = 0;

    // Quality settings
    this.qualitySettings = {
      high: {
        shadowMapSize: 2048,
        bloomEnabled: true,
        dofEnabled: true,
        particleCount: 1500,
        shadowsEnabled: true,
      },
      medium: {
        shadowMapSize: 1024,
        bloomEnabled: true,
        dofEnabled: false,
        particleCount: 800,
        shadowsEnabled: true,
      },
      low: {
        shadowMapSize: 512,
        bloomEnabled: false,
        dofEnabled: false,
        particleCount: 300,
        shadowsEnabled: false,
      },
    };

    this.currentQuality = "medium";
  }

  /**
   * Initialize all graphics systems
   */
  async init() {
    console.log("[GraphicsManager] Initializing cinematic graphics...");

    // Configure renderer for realistic rendering
    this.configureRenderer();

    // Initialize material factory
    this.materialFactory = getMaterialFactory();

    // Initialize lighting system
    this.lightingSystem = new LightingSystem(this.scene);

    // Initialize atmosphere system
    this.atmosphereSystem = new AtmosphereSystem(this.scene);

    // Initialize post-processing
    try {
      this.postProcessing = new PostProcessing(
        this.renderer,
        this.scene,
        this.camera.getCamera()
      );
    } catch (error) {
      console.warn(
        "[GraphicsManager] Post-processing initialization failed:",
        error
      );
      // Fall back to standard rendering
      this.postProcessing = null;
    }

    // Initialize audio system
    this.audioSystem = new AudioSystem();

    this.isInitialized = true;
    console.log("[GraphicsManager] Cinematic graphics initialized");
  }

  /**
   * Configure renderer for realistic output
   */
  configureRenderer() {
    // Enable shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Set output color space
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Enable tone mapping for HDR-like rendering
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Set pixel ratio (limit for performance)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Set clear color
    this.renderer.setClearColor(0x000000, 1);

    console.log("[GraphicsManager] Renderer configured for cinematic output");
  }

  /**
   * Update all graphics systems
   */
  update(deltaTime, playerPosition = null) {
    this.time += deltaTime;

    // Update lighting (flicker effects, moonlight position)
    if (this.lightingSystem) {
      this.lightingSystem.update(deltaTime, this.time);

      if (playerPosition) {
        this.lightingSystem.updateMoonlightPosition(playerPosition);
      }
    }

    // Update atmosphere (particles, fog)
    if (this.atmosphereSystem && playerPosition) {
      this.atmosphereSystem.update(deltaTime, playerPosition);
    }

    // Update post-processing
    if (this.postProcessing) {
      this.postProcessing.update(deltaTime);
    }
  }

  /**
   * Render the scene with post-processing
   */
  render() {
    if (this.postProcessing) {
      this.postProcessing.render();
    } else {
      this.renderer.render(this.scene, this.camera.getCamera());
    }
  }

  /**
   * Switch between Normal and Upside Down states
   */
  setWorldState(state) {
    const isUpsideDown = state === "upsideDown";

    if (this.isUpsideDown === isUpsideDown) return;

    this.isUpsideDown = isUpsideDown;

    console.log(`[GraphicsManager] Switching to ${state} state`);

    // Update lighting preset
    if (this.lightingSystem) {
      this.lightingSystem.setPreset(isUpsideDown ? "upsideDown" : "normal");
    }

    // Update atmosphere
    if (this.atmosphereSystem) {
      this.atmosphereSystem.setUpsideDown(isUpsideDown);
    }

    // Update post-processing
    if (this.postProcessing) {
      this.postProcessing.setUpsideDown(isUpsideDown);
    }

    // Update materials
    if (this.materialFactory) {
      this.materialFactory.setUpsideDown(isUpsideDown);
    }

    // Update audio
    if (this.audioSystem) {
      this.audioSystem.setUpsideDown(isUpsideDown);
    }

    // Adjust renderer settings
    if (isUpsideDown) {
      this.renderer.toneMappingExposure = 0.6;
    } else {
      this.renderer.toneMappingExposure = 1.0;
    }
  }

  /**
   * Set quality preset
   */
  setQuality(quality) {
    if (!this.qualitySettings[quality]) return;

    this.currentQuality = quality;
    const settings = this.qualitySettings[quality];

    // Update shadow map size
    if (this.lightingSystem && this.lightingSystem.moonLight) {
      this.lightingSystem.moonLight.shadow.mapSize.width =
        settings.shadowMapSize;
      this.lightingSystem.moonLight.shadow.mapSize.height =
        settings.shadowMapSize;
    }

    // Update post-processing
    if (this.postProcessing) {
      this.postProcessing.setBloomEnabled(settings.bloomEnabled);
      this.postProcessing.setDOFEnabled(settings.dofEnabled);
    }

    // Update shadows
    this.renderer.shadowMap.enabled = settings.shadowsEnabled;

    console.log(`[GraphicsManager] Quality set to ${quality}`);
  }

  /**
   * Initialize audio (must be called after user interaction)
   */
  async initAudio() {
    if (this.audioSystem) {
      await this.audioSystem.init();
      this.audioSystem.playAmbient("normal");
    }
  }

  /**
   * Resume audio (for pointer lock regain)
   */
  resumeAudio() {
    if (this.audioSystem) {
      this.audioSystem.resume();
    }
  }

  /**
   * Handle window resize
   */
  handleResize(width, height) {
    if (this.postProcessing) {
      this.postProcessing.handleResize(width, height);
    }
  }

  /**
   * Create a street lamp with light
   */
  createStreetLampLight(position) {
    if (this.lightingSystem) {
      return this.lightingSystem.createStreetLamp(position);
    }
    return null;
  }

  /**
   * Create a portal light
   */
  createPortalLight(position) {
    if (this.lightingSystem) {
      return this.lightingSystem.createPortalLight(position);
    }
    return null;
  }

  /**
   * Get material factory
   */
  getMaterials() {
    return this.materialFactory;
  }

  /**
   * Trigger camera shake
   */
  triggerShake(intensity = 0.1, duration = 0.3) {
    if (this.camera && this.camera.shake) {
      this.camera.shake(intensity, duration);
    }
  }

  /**
   * Dispose all graphics resources
   */
  dispose() {
    if (this.postProcessing) {
      this.postProcessing.dispose();
    }

    if (this.atmosphereSystem) {
      this.atmosphereSystem.dispose();
    }

    if (this.lightingSystem) {
      this.lightingSystem.dispose();
    }

    if (this.audioSystem) {
      this.audioSystem.dispose();
    }

    if (this.materialFactory) {
      this.materialFactory.dispose();
    }
  }
}
