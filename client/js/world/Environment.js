/**
 * Environment Class
 * Manages lighting, fog, and atmospheric effects
 * Handles transitions between Normal and Upside Down states
 */

import * as THREE from "three";
import { WORLD_STATES } from "../utils/constants.js";

export class Environment {
  constructor(scene) {
    this.scene = scene;

    // Lighting
    this.ambientLight = null;
    this.moonLight = null;

    // Fog
    this.fog = null;

    // Particle effects (optional atmospheric particles)
    this.particles = null;

    // Time for animated effects
    this.time = 0;
  }

  /**
   * Initializes environment with given world state
   */
  init(state) {
    console.log("[Environment] Initializing...");

    // Set background/sky color
    this.scene.background = new THREE.Color(state.skyColor);

    // Create ambient light
    this.ambientLight = new THREE.AmbientLight(
      state.ambientColor,
      state.ambientIntensity
    );
    this.scene.add(this.ambientLight);

    // Create directional "moon" light
    this.moonLight = new THREE.DirectionalLight(
      state.moonColor,
      state.moonIntensity
    );
    this.moonLight.position.set(50, 100, 50);
    this.moonLight.castShadow = false; // Disabled for performance
    this.scene.add(this.moonLight);

    // Create fog
    this.fog = new THREE.Fog(state.fogColor, state.fogNear, state.fogFar);
    this.scene.fog = this.fog;

    // Create starfield
    this.createStars();

    // Create atmospheric particles
    this.createParticles();

    // Create moon in sky
    this.createMoon();

    // Add hemisphere light for better ground illumination
    this.hemiLight = new THREE.HemisphereLight(0x8888cc, 0x444422, 0.4);
    this.scene.add(this.hemiLight);

    console.log("[Environment] Ready");
  }

  /**
   * Creates a starfield in the sky
   */
  createStars() {
    const starCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Position stars on a large sphere around the scene
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.5 + 0.3); // Only upper hemisphere
      const radius = 400 + Math.random() * 100;

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      // Slightly varied star colors (white to slight blue/yellow)
      const colorVar = 0.9 + Math.random() * 0.1;
      colors[i * 3] = colorVar;
      colors[i * 3 + 1] = colorVar;
      colors[i * 3 + 2] = 0.9 + Math.random() * 0.1;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      fog: false,
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  /**
   * Creates floating particle effect (dust/spores)
   */
  createParticles() {
    const particleCount = 500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 30;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x888888,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
      fog: true,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  /**
   * Creates a simple moon in the sky
   */
  createMoon() {
    // Larger, brighter moon
    const moonGeometry = new THREE.SphereGeometry(8, 24, 24);
    const moonMaterial = new THREE.MeshBasicMaterial({
      color: 0xeeeedd,
      fog: false,
    });

    this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
    this.moon.position.set(150, 120, -150);
    this.scene.add(this.moon);

    // Moon glow - larger and brighter
    const glowGeometry = new THREE.SphereGeometry(12, 24, 24);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffee,
      transparent: true,
      opacity: 0.25,
      fog: false,
    });

    this.moonGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.moonGlow.position.copy(this.moon.position);
    this.scene.add(this.moonGlow);

    // Outer glow for extra effect
    const outerGlowGeometry = new THREE.SphereGeometry(18, 24, 24);
    const outerGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xaabbcc,
      transparent: true,
      opacity: 0.1,
      fog: false,
    });

    this.moonOuterGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
    this.moonOuterGlow.position.copy(this.moon.position);
    this.scene.add(this.moonOuterGlow);
  }

  /**
   * Interpolates between two world states
   */
  lerp(fromState, toState, t) {
    // Interpolate ambient light
    const ambientColor = this.lerpColor(
      fromState.ambientColor,
      toState.ambientColor,
      t
    );
    this.ambientLight.color.setHex(ambientColor);
    this.ambientLight.intensity =
      fromState.ambientIntensity +
      (toState.ambientIntensity - fromState.ambientIntensity) * t;

    // Interpolate moon light
    const moonColor = this.lerpColor(fromState.moonColor, toState.moonColor, t);
    this.moonLight.color.setHex(moonColor);
    this.moonLight.intensity =
      fromState.moonIntensity +
      (toState.moonIntensity - fromState.moonIntensity) * t;

    // Interpolate fog
    const fogColor = this.lerpColor(fromState.fogColor, toState.fogColor, t);
    this.fog.color.setHex(fogColor);
    this.fog.near =
      fromState.fogNear + (toState.fogNear - fromState.fogNear) * t;
    this.fog.far = fromState.fogFar + (toState.fogFar - fromState.fogFar) * t;
  }

  /**
   * Applies a world state immediately
   */
  apply(state) {
    this.ambientLight.color.setHex(state.ambientColor);
    this.ambientLight.intensity = state.ambientIntensity;

    this.moonLight.color.setHex(state.moonColor);
    this.moonLight.intensity = state.moonIntensity;

    this.fog.color.setHex(state.fogColor);
    this.fog.near = state.fogNear;
    this.fog.far = state.fogFar;

    this.scene.background = new THREE.Color(state.skyColor);

    // Update moon appearance for Upside Down
    if (state === WORLD_STATES.upsideDown) {
      this.moon.material.color.setHex(0x553333);
      this.moonGlow.material.color.setHex(0x331111);
    } else {
      this.moon.material.color.setHex(0xccccaa);
      this.moonGlow.material.color.setHex(0xffffee);
    }
  }

  /**
   * Linear interpolation between two colors
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
   * Updates animated environment effects
   */
  update(deltaTime) {
    this.time += deltaTime;

    // Animate particles
    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;

      for (let i = 0; i < positions.length; i += 3) {
        // Slow upward drift
        positions[i + 1] += deltaTime * 0.5;

        // Reset particles that go too high
        if (positions[i + 1] > 30) {
          positions[i + 1] = 0;
        }

        // Gentle horizontal sway
        positions[i] += Math.sin(this.time + i) * deltaTime * 0.1;
      }

      this.particles.geometry.attributes.position.needsUpdate = true;
    }

    // Subtle moon glow pulsing
    if (this.moonGlow) {
      const pulse = 0.15 + Math.sin(this.time * 0.5) * 0.05;
      this.moonGlow.material.opacity = pulse;
    }
  }

  /**
   * Updates particle system to follow player
   */
  updateParticleCenter(position) {
    if (this.particles) {
      this.particles.position.x = position.x;
      this.particles.position.z = position.z;
    }
  }
}
