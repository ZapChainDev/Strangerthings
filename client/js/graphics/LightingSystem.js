/**
 * LightingSystem Class
 * Manages all lighting for realistic PBR rendering
 * Handles moonlight, ambient, point lights, and shadows
 */

import * as THREE from "three";

export class LightingSystem {
  constructor(scene) {
    this.scene = scene;

    // Light references
    this.moonLight = null;
    this.ambientLight = null;
    this.hemisphereLight = null;
    this.pointLights = [];
    this.spotLights = [];

    // Shadow settings
    this.shadowMapSize = 1024;
    this.shadowDistance = 50;

    // Lighting presets
    this.presets = {
      normal: {
        // Moonlit night - cool blue tones
        moon: {
          color: 0x8899cc,
          intensity: 0.6,
          position: { x: 100, y: 150, z: -50 },
        },
        ambient: {
          color: 0x1a2030,
          intensity: 0.3,
        },
        hemisphere: {
          skyColor: 0x1a1a30,
          groundColor: 0x0a0a15,
          intensity: 0.4,
        },
        streetLamp: {
          color: 0xffcc66,
          intensity: 2.5,
          distance: 25,
          decay: 1.5,
        },
      },
      upsideDown: {
        // Same lighting as normal - only sky/effects differ
        moon: {
          color: 0x8899cc,
          intensity: 0.6,
          position: { x: 100, y: 150, z: -50 },
        },
        ambient: {
          color: 0x1a2030,
          intensity: 0.3,
        },
        hemisphere: {
          skyColor: 0x1a1a30,
          groundColor: 0x0a0a15,
          intensity: 0.4,
        },
        streetLamp: {
          color: 0xffcc66,
          intensity: 2.5,
          distance: 25,
          decay: 1.5,
        },
      },
    };

    this.currentPreset = "normal";
    this.init();
  }

  /**
   * Initialize lighting system
   */
  init() {
    const preset = this.presets.normal;

    // Create moonlight (directional light with shadows)
    this.createMoonlight(preset.moon);

    // Create ambient fill light
    this.createAmbientLight(preset.ambient);

    // Create hemisphere light for natural sky/ground lighting
    this.createHemisphereLight(preset.hemisphere);

    console.log(
      "[LightingSystem] Initialized with moonlight and ambient lighting"
    );
  }

  /**
   * Create moonlight directional light
   */
  createMoonlight(settings) {
    this.moonLight = new THREE.DirectionalLight(
      settings.color,
      settings.intensity
    );
    this.moonLight.position.set(
      settings.position.x,
      settings.position.y,
      settings.position.z
    );
    this.moonLight.castShadow = true;

    // Shadow camera setup for large area
    this.moonLight.shadow.mapSize.width = this.shadowMapSize;
    this.moonLight.shadow.mapSize.height = this.shadowMapSize;
    this.moonLight.shadow.camera.near = 0.5;
    this.moonLight.shadow.camera.far = 300;
    this.moonLight.shadow.camera.left = -this.shadowDistance;
    this.moonLight.shadow.camera.right = this.shadowDistance;
    this.moonLight.shadow.camera.top = this.shadowDistance;
    this.moonLight.shadow.camera.bottom = -this.shadowDistance;
    this.moonLight.shadow.bias = -0.001;
    this.moonLight.shadow.normalBias = 0.02;

    // Soft shadows
    this.moonLight.shadow.radius = 2;

    this.scene.add(this.moonLight);

    // Add target for directional light
    const target = new THREE.Object3D();
    target.position.set(0, 0, 0);
    this.scene.add(target);
    this.moonLight.target = target;
  }

  /**
   * Create ambient fill light
   */
  createAmbientLight(settings) {
    this.ambientLight = new THREE.AmbientLight(
      settings.color,
      settings.intensity
    );
    this.scene.add(this.ambientLight);
  }

  /**
   * Create hemisphere light for natural outdoor lighting
   */
  createHemisphereLight(settings) {
    this.hemisphereLight = new THREE.HemisphereLight(
      settings.skyColor,
      settings.groundColor,
      settings.intensity
    );
    this.hemisphereLight.position.set(0, 50, 0);
    this.scene.add(this.hemisphereLight);
  }

  /**
   * Create a street lamp point light
   */
  createStreetLamp(position) {
    const preset = this.presets[this.currentPreset];
    const settings = preset.streetLamp;

    const light = new THREE.PointLight(
      settings.color,
      settings.intensity,
      settings.distance,
      settings.decay
    );
    light.position.set(position.x, position.y, position.z);
    light.castShadow = false; // Too expensive for many street lamps

    // Store reference
    light.userData.isStreetLamp = true;
    this.pointLights.push(light);
    this.scene.add(light);

    return light;
  }

