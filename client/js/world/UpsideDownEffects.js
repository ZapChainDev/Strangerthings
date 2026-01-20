/**
 * UpsideDownEffects Class
 * Creates horror elements for the Upside Down world
 * Includes organic vessels/vines, flickering lights, and eerie particles
 */

import * as THREE from "three";

export class UpsideDownEffects {
  constructor(scene) {
    this.scene = scene;
    this.vessels = [];
    this.spores = null;
    this.eerieGlows = [];
    this.clouds = []; // Add clouds
    this.lightning = []; // Add lightning
    this.lightningTimer = 0;
    this.time = 0;
    this.active = false;
    this.buildingPositions = []; // Store building positions for vessel placement
  }

  /**
   * Activates Upside Down effects
   */
  activate(buildingPositions = []) {
    if (this.active) return;
    this.active = true;

    this.buildingPositions = buildingPositions;
    this.createVessels();
    this.createSpores();
    this.createEerieGlows();
    this.createGroundTendrils();
    this.createClouds(); // Add clouds

    console.log("[UpsideDownEffects] Activated");
  }

  /**
   * Deactivates and removes all effects
   */
  deactivate() {
    if (!this.active) return;
    this.active = false;

    // Remove vessels
    this.vessels.forEach((vessel) => {
      this.scene.remove(vessel);
      if (vessel.geometry) vessel.geometry.dispose();
      if (vessel.material) vessel.material.dispose();
    });
    this.vessels = [];

    // Remove spores
    if (this.spores) {
      this.scene.remove(this.spores);
      this.spores.geometry.dispose();
      this.spores.material.dispose();
      this.spores = null;
    }

    // Remove eerie glows
    this.eerieGlows.forEach((glow) => {
      this.scene.remove(glow.light);
      this.scene.remove(glow.mesh);
    });
    this.eerieGlows = [];

    // Remove tendrils
    if (this.tendrils) {
      this.tendrils.forEach((tendril) => {
        this.scene.remove(tendril);
      });
      this.tendrils = [];
    }

    // Remove clouds
    this.clouds.forEach((cloud) => {
      this.scene.remove(cloud);
      if (cloud.geometry) cloud.geometry.dispose();
      if (cloud.material) cloud.material.dispose();
    });
    this.clouds = [];

    // Remove lightning
    this.lightning.forEach((bolt) => {
      this.scene.remove(bolt);
      if (bolt.userData.strikeLight) {
        this.scene.remove(bolt.userData.strikeLight);
      }
      if (bolt.geometry) bolt.geometry.dispose();
      if (bolt.material) bolt.material.dispose();
    });
    this.lightning = [];

    console.log("[UpsideDownEffects] Deactivated");
  }

  /**
   * Creates organic black vessels that crawl along surfaces
   * Like the vines/tendrils from Stranger Things
   */
  createVessels() {
    const vesselMaterial = new THREE.MeshBasicMaterial({
      color: 0x0a0505,
      transparent: true,
      opacity: 0.9,
    });

    // Create vessels spreading across the ground
    for (let i = 0; i < 50; i++) {
      const vessel = this.createVesselMesh(vesselMaterial);

      // Random position
      vessel.position.set(
        (Math.random() - 0.5) * 200,
        0.1,
        (Math.random() - 0.5) * 200
      );

      vessel.rotation.y = Math.random() * Math.PI * 2;

      this.scene.add(vessel);
      this.vessels.push(vessel);
    }

    // Create vessels on buildings
    this.buildingPositions.forEach((building) => {
      // Multiple vessels per building
      for (let i = 0; i < 2; i++) {
        const vessel = this.createVerticalVessel(vesselMaterial);
        vessel.position.set(
          building.x + (Math.random() - 0.5) * building.width,
          0,
          building.z + (Math.random() - 0.5) * building.depth
        );
        this.scene.add(vessel);
        this.vessels.push(vessel);

        // Add crawling vessels on building sides
        const sideVessel = this.createVesselMesh(vesselMaterial);
        sideVessel.position.set(building.x, building.height * 0.3, building.z);
        sideVessel.rotation.x = Math.PI / 2;
        this.scene.add(sideVessel);
        this.vessels.push(sideVessel);
      }
    });

    // Create vertical vessels climbing up (general scattered placement)
    for (let i = 0; i < 30; i++) {
      const vessel = this.createVerticalVessel(vesselMaterial);

      vessel.position.set(
        (Math.random() - 0.5) * 150,
        0,
        (Math.random() - 0.5) * 150
      );

      this.scene.add(vessel);
      this.vessels.push(vessel);
    }
  }

