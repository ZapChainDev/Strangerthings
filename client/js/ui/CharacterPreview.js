/**
 * CharacterPreview Class
 * Renders 3D character models for the character selection screen
 * Each character has unique visual traits matching their personality
 */

import * as THREE from "three";
import { CHARACTERS, CHARACTER_LIST } from "../utils/constants.js";

export class CharacterPreview {
  constructor(container) {
    this.container = container;
    this.characters = new Map(); // characterId -> { scene, camera, renderer, mesh }
    this.animationFrame = null;
    this.isRunning = false;
  }

  /**
   * Initializes all character previews
   */
  init() {
    CHARACTER_LIST.forEach((char) => {
      this.createCharacterPreview(char);
    });

    this.isRunning = true;
    this.animate();
  }

  /**
   * Creates a single character preview
   */
  createCharacterPreview(charData) {
    const cardElement = document.querySelector(
      `.character-card[data-character-id="${charData.id}"]`
    );
    if (!cardElement) return;

    const canvasContainer = cardElement.querySelector(
      ".character-canvas-container"
    );
    if (!canvasContainer) return;

    // Create scene
    const scene = new THREE.Scene();

    // Create camera
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.2, 3.5);
    camera.lookAt(0, 0.9, 0);

    // Create renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(180, 220);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    canvasContainer.appendChild(renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Character-colored rim light
    const rimLight = new THREE.PointLight(charData.color, 1.5, 10);
    rimLight.position.set(-2, 2, -1);
    scene.add(rimLight);

    // Front key light
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
    keyLight.position.set(1, 2, 3);
    scene.add(keyLight);

    // Create character mesh
    const mesh = this.createCharacterMesh(charData);
    scene.add(mesh);

