/**
 * AtmosphereSystem Class
 * Handles fog, particles, and atmospheric effects
 * Creates the moody, mysterious Stranger Things atmosphere
 */

import * as THREE from "three";

export class AtmosphereSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = null;
    this.dustParticles = null;
    this.ashParticles = null;
    this.mistParticles = null;
    this.time = 0;

    // Particle settings
    this.particleCount = 1500;
    this.dustCount = 800;
    this.ashCount = 500;

    // Current state
    this.isUpsideDown = false;

    // Fog settings for different states
    this.fogSettings = {
      normal: {
        color: 0x0a0a15,
        near: 30,
        far: 180,
        density: 0.008,
      },
      upsideDown: {
        color: 0x0a0a15,
        near: 30,
        far: 180,
        density: 0.008,
      },
    };

    this.init();
  }

  /**
   * Initialize atmosphere effects
   */
  init() {
    this.createFog();
    // Particles disabled - uncomment to enable
    // this.createMistParticles();
    // this.createDustParticles();
    console.log("[AtmosphereSystem] Initialized with fog");
  }

  /**
   * Create volumetric-looking fog
   */
  createFog() {
    const settings = this.fogSettings.normal;
    // Use exponential fog for more realistic depth
    this.scene.fog = new THREE.FogExp2(settings.color, settings.density);
  }

  /**
   * Create floating mist/dust particles in the air
   */
  createMistParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const sizes = new Float32Array(this.particleCount);
    const velocities = [];

    // Spread particles in a large area around origin
    const spread = 200;

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = Math.random() * 30; // Height
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;

      sizes[i] = Math.random() * 2 + 0.5;

      velocities.push({
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.01,
        z: (Math.random() - 0.5) * 0.02,
        phase: Math.random() * Math.PI * 2,
      });
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // Custom shader material for soft particles
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xccccdd) },
        uOpacity: { value: 0.15 },
        uSize: { value: 30.0 },
      },
      vertexShader: `
        attribute float size;
        uniform float uTime;
        uniform float uSize;
        varying float vAlpha;
        
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          // Size attenuation
          gl_PointSize = size * uSize * (300.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 50.0);
          
          // Fade based on distance
          float dist = length(mvPosition.xyz);
          vAlpha = smoothstep(150.0, 20.0, dist);
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vAlpha;
        
        void main() {
          // Soft circular particle
          float dist = length(gl_PointCoord - 0.5);
          if (dist > 0.5) discard;
          
          float alpha = smoothstep(0.5, 0.0, dist) * uOpacity * vAlpha;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.mistParticles = new THREE.Points(geometry, material);
    this.mistParticles.userData.velocities = velocities;
    this.scene.add(this.mistParticles);
  }

  /**
   * Create dust particles near ground level
   */
  createDustParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.dustCount * 3);
    const sizes = new Float32Array(this.dustCount);

    const spread = 100;

    for (let i = 0; i < this.dustCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = Math.random() * 5; // Close to ground
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;

      sizes[i] = Math.random() * 0.8 + 0.2;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0x888888,
      size: 0.3,
      transparent: true,
      opacity: 0.2,
      sizeAttenuation: true,
      blending: THREE.NormalBlending,
    });

    this.dustParticles = new THREE.Points(geometry, material);
    this.scene.add(this.dustParticles);
  }

  /**
   * Create falling ash particles (for Upside Down)
   */
  createAshParticles() {
    if (this.ashParticles) return;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.ashCount * 3);
    const velocities = [];

    const spread = 150;

    for (let i = 0; i < this.ashCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = Math.random() * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;

      velocities.push({
        fallSpeed: Math.random() * 0.3 + 0.1,
        swaySpeed: Math.random() * 2 + 1,
        swayAmount: Math.random() * 0.5 + 0.2,
        phase: Math.random() * Math.PI * 2,
      });
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x444444,
      size: 0.4,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });

    this.ashParticles = new THREE.Points(geometry, material);
    this.ashParticles.userData.velocities = velocities;
    this.scene.add(this.ashParticles);
  }

  /**
   * Remove ash particles
   */
  removeAshParticles() {
    if (this.ashParticles) {
      this.scene.remove(this.ashParticles);
      this.ashParticles.geometry.dispose();
      this.ashParticles.material.dispose();
      this.ashParticles = null;
    }
  }

  /**
   * Update particles around player position
   */
  update(deltaTime, playerPosition) {
    this.time += deltaTime;

    // Update mist particles
    if (this.mistParticles && playerPosition) {
      const positions = this.mistParticles.geometry.attributes.position.array;
      const velocities = this.mistParticles.userData.velocities;

      for (let i = 0; i < this.particleCount; i++) {
        const i3 = i * 3;
        const vel = velocities[i];

        // Gentle floating motion
        positions[i3] += Math.sin(this.time + vel.phase) * vel.x;
        positions[i3 + 1] += Math.sin(this.time * 0.5 + vel.phase) * 0.005;
        positions[i3 + 2] += Math.cos(this.time + vel.phase) * vel.z;

        // Keep particles near player
        const dx = positions[i3] - playerPosition.x;
        const dz = positions[i3 + 2] - playerPosition.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 100) {
          // Reset particle near player
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 80 + 20;
          positions[i3] = playerPosition.x + Math.cos(angle) * radius;
          positions[i3 + 2] = playerPosition.z + Math.sin(angle) * radius;
          positions[i3 + 1] = Math.random() * 30;
        }
      }

      this.mistParticles.geometry.attributes.position.needsUpdate = true;
      this.mistParticles.material.uniforms.uTime.value = this.time;
    }

    // Update dust particles
    if (this.dustParticles && playerPosition) {
      const positions = this.dustParticles.geometry.attributes.position.array;

      for (let i = 0; i < this.dustCount; i++) {
        const i3 = i * 3;

        // Gentle drift
        positions[i3] += Math.sin(this.time * 0.3 + i) * 0.01;
        positions[i3 + 1] += Math.sin(this.time * 0.5 + i * 0.5) * 0.005;
        positions[i3 + 2] += Math.cos(this.time * 0.3 + i) * 0.01;

        // Keep near player
        const dx = positions[i3] - playerPosition.x;
        const dz = positions[i3 + 2] - playerPosition.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 50) {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 40 + 10;
          positions[i3] = playerPosition.x + Math.cos(angle) * radius;
          positions[i3 + 2] = playerPosition.z + Math.sin(angle) * radius;
          positions[i3 + 1] = Math.random() * 5;
        }
      }

      this.dustParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Update ash particles (Upside Down only)
    if (this.ashParticles && playerPosition) {
      const positions = this.ashParticles.geometry.attributes.position.array;
      const velocities = this.ashParticles.userData.velocities;

      for (let i = 0; i < this.ashCount; i++) {
        const i3 = i * 3;
        const vel = velocities[i];

        // Fall down with sway
        positions[i3 + 1] -= vel.fallSpeed * deltaTime * 10;
        positions[i3] +=
          Math.sin(this.time * vel.swaySpeed + vel.phase) *
          vel.swayAmount *
          deltaTime;
        positions[i3 + 2] +=
          Math.cos(this.time * vel.swaySpeed + vel.phase) *
          vel.swayAmount *
          deltaTime;

        // Reset if too low
        if (positions[i3 + 1] < 0) {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 100 + 20;
          positions[i3] = playerPosition.x + Math.cos(angle) * radius;
          positions[i3 + 2] = playerPosition.z + Math.sin(angle) * radius;
          positions[i3 + 1] = 30 + Math.random() * 10;
        }

        // Keep near player
        const dx = positions[i3] - playerPosition.x;
        const dz = positions[i3 + 2] - playerPosition.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist > 80) {
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 60 + 20;
          positions[i3] = playerPosition.x + Math.cos(angle) * radius;
          positions[i3 + 2] = playerPosition.z + Math.sin(angle) * radius;
        }
      }

      this.ashParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  /**
   * Switch to Upside Down atmosphere
   */
  setUpsideDown(isUpsideDown) {
    this.isUpsideDown = isUpsideDown;

    if (isUpsideDown) {
      // Dark, dense fog with red tint
      const settings = this.fogSettings.upsideDown;
      this.scene.fog = new THREE.FogExp2(settings.color, settings.density);

      // Change mist color to darker
      if (this.mistParticles) {
        this.mistParticles.material.uniforms.uColor.value.setHex(0x553333);
        this.mistParticles.material.uniforms.uOpacity.value = 0.25;
      }

      // Darker dust
      if (this.dustParticles) {
        this.dustParticles.material.color.setHex(0x443333);
        this.dustParticles.material.opacity = 0.3;
      }

      // Add falling ash
      this.createAshParticles();
    } else {
      // Normal fog
      const settings = this.fogSettings.normal;
      this.scene.fog = new THREE.FogExp2(settings.color, settings.density);

      // Normal mist
      if (this.mistParticles) {
        this.mistParticles.material.uniforms.uColor.value.setHex(0xccccdd);
        this.mistParticles.material.uniforms.uOpacity.value = 0.15;
      }

      // Normal dust
      if (this.dustParticles) {
        this.dustParticles.material.color.setHex(0x888888);
        this.dustParticles.material.opacity = 0.2;
      }

      // Remove ash
      this.removeAshParticles();
    }
  }

  /**
   * Dispose all resources
   */
  dispose() {
    if (this.mistParticles) {
      this.scene.remove(this.mistParticles);
      this.mistParticles.geometry.dispose();
      this.mistParticles.material.dispose();
    }

    if (this.dustParticles) {
      this.scene.remove(this.dustParticles);
      this.dustParticles.geometry.dispose();
      this.dustParticles.material.dispose();
    }

    this.removeAshParticles();
  }
}