  /**
   * Create a spotlight (for dramatic lighting)
   */
  createSpotlight(position, target, color = 0xffffff, intensity = 2) {
    const spotlight = new THREE.SpotLight(
      color,
      intensity,
      30,
      Math.PI / 6,
      0.5,
      1
    );
    spotlight.position.set(position.x, position.y, position.z);

    if (target) {
      const targetObj = new THREE.Object3D();
      targetObj.position.set(target.x, target.y, target.z);
      this.scene.add(targetObj);
      spotlight.target = targetObj;
    }

    spotlight.castShadow = true;
    spotlight.shadow.mapSize.width = 512;
    spotlight.shadow.mapSize.height = 512;
    spotlight.shadow.camera.near = 0.5;
    spotlight.shadow.camera.far = 30;

    this.spotLights.push(spotlight);
    this.scene.add(spotlight);

    return spotlight;
  }

  /**
   * Create portal glow light
   */
  createPortalLight(position, color = 0xff0000) {
    const light = new THREE.PointLight(color, 3, 12, 1);
    light.position.set(position.x, position.y + 0.5, position.z);
    light.userData.isPortalLight = true;
    this.pointLights.push(light);
    this.scene.add(light);
    return light;
  }

  /**
   * Update moonlight to follow player (for consistent shadows)
   */
  updateMoonlightPosition(playerPosition) {
    if (this.moonLight && playerPosition) {
      const preset = this.presets[this.currentPreset];
      this.moonLight.position.set(
        playerPosition.x + preset.moon.position.x,
        preset.moon.position.y,
        playerPosition.z + preset.moon.position.z
      );
      this.moonLight.target.position.set(playerPosition.x, 0, playerPosition.z);
    }
  }

  /**
   * Switch lighting preset (normal/upsideDown)
   */
  setPreset(presetName) {
    if (!this.presets[presetName]) return;

    this.currentPreset = presetName;
    const preset = this.presets[presetName];

    // Update moonlight
    if (this.moonLight) {
      this.moonLight.color.setHex(preset.moon.color);
      this.moonLight.intensity = preset.moon.intensity;
    }

    // Update ambient
    if (this.ambientLight) {
      this.ambientLight.color.setHex(preset.ambient.color);
      this.ambientLight.intensity = preset.ambient.intensity;
    }

    // Update hemisphere
    if (this.hemisphereLight) {
      this.hemisphereLight.color.setHex(preset.hemisphere.skyColor);
      this.hemisphereLight.groundColor.setHex(preset.hemisphere.groundColor);
      this.hemisphereLight.intensity = preset.hemisphere.intensity;
    }

    // Update street lamps
    this.pointLights.forEach((light) => {
      if (light.userData.isStreetLamp) {
        light.color.setHex(preset.streetLamp.color);
        light.intensity = preset.streetLamp.intensity;
        light.distance = preset.streetLamp.distance;
        light.decay = preset.streetLamp.decay;
      }
    });

    console.log(`[LightingSystem] Switched to ${presetName} preset`);
  }

  /**
   * Animate lights (pulsing, flickering)
   */
  update(deltaTime, time) {
    // Flicker street lamps slightly
    this.pointLights.forEach((light, index) => {
      if (light.userData.isStreetLamp) {
        const preset = this.presets[this.currentPreset];
        const baseIntensity = preset.streetLamp.intensity;
        const flicker =
          Math.sin(time * 10 + index) * 0.1 +
          Math.sin(time * 23 + index * 3) * 0.05;
        light.intensity = baseIntensity + flicker;
      }

      // Pulse portal lights
      if (light.userData.isPortalLight) {
        const pulse = Math.sin(time * 3) * 0.5 + 1;
        light.intensity = 2 + pulse;
      }
    });
  }

  /**
   * Dispose all lights
   */
  dispose() {
    if (this.moonLight) this.scene.remove(this.moonLight);
    if (this.ambientLight) this.scene.remove(this.ambientLight);
    if (this.hemisphereLight) this.scene.remove(this.hemisphereLight);

    this.pointLights.forEach((light) => this.scene.remove(light));
    this.spotLights.forEach((light) => this.scene.remove(light));

    this.pointLights = [];
    this.spotLights = [];
  }
}