    // Store reference
    this.characters.set(charData.id, {
      scene,
      camera,
      renderer,
      mesh,
      charData,
      time: Math.random() * Math.PI * 2, // Random start phase for variety
    });
  }

  /**
   * Creates a detailed character mesh based on character data
   */
  createCharacterMesh(charData) {
    const group = new THREE.Group();
    const color = charData.color;

    // Character-specific customizations
    const traits = this.getCharacterTraits(charData.id);

    // Body
    const bodyGeometry = new THREE.CylinderGeometry(0.28, 0.32, 0.9, 12);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: traits.shirtColor,
      roughness: 0.7,
      metalness: 0.1,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.75;
    group.add(body);

    // Jacket/Outer layer (some characters have this)
    if (traits.hasJacket) {
      const jacketGeometry = new THREE.CylinderGeometry(0.32, 0.36, 0.85, 12);
      const jacketMaterial = new THREE.MeshStandardMaterial({
        color: traits.jacketColor,
        roughness: 0.8,
        metalness: 0,
      });
      const jacket = new THREE.Mesh(jacketGeometry, jacketMaterial);
      jacket.position.y = 0.77;
      jacket.scale.set(1.05, 1, 1.05);
      group.add(jacket);
    }

    // Head
    const headGeometry = new THREE.SphereGeometry(0.22, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: traits.skinColor,
      roughness: 0.6,
      metalness: 0,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.42;
    group.add(head);

    // Hair - character specific styles
    const hairMesh = this.createHairStyle(traits);
    if (hairMesh) {
      group.add(hairMesh);
    }

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x222222 });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.07, 1.45, 0.18);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.07, 1.45, 0.18);
    group.add(rightEye);

    // Arms
    const armGeometry = new THREE.CylinderGeometry(0.06, 0.08, 0.55, 8);
    const armMaterial = new THREE.MeshStandardMaterial({
      color: traits.hasJacket ? traits.jacketColor : traits.shirtColor,
      roughness: 0.7,
    });

    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.38, 0.85, 0);
    leftArm.rotation.z = 0.15;
    leftArm.name = "leftArm";
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.38, 0.85, 0);
    rightArm.rotation.z = -0.15;
    rightArm.name = "rightArm";
    group.add(rightArm);

    // Hands
    const handGeometry = new THREE.SphereGeometry(0.06, 8, 8);
    const handMaterial = new THREE.MeshStandardMaterial({
      color: traits.skinColor,
      roughness: 0.6,
    });

    const leftHand = new THREE.Mesh(handGeometry, handMaterial);
    leftHand.position.set(-0.42, 0.55, 0);
    group.add(leftHand);

    const rightHand = new THREE.Mesh(handGeometry, handMaterial);
    rightHand.position.set(0.42, 0.55, 0);
    group.add(rightHand);

    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.09, 0.1, 0.55, 8);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: traits.pantsColor,
      roughness: 0.8,
    });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.12, 0.25, 0);
    leftLeg.name = "leftLeg";
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.12, 0.25, 0);
    rightLeg.name = "rightLeg";
    group.add(rightLeg);

    // Shoes
    const shoeGeometry = new THREE.BoxGeometry(0.12, 0.08, 0.18);
    const shoeMaterial = new THREE.MeshStandardMaterial({
      color: traits.shoeColor,
      roughness: 0.9,
    });

    const leftShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
    leftShoe.position.set(-0.12, 0.02, 0.02);
    group.add(leftShoe);

    const rightShoe = new THREE.Mesh(shoeGeometry, shoeMaterial);
    rightShoe.position.set(0.12, 0.02, 0.02);
    group.add(rightShoe);

    // Character-specific accessories
    this.addAccessories(group, traits);

    return group;
  }

  /**
   * Gets character-specific visual traits
   */
  getCharacterTraits(characterId) {
    const traits = {
      eleven: {
        skinColor: 0xf5d0c5,
        hairColor: 0x4a3728,
        hairStyle: "short", // Shaved/short hair (Season 1 style)
        shirtColor: 0xffc0cb, // Pink dress
        hasJacket: true,
        jacketColor: 0x8b4513, // Brown jacket
        pantsColor: 0x2c2c2c,
        shoeColor: 0xffffff, // White sneakers
        accessory: "nosebleed", // Iconic nosebleed effect
      },
      mike: {
        skinColor: 0xf5d0c5,
        hairColor: 0x1a1a1a, // Dark black hair
        hairStyle: "wavy",
        shirtColor: 0x2255aa, // Blue striped shirt
        hasJacket: false,
        jacketColor: 0x2255aa,
        pantsColor: 0x3d3d3d,
        shoeColor: 0x4a4a4a,
        accessory: "walkieTalkie",
      },
      dustin: {
        skinColor: 0xf5d0c5,
        hairColor: 0x5c4033, // Curly brown
        hairStyle: "curly",
        shirtColor: 0x228b22, // Green/colorful
        hasJacket: true,
        jacketColor: 0xcc4444, // Red jacket
        pantsColor: 0x4a5568,
        shoeColor: 0xffffff,
        accessory: "cap", // His iconic cap
      },
      lucas: {
        skinColor: 0x8b6914,
        hairColor: 0x1a1a1a,
        hairStyle: "short",
        shirtColor: 0xf4a460, // Orange/camo
        hasJacket: true,
        jacketColor: 0x556b2f, // Army green camo jacket
        pantsColor: 0x2f4f4f,
        shoeColor: 0x8b4513,
        accessory: "bandana", // His headband
      },
      will: {
        skinColor: 0xf5d0c5,
        hairColor: 0x5c4033, // Bowl cut brown
        hairStyle: "bowl",
        shirtColor: 0x708090, // Muted colors
        hasJacket: true,
        jacketColor: 0x4a5568,
        pantsColor: 0x3d3d3d,
        shoeColor: 0x4a4a4a,
        accessory: "drawing", // Art/sensitive vibe
      },
      max: {
        skinColor: 0xf5d0c5,
        hairColor: 0xff4500, // Bright red hair
        hairStyle: "long",
        shirtColor: 0x4169e1, // Blue
        hasJacket: false,
        jacketColor: 0x4169e1,
        pantsColor: 0x1e3a5f,
        shoeColor: 0xffffff, // Skateboard shoes
        accessory: "skateboard",
      },
    };

    return traits[characterId] || traits.mike;
  }

  /**
   * Creates character-specific hair styles
   */
  createHairStyle(traits) {
    const hairMaterial = new THREE.MeshStandardMaterial({
      color: traits.hairColor,
      roughness: 0.9,
      metalness: 0,
    });

    let hairMesh;

    switch (traits.hairStyle) {
      case "short":
        // Short/shaved hair
        const shortHairGeo = new THREE.SphereGeometry(
          0.23,
          16,
          16,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2
        );
        hairMesh = new THREE.Mesh(shortHairGeo, hairMaterial);
        hairMesh.position.y = 1.45;
        break;

      case "curly":
        // Curly hair (Dustin style) - multiple spheres
        hairMesh = new THREE.Group();
        for (let i = 0; i < 12; i++) {
          const curlGeo = new THREE.SphereGeometry(0.08, 8, 8);
          const curl = new THREE.Mesh(curlGeo, hairMaterial);
          const angle = (i / 12) * Math.PI * 2;
          const radius = 0.18;
          curl.position.set(
            Math.cos(angle) * radius,
            1.55 + Math.random() * 0.1,
            Math.sin(angle) * radius
          );
          hairMesh.add(curl);
        }
        // Top curls
        for (let i = 0; i < 6; i++) {
          const curlGeo = new THREE.SphereGeometry(0.07, 8, 8);
          const curl = new THREE.Mesh(curlGeo, hairMaterial);
          const angle = (i / 6) * Math.PI * 2;
          curl.position.set(
            Math.cos(angle) * 0.1,
            1.65 + Math.random() * 0.05,
            Math.sin(angle) * 0.1
          );
          hairMesh.add(curl);
        }
        break;

      case "wavy":
        // Wavy hair (Mike style)
        hairMesh = new THREE.Group();
        const wavyBase = new THREE.SphereGeometry(
          0.24,
          16,
          16,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.6
        );
        const wavyBaseMesh = new THREE.Mesh(wavyBase, hairMaterial);
        wavyBaseMesh.position.y = 1.45;
        hairMesh.add(wavyBaseMesh);
        // Side hair
        const sideHairGeo = new THREE.BoxGeometry(0.08, 0.15, 0.1);
        const leftSide = new THREE.Mesh(sideHairGeo, hairMaterial);
        leftSide.position.set(-0.2, 1.4, 0.05);
        hairMesh.add(leftSide);
        const rightSide = new THREE.Mesh(sideHairGeo, hairMaterial);
        rightSide.position.set(0.2, 1.4, 0.05);
        hairMesh.add(rightSide);
        break;

      case "bowl":
        // Bowl cut (Will style)
        hairMesh = new THREE.Group();
        const bowlGeo = new THREE.SphereGeometry(
          0.25,
          16,
          16,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.55
        );
        const bowlMesh = new THREE.Mesh(bowlGeo, hairMaterial);
        bowlMesh.position.y = 1.44;
        hairMesh.add(bowlMesh);
        // Bangs
        const bangsGeo = new THREE.BoxGeometry(0.35, 0.08, 0.1);
        const bangs = new THREE.Mesh(bangsGeo, hairMaterial);
        bangs.position.set(0, 1.52, 0.18);
        hairMesh.add(bangs);
        break;

      case "long":
        // Long red hair (Max style)
        hairMesh = new THREE.Group();
        const longBase = new THREE.SphereGeometry(
          0.25,
          16,
          16,
          0,
          Math.PI * 2,
          0,
          Math.PI * 0.6
        );
        const longBaseMesh = new THREE.Mesh(longBase, hairMaterial);
        longBaseMesh.position.y = 1.45;
        hairMesh.add(longBaseMesh);
        // Long hair strands
        for (let i = 0; i < 8; i++) {
          const strandGeo = new THREE.CylinderGeometry(0.04, 0.02, 0.4, 6);
          const strand = new THREE.Mesh(strandGeo, hairMaterial);
          const angle = (i / 8) * Math.PI + Math.PI / 2;
          strand.position.set(
            Math.cos(angle) * 0.2,
            1.25,
            Math.sin(angle) * 0.15 - 0.1
          );
          strand.rotation.x = 0.3;
          strand.rotation.z = Math.cos(angle) * 0.2;
          hairMesh.add(strand);
        }
        break;

      default:
        const defaultHairGeo = new THREE.SphereGeometry(
          0.24,
          16,
          16,
          0,
          Math.PI * 2,
          0,
          Math.PI / 2
        );
        hairMesh = new THREE.Mesh(defaultHairGeo, hairMaterial);
        hairMesh.position.y = 1.45;
    }

    return hairMesh;
  }

  /**
   * Adds character-specific accessories
   */
  addAccessories(group, traits) {
    switch (traits.accessory) {
      case "cap":
        // Dustin's cap
        const capGeo = new THREE.CylinderGeometry(0.25, 0.28, 0.1, 16);
        const capMaterial = new THREE.MeshStandardMaterial({
          color: 0x1e3a5f,
          roughness: 0.8,
        });
        const cap = new THREE.Mesh(capGeo, capMaterial);
        cap.position.y = 1.62;
        group.add(cap);

        // Cap brim
        const brimGeo = new THREE.BoxGeometry(0.25, 0.02, 0.15);
        const brim = new THREE.Mesh(brimGeo, capMaterial);
        brim.position.set(0, 1.58, 0.2);
        brim.rotation.x = -0.1;
        group.add(brim);
        break;

      case "bandana":
        // Lucas's headband
        const bandanaGeo = new THREE.TorusGeometry(0.23, 0.03, 8, 16);
        const bandanaMaterial = new THREE.MeshStandardMaterial({
          color: 0xff4444,
          roughness: 0.7,
        });
        const bandana = new THREE.Mesh(bandanaGeo, bandanaMaterial);
        bandana.position.y = 1.52;
        bandana.rotation.x = Math.PI / 2;
        group.add(bandana);
        break;

      case "skateboard":
        // Max's skateboard
        const deckGeo = new THREE.BoxGeometry(0.15, 0.02, 0.5);
        const deckMaterial = new THREE.MeshStandardMaterial({
          color: 0xff6600,
          roughness: 0.5,
        });
        const deck = new THREE.Mesh(deckGeo, deckMaterial);
        deck.position.set(0.5, 0.3, 0);
        deck.rotation.z = -0.3;
        deck.rotation.y = 0.5;
        group.add(deck);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8);
        const wheelMaterial = new THREE.MeshStandardMaterial({
          color: 0x333333,
        });
        const wheelPositions = [
          [0.45, 0.25, 0.15],
          [0.45, 0.25, -0.15],
          [0.55, 0.35, 0.15],
          [0.55, 0.35, -0.15],
        ];
        wheelPositions.forEach(([x, y, z]) => {
          const wheel = new THREE.Mesh(wheelGeo, wheelMaterial);
          wheel.position.set(x, y, z);
          wheel.rotation.x = Math.PI / 2;
          group.add(wheel);
        });
        break;

      case "nosebleed":
        // Eleven's iconic nosebleed hint - red glow
        const glowGeo = new THREE.SphereGeometry(0.02, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.8,
        });
        const glow = new THREE.Mesh(glowGeo, glowMaterial);
        glow.position.set(0, 1.38, 0.2);
        glow.name = "nosebleed";
        group.add(glow);

        // Add floating particles around Eleven (telekinesis effect)
        for (let i = 0; i < 5; i++) {
          const particleGeo = new THREE.SphereGeometry(0.02, 6, 6);
          const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0xff69b4,
            transparent: true,
            opacity: 0.6,
          });
          const particle = new THREE.Mesh(particleGeo, particleMaterial);
          particle.position.set(
            (Math.random() - 0.5) * 0.8,
            0.8 + Math.random() * 0.8,
            (Math.random() - 0.5) * 0.8
          );
          particle.name = `particle_${i}`;
          group.add(particle);
        }
        break;

      case "walkieTalkie":
        // Mike's walkie talkie
        const walkieGeo = new THREE.BoxGeometry(0.06, 0.12, 0.03);
        const walkieMaterial = new THREE.MeshStandardMaterial({
          color: 0x2a2a2a,
          roughness: 0.5,
        });
        const walkie = new THREE.Mesh(walkieGeo, walkieMaterial);
        walkie.position.set(-0.35, 0.6, 0.1);
        group.add(walkie);

        // Antenna
        const antennaGeo = new THREE.CylinderGeometry(0.008, 0.005, 0.1, 6);
        const antenna = new THREE.Mesh(antennaGeo, walkieMaterial);
        antenna.position.set(-0.35, 0.72, 0.1);
        group.add(antenna);
        break;

      case "drawing":
        // Will's drawing pad
        const padGeo = new THREE.BoxGeometry(0.15, 0.2, 0.01);
        const padMaterial = new THREE.MeshStandardMaterial({
          color: 0xf5f5dc,
          roughness: 0.9,
        });
        const pad = new THREE.Mesh(padGeo, padMaterial);
        pad.position.set(0.4, 0.7, 0.15);
        pad.rotation.y = -0.3;
        group.add(pad);
        break;
    }
  }

  /**
   * Animation loop
   */
  animate() {
    if (!this.isRunning) return;

    this.animationFrame = requestAnimationFrame(() => this.animate());

    this.characters.forEach((char, id) => {
      char.time += 0.02;

      // Gentle rotation
      char.mesh.rotation.y = Math.sin(char.time * 0.5) * 0.3;

      // Subtle breathing/bobbing animation
      char.mesh.position.y = Math.sin(char.time) * 0.02;

      // Arm swing
      const leftArm = char.mesh.getObjectByName("leftArm");
      const rightArm = char.mesh.getObjectByName("rightArm");
      if (leftArm && rightArm) {
        leftArm.rotation.x = Math.sin(char.time * 1.5) * 0.1;
        rightArm.rotation.x = -Math.sin(char.time * 1.5) * 0.1;
      }

      // Special animations for certain characters
      if (id === "eleven") {
        // Floating particles for Eleven
        for (let i = 0; i < 5; i++) {
          const particle = char.mesh.getObjectByName(`particle_${i}`);
          if (particle) {
            particle.position.y = 0.8 + Math.sin(char.time + i) * 0.3;
            particle.position.x = Math.sin(char.time * 0.5 + i * 1.2) * 0.4;
            particle.position.z = Math.cos(char.time * 0.5 + i * 1.2) * 0.4;
          }
        }
        // Pulsing nosebleed
        const nosebleed = char.mesh.getObjectByName("nosebleed");
        if (nosebleed) {
          nosebleed.material.opacity = 0.5 + Math.sin(char.time * 3) * 0.3;
        }
      }

      // Render
      char.renderer.render(char.scene, char.camera);
    });
  }

  /**
   * Highlights a selected character
   */
  setSelected(characterId) {
    this.characters.forEach((char, id) => {
      if (id === characterId) {
        // Add glow effect to selected character
        char.scene.background = null;
      }
    });
  }

  /**
   * Cleanup
   */
  dispose() {
    this.isRunning = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    this.characters.forEach((char) => {
      char.renderer.dispose();
      char.scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    });

    this.characters.clear();
  }
}
