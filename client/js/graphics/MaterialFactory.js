/**
 * MaterialFactory Class
 * Creates PBR materials for realistic rendering
 * Handles material presets for normal and Upside Down states
 */

import * as THREE from "three";

export class MaterialFactory {
  constructor() {
    // Texture loader
    this.textureLoader = new THREE.TextureLoader();

    // Material cache
    this.materials = new Map();

    // Default texture settings
    this.defaultTextureSettings = {
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.RepeatWrapping,
      repeat: { x: 1, y: 1 },
    };

    // Initialize default materials
    this.initDefaultMaterials();
  }

  /**
   * Initialize default PBR materials
   */
  initDefaultMaterials() {
    // Ground materials
    this.createMaterial("grass", {
      color: 0x2d4a2a,
      roughness: 0.9,
      metalness: 0.0,
      normalScale: 0.5,
    });

    this.createMaterial("dirt", {
      color: 0x4a3828,
      roughness: 0.95,
      metalness: 0.0,
    });

    this.createMaterial("concrete", {
      color: 0x666666,
      roughness: 0.8,
      metalness: 0.0,
    });

    this.createMaterial("asphalt", {
      color: 0x2a2a2a,
      roughness: 0.85,
      metalness: 0.0,
    });

    // Building materials
    this.createMaterial("brick", {
      color: 0x8b4513,
      roughness: 0.75,
      metalness: 0.0,
    });

    this.createMaterial("wood", {
      color: 0x654321,
      roughness: 0.7,
      metalness: 0.0,
    });

    this.createMaterial("metal", {
      color: 0x888888,
      roughness: 0.3,
      metalness: 0.8,
    });

    this.createMaterial("glass", {
      color: 0xaaccff,
      roughness: 0.1,
      metalness: 0.0,
      transparent: true,
      opacity: 0.4,
    });

    this.createMaterial("roof", {
      color: 0x3a3a3a,
      roughness: 0.8,
      metalness: 0.1,
    });

    // Nature materials
    this.createMaterial("treeBark", {
      color: 0x3d2817,
      roughness: 0.9,
      metalness: 0.0,
    });

    this.createMaterial("leaves", {
      color: 0x2d5a2a,
      roughness: 0.8,
      metalness: 0.0,
    });

    // Prop materials
    this.createMaterial("plastic", {
      color: 0x333333,
      roughness: 0.5,
      metalness: 0.0,
    });

    this.createMaterial("fabric", {
      color: 0x4a4a6a,
      roughness: 0.95,
      metalness: 0.0,
    });

    // Portal material (emissive)
    this.createMaterial("portal", {
      color: 0xff0000,
      roughness: 0.2,
      metalness: 0.0,
      emissive: 0xff2200,
      emissiveIntensity: 2.0,
    });

    console.log("[MaterialFactory] Initialized with PBR materials");
  }

  /**
   * Create a PBR material with given properties
   */
  createMaterial(name, options = {}) {
    const material = new THREE.MeshStandardMaterial({
      color: options.color || 0xffffff,
      roughness: options.roughness !== undefined ? options.roughness : 0.5,
      metalness: options.metalness !== undefined ? options.metalness : 0.0,
      transparent: options.transparent || false,
      opacity: options.opacity !== undefined ? options.opacity : 1.0,
      side: options.side || THREE.FrontSide,
      flatShading: options.flatShading || false,
    });

    // Emissive properties
    if (options.emissive) {
      material.emissive = new THREE.Color(options.emissive);
      material.emissiveIntensity = options.emissiveIntensity || 1.0;
    }

    // Store material
    this.materials.set(name, {
      material,
      options,
      normalOptions: { ...options },
      upsideDownOptions: this.createUpsideDownOptions(options),
    });

    return material;
  }

  /**
   * Create Upside Down variant options
   */
  createUpsideDownOptions(normalOptions) {
    const color = new THREE.Color(normalOptions.color || 0xffffff);

    // Desaturate and darken
    const hsl = {};
    color.getHSL(hsl);
    hsl.s *= 0.3; // Reduce saturation
    hsl.l *= 0.5; // Darken
    color.setHSL(hsl.h, hsl.s, hsl.l);

    // Slight red tint
    color.r = Math.min(1, color.r * 1.2);

    return {
      ...normalOptions,
      color: color.getHex(),
      roughness: Math.min(1, (normalOptions.roughness || 0.5) + 0.2),
    };
  }

  /**
   * Get material by name
   */
  getMaterial(name) {
    const entry = this.materials.get(name);
    return entry ? entry.material : null;
  }

  /**
   * Get or create a basic material (for compatibility with existing code)
   */
  getBasicMaterial(color, options = {}) {
    const key = `basic_${color}_${JSON.stringify(options)}`;

    if (!this.materials.has(key)) {
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: options.roughness || 0.7,
        metalness: options.metalness || 0.0,
        transparent: options.transparent || false,
        opacity: options.opacity !== undefined ? options.opacity : 1.0,
      });
      this.materials.set(key, { material, options });
    }

    return this.materials.get(key).material;
  }

  /**
   * Switch all materials to Upside Down state
   */
  setUpsideDown(isUpsideDown) {
    this.materials.forEach((entry, name) => {
      if (entry.normalOptions && entry.upsideDownOptions) {
        const options = isUpsideDown
          ? entry.upsideDownOptions
          : entry.normalOptions;
        entry.material.color.setHex(options.color);
        entry.material.roughness = options.roughness;

        if (options.emissive) {
          entry.material.emissive.setHex(options.emissive);
          entry.material.emissiveIntensity = options.emissiveIntensity;
        }
      }
    });
  }

  /**
   * Create instanced material for repeated objects
   */
  createInstancedMaterial(baseMaterialName) {
    const baseMaterial = this.getMaterial(baseMaterialName);
    if (!baseMaterial) return null;

    // Clone and enable instancing
    const instancedMaterial = baseMaterial.clone();
    return instancedMaterial;
  }

  /**
   * Load texture and apply to material
   */
  loadTexture(url, materialName, type = "map") {
    const material = this.getMaterial(materialName);
    if (!material) return;

    this.textureLoader.load(url, (texture) => {
      texture.wrapS = this.defaultTextureSettings.wrapS;
      texture.wrapT = this.defaultTextureSettings.wrapT;

      switch (type) {
        case "map":
          material.map = texture;
          break;
        case "normalMap":
          material.normalMap = texture;
          break;
        case "roughnessMap":
          material.roughnessMap = texture;
          break;
        case "aoMap":
          material.aoMap = texture;
          break;
      }

      material.needsUpdate = true;
    });
  }

  /**
   * Dispose all materials
   */
  dispose() {
    this.materials.forEach((entry) => {
      entry.material.dispose();
    });
    this.materials.clear();
  }
}

// Singleton instance
let materialFactoryInstance = null;

export function getMaterialFactory() {
  if (!materialFactoryInstance) {
    materialFactoryInstance = new MaterialFactory();
  }
  return materialFactoryInstance;
}