  /**
   * Creates a single organic vessel mesh (ground crawling)
   */
  createVesselMesh(material) {
    const group = new THREE.Group();

    // Main tendril - using tube geometry for organic look
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(2, 0.2, 1),
      new THREE.Vector3(5, 0.1, -0.5),
      new THREE.Vector3(8, 0.3, 1),
      new THREE.Vector3(12, 0.1, 0),
    ]);

    const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.15, 8, false);
    const mainTendril = new THREE.Mesh(tubeGeometry, material);
    group.add(mainTendril);

    // Add smaller branching tendrils
    for (let i = 0; i < 3; i++) {
      const branchCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(3 + i * 3, 0.15, 0),
        new THREE.Vector3(3.5 + i * 3, 0.4, 1 + Math.random()),
        new THREE.Vector3(4 + i * 3, 0.2, 2 + Math.random()),
      ]);

      const branchGeometry = new THREE.TubeGeometry(
        branchCurve,
        10,
        0.08,
        6,
        false
      );
      const branch = new THREE.Mesh(branchGeometry, material);
      group.add(branch);
    }

    // Add some bulbous nodes along the vessel
    for (let i = 0; i < 4; i++) {
      const nodeGeometry = new THREE.SphereGeometry(
        0.2 + Math.random() * 0.15,
        8,
        8
      );
      const node = new THREE.Mesh(nodeGeometry, material);
      node.position.set(2 + i * 3, 0.2, Math.random() * 0.5);
      group.add(node);
    }

    return group;
  }

  /**
   * Creates vertical climbing vessels
   */
  createVerticalVessel(material) {
    const group = new THREE.Group();

    const height = 5 + Math.random() * 10;

    // Main vertical tendril
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.3, height * 0.3, 0.2),
      new THREE.Vector3(-0.2, height * 0.6, -0.1),
      new THREE.Vector3(0.1, height, 0.3),
    ]);

    const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.12, 8, false);
    const mainTendril = new THREE.Mesh(tubeGeometry, material);
    group.add(mainTendril);

    // Branching arms
    for (let i = 0; i < 4; i++) {
      const branchHeight = height * (0.2 + i * 0.2);
      const branchCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, branchHeight, 0),
        new THREE.Vector3(1, branchHeight + 0.5, 0.5),
        new THREE.Vector3(2, branchHeight + 0.2, 1),
      ]);

      const branchGeometry = new THREE.TubeGeometry(
        branchCurve,
        8,
        0.06,
        6,
        false
      );
      const branch = new THREE.Mesh(branchGeometry, material);
      branch.rotation.y = Math.random() * Math.PI * 2;
      group.add(branch);
    }

    return group;
  }

  /**
   * Creates floating spores/particles unique to Upside Down
   */
  createSpores() {
    const sporeCount = 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(sporeCount * 3);
    const sizes = new Float32Array(sporeCount);

    for (let i = 0; i < sporeCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 150;
      positions[i * 3 + 1] = Math.random() * 25;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 150;
      sizes[i] = 0.1 + Math.random() * 0.2;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0x6688cc,
      size: 0.2,
      transparent: true,
      opacity: 0.7,
      fog: true,
    });

    this.spores = new THREE.Points(geometry, material);
    this.scene.add(this.spores);
  }

  /**
   * Creates eerie pulsing blue glows scattered around
   * Otherworldly light sources
   */
  createEerieGlows() {
    for (let i = 0; i < 30; i++) {
      const x = (Math.random() - 0.5) * 150;
      const z = (Math.random() - 0.5) * 150;
      const y = 0.5 + Math.random() * 2;

      // Point light with blue color - brighter for visibility
      const light = new THREE.PointLight(0x4488cc, 3.0, 25, 2);
      light.position.set(x, y, z);
      this.scene.add(light);

      // Glowing orb mesh - blue
      const glowGeometry = new THREE.SphereGeometry(0.4, 8, 8);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x66aaff,
        transparent: true,
        opacity: 0.9,
      });
      const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      glowMesh.position.copy(light.position);
      this.scene.add(glowMesh);

      // Store for animation
      this.eerieGlows.push({
        light: light,
        mesh: glowMesh,
        baseIntensity: 2.5 + Math.random() * 1.5,
        flickerSpeed: 2 + Math.random() * 5,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  /**
   * Creates ground-level spreading tendrils
   */
  createGroundTendrils() {
    this.tendrils = [];

    const tendrilMaterial = new THREE.MeshBasicMaterial({
      color: 0x110808,
      transparent: true,
      opacity: 0.85,
    });

    // Create web-like tendril patterns on ground
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * 180;
      const z = (Math.random() - 0.5) * 180;

      // Create a web of tendrils
      const webGroup = new THREE.Group();
      webGroup.position.set(x, 0.05, z);

      const numArms = 4 + Math.floor(Math.random() * 4);
      for (let j = 0; j < numArms; j++) {
        const angle = (j / numArms) * Math.PI * 2;
        const length = 3 + Math.random() * 5;

        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(
            Math.cos(angle) * length * 0.5,
            0.1,
            Math.sin(angle) * length * 0.5
          ),
          new THREE.Vector3(
            Math.cos(angle) * length,
            0.05,
            Math.sin(angle) * length
          ),
        ]);

        const tubeGeometry = new THREE.TubeGeometry(curve, 10, 0.1, 6, false);
        const tendril = new THREE.Mesh(tubeGeometry, tendrilMaterial);
        webGroup.add(tendril);
      }

      // Center node
      const centerGeometry = new THREE.SphereGeometry(0.4, 8, 8);
      const centerNode = new THREE.Mesh(centerGeometry, tendrilMaterial);
      centerNode.position.y = 0.2;
      webGroup.add(centerNode);

      this.scene.add(webGroup);
      this.tendrils.push(webGroup);
    }
  }

  /**
   * Creates ominous dark clouds in the sky
   */
  createClouds() {
    const cloudCount = 20;

    for (let i = 0; i < cloudCount; i++) {
      // Create cloud using multiple spheres
      const cloudGroup = new THREE.Group();
      const puffCount = 8 + Math.floor(Math.random() * 6);

      for (let j = 0; j < puffCount; j++) {
        const puffGeometry = new THREE.SphereGeometry(
          5 + Math.random() * 8,
          8,
          8
        );
        const puffMaterial = new THREE.MeshBasicMaterial({
          color: 0x882222, // Brighter red clouds
          transparent: true,
          opacity: 0.8,
          fog: false,
        });
        const puff = new THREE.Mesh(puffGeometry, puffMaterial);
        puff.position.set(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 15
        );
        cloudGroup.add(puff);
      }

      // Position cloud higher in sky
      cloudGroup.position.set(
        (Math.random() - 0.5) * 250,
        45 + Math.random() * 20,
        (Math.random() - 0.5) * 250
      );

      // Store base position for animation
      cloudGroup.userData.baseX = cloudGroup.position.x;
      cloudGroup.userData.baseZ = cloudGroup.position.z;
      cloudGroup.userData.driftSpeed = 0.5 + Math.random() * 1.0;

      this.scene.add(cloudGroup);
      this.clouds.push(cloudGroup);
    }
  }

  /**
   * Creates a red lightning bolt effect
   */
  createLightningBolt() {
    // Random position in the sky
    const x = (Math.random() - 0.5) * 150;
    const z = (Math.random() - 0.5) * 150;
    const startY = 25 + Math.random() * 5;

    // Create lightning path with jagged segments
    const points = [];
    let currentX = x;
    let currentY = startY;
    let currentZ = z;

    // Generate jagged lightning path
    const segments = 8 + Math.floor(Math.random() * 4);
    for (let i = 0; i < segments; i++) {
      points.push(new THREE.Vector3(currentX, currentY, currentZ));
      currentX += (Math.random() - 0.5) * 3;
      currentY -= 3 + Math.random() * 2;
      currentZ += (Math.random() - 0.5) * 3;
    }
    // End at ground
    points.push(new THREE.Vector3(currentX, 0, currentZ));

    const lightningGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const lightningMaterial = new THREE.LineBasicMaterial({
      color: 0xff3333, // Bright red
      linewidth: 3,
      transparent: true,
      opacity: 1.0,
    });

    const lightningBolt = new THREE.Line(lightningGeometry, lightningMaterial);
    lightningBolt.userData.lifetime = 0.15; // Lightning lasts 0.15 seconds
    lightningBolt.userData.age = 0;

    // Add bright light at strike point
    const strikeLight = new THREE.PointLight(0xff4444, 20, 50, 2);
    strikeLight.position.set(currentX, 5, currentZ);
    this.scene.add(strikeLight);
    lightningBolt.userData.strikeLight = strikeLight;

    this.scene.add(lightningBolt);
    this.lightning.push(lightningBolt);
  }

  /**
   * Updates all Upside Down effects
   */
  update(deltaTime) {
    if (!this.active) return;

    this.time += deltaTime;

    // Random lightning strikes - more frequent
    this.lightningTimer += deltaTime;
    if (this.lightningTimer > 1 + Math.random() * 2) {
      this.createLightningBolt();
      this.lightningTimer = 0;
    }

    // Update existing lightning bolts
    for (let i = this.lightning.length - 1; i >= 0; i--) {
      const bolt = this.lightning[i];
      bolt.userData.age += deltaTime;

      // Fade out lightning
      const fadeProgress = bolt.userData.age / bolt.userData.lifetime;
      bolt.material.opacity = 1.0 - fadeProgress;

      // Fade out strike light
      if (bolt.userData.strikeLight) {
        bolt.userData.strikeLight.intensity = 20 * (1.0 - fadeProgress);
      }

      // Remove when expired
      if (bolt.userData.age >= bolt.userData.lifetime) {
        this.scene.remove(bolt);
        if (bolt.userData.strikeLight) {
          this.scene.remove(bolt.userData.strikeLight);
        }
        bolt.geometry.dispose();
        bolt.material.dispose();
        this.lightning.splice(i, 1);
      }
    }

    // Animate spores - floating and drifting
    if (this.spores) {
      const positions = this.spores.geometry.attributes.position.array;

      for (let i = 0; i < positions.length; i += 3) {
        // Slow floating motion
        positions[i + 1] += deltaTime * 0.3;

        // Horizontal drift
        positions[i] += Math.sin(this.time + i * 0.1) * deltaTime * 0.2;
        positions[i + 2] += Math.cos(this.time + i * 0.15) * deltaTime * 0.2;

        // Reset particles that go too high
        if (positions[i + 1] > 25) {
          positions[i + 1] = 0;
        }
      }

      this.spores.geometry.attributes.position.needsUpdate = true;
    }

    // Animate eerie glows - flickering effect
    this.eerieGlows.forEach((glow) => {
      // Irregular flickering
      const flicker = Math.sin(this.time * glow.flickerSpeed + glow.phase);
      const randomFlicker = Math.random() > 0.95 ? 0.3 : 1; // Occasional dips

      glow.light.intensity =
        glow.baseIntensity * (0.5 + flicker * 0.5) * randomFlicker;
      glow.mesh.material.opacity = 0.5 + flicker * 0.3;

      // Subtle size pulsing
      const scale = 1 + Math.sin(this.time * 2 + glow.phase) * 0.2;
      glow.mesh.scale.set(scale, scale, scale);
    });

    // Subtle vessel pulsing
    this.vessels.forEach((vessel, i) => {
      const pulse = 1 + Math.sin(this.time * 0.5 + i) * 0.05;
      vessel.scale.set(pulse, pulse, pulse);
    });

    // Animate clouds - slow drift
    this.clouds.forEach((cloud) => {
      cloud.position.x +=
        Math.sin(this.time * 0.1) * deltaTime * cloud.userData.driftSpeed;
      cloud.position.z +=
        Math.cos(this.time * 0.15) * deltaTime * cloud.userData.driftSpeed;

      // Subtle rotation
      cloud.rotation.y += deltaTime * 0.05;
    });
  }

  /**
   * Updates effect positions to follow player
   */
  updateCenter(position) {
    if (this.spores) {
      this.spores.position.x = position.x;
      this.spores.position.z = position.z;
    }
  }
}
