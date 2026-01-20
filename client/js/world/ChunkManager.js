/**
 * ChunkManager Class
 * Handles chunk-based terrain loading and unloading
 * Uses instanced meshes for trees to optimize performance
 */

import * as THREE from "three";
import { GAME_CONFIG, CHUNK_TYPES } from "../utils/constants.js";
import { Chunk } from "./Chunk.js";

export class ChunkManager {
  constructor(scene, materials) {
    this.scene = scene;
    this.materials = materials;

    // Chunk storage
    this.chunks = new Map(); // "x,z" -> Chunk
    this.loadedChunks = new Set();

    // Instanced meshes for performance
    this.treeInstances = null;
    this.lampInstances = null;
    this.maxTreeInstances = 2000;
    this.maxLampInstances = 100;

    // World layout (predefined for small town + forest)
    this.worldLayout = this.generateWorldLayout();

    // Current player chunk
    this.currentPlayerChunk = { x: 0, z: 0 };
  }

  /**
   * Initializes the chunk manager
   */
  async init() {
    console.log("[ChunkManager] Initializing...");

    // Create instanced meshes
    this.createInstancedMeshes();

    // Load initial chunks around spawn
    this.updateChunksAroundPosition({ x: 0, y: 0, z: 0 });

    console.log("[ChunkManager] Ready");
  }

  /**
   * Generates the world layout - defines what each chunk contains
   * Creates a small town in the center surrounded by forest
   */
  generateWorldLayout() {
    const layout = new Map();
    const worldSize = GAME_CONFIG.WORLD_SIZE;

    for (let x = -worldSize; x <= worldSize; x++) {
      for (let z = -worldSize; z <= worldSize; z++) {
        const key = `${x},${z}`;

        // Town center (3x3 chunks)
        if (Math.abs(x) <= 1 && Math.abs(z) <= 1) {
          layout.set(key, CHUNK_TYPES.TOWN);
        }
        // Roads extending from town
        else if (
          (x === 0 && Math.abs(z) <= 4) ||
          (z === 0 && Math.abs(x) <= 4)
        ) {
          layout.set(key, CHUNK_TYPES.ROAD);
        }
        // Forest everywhere else
        else {
          layout.set(key, CHUNK_TYPES.FOREST);
        }
      }
    }

    return layout;
  }

  /**
   * Creates instanced meshes for trees and lamps
   * Instancing allows rendering many objects with single draw calls
   */
  createInstancedMeshes() {
    // Tree geometry (low-poly cone + cylinder)
    const treeGeometry = new THREE.ConeGeometry(2, 6, 6);
    treeGeometry.translate(0, 5, 0);

    this.treeInstances = new THREE.InstancedMesh(
      treeGeometry,
      this.materials.trees,
      this.maxTreeInstances
    );
    this.treeInstances.count = 0;
    this.treeInstances.frustumCulled = true;
    this.scene.add(this.treeInstances);

    // Tree trunks
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 2, 6);
    trunkGeometry.translate(0, 1, 0);

    this.trunkInstances = new THREE.InstancedMesh(
      trunkGeometry,
      this.materials.trunk,
      this.maxTreeInstances
    );
    this.trunkInstances.count = 0;
    this.scene.add(this.trunkInstances);

    // Street lamp geometry
    const lampPostGeometry = new THREE.CylinderGeometry(0.1, 0.15, 4, 6);
    lampPostGeometry.translate(0, 2, 0);

    const lampPostMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });

    this.lampPostInstances = new THREE.InstancedMesh(
      lampPostGeometry,
      lampPostMaterial,
      this.maxLampInstances
    );
    this.lampPostInstances.count = 0;
    this.scene.add(this.lampPostInstances);
  }

  /**
   * Updates loaded chunks based on player position
   */
  update(playerPosition) {
    const chunkX = Math.floor(playerPosition.x / GAME_CONFIG.CHUNK_SIZE);
    const chunkZ = Math.floor(playerPosition.z / GAME_CONFIG.CHUNK_SIZE);

    // Only update if player moved to a new chunk
    if (
      chunkX !== this.currentPlayerChunk.x ||
      chunkZ !== this.currentPlayerChunk.z
    ) {
      this.currentPlayerChunk = { x: chunkX, z: chunkZ };
      this.updateChunksAroundPosition(playerPosition);
    }
  }

  /**
   * Loads/unloads chunks around the given position
   */
  updateChunksAroundPosition(position) {
    const centerX = Math.floor(position.x / GAME_CONFIG.CHUNK_SIZE);
    const centerZ = Math.floor(position.z / GAME_CONFIG.CHUNK_SIZE);
    const renderDist = GAME_CONFIG.RENDER_DISTANCE;

    // Track which chunks should be loaded
    const shouldBeLoaded = new Set();

    // Determine chunks to load
    for (let dx = -renderDist; dx <= renderDist; dx++) {
      for (let dz = -renderDist; dz <= renderDist; dz++) {
        const chunkX = centerX + dx;
        const chunkZ = centerZ + dz;
        const key = `${chunkX},${chunkZ}`;
        shouldBeLoaded.add(key);

        // Load chunk if not already loaded
        if (!this.loadedChunks.has(key)) {
          this.loadChunk(chunkX, chunkZ);
        }
      }
    }

    // Unload chunks that are too far
    for (const key of this.loadedChunks) {
      if (!shouldBeLoaded.has(key)) {
        this.unloadChunk(key);
      }
    }

    // Rebuild instance buffers
    this.rebuildInstances();
  }

  /**
   * Loads a specific chunk
   */
  loadChunk(chunkX, chunkZ) {
    const key = `${chunkX},${chunkZ}`;

    // Check if within world bounds
    if (
      Math.abs(chunkX) > GAME_CONFIG.WORLD_SIZE ||
      Math.abs(chunkZ) > GAME_CONFIG.WORLD_SIZE
    ) {
      return;
    }

    // Get chunk type from layout
    const chunkType = this.worldLayout.get(key) || CHUNK_TYPES.EMPTY;

    // Create chunk
    const chunk = new Chunk(
      chunkX,
      chunkZ,
      chunkType,
      this.scene,
      this.materials
    );
    chunk.generate();

    this.chunks.set(key, chunk);
    this.loadedChunks.add(key);
  }

  /**
   * Unloads a specific chunk
   */
  unloadChunk(key) {
    const chunk = this.chunks.get(key);
    if (chunk) {
      chunk.dispose();
      this.chunks.delete(key);
    }
    this.loadedChunks.delete(key);
  }

  /**
   * Rebuilds instanced mesh buffers from loaded chunks
   */
  rebuildInstances() {
    let treeIndex = 0;
    let trunkIndex = 0;
    let lampIndex = 0;

    const matrix = new THREE.Matrix4();

    this.chunks.forEach((chunk) => {
      // Add trees from this chunk
      chunk.treePositions.forEach((pos) => {
        if (treeIndex < this.maxTreeInstances) {
          // Random scale variation
          const scale = 0.8 + Math.random() * 0.4;
          matrix.makeScale(scale, scale, scale);
          matrix.setPosition(pos.x, pos.y, pos.z);

          this.treeInstances.setMatrixAt(treeIndex, matrix);
          this.trunkInstances.setMatrixAt(trunkIndex, matrix);

          treeIndex++;
          trunkIndex++;
        }
      });

      // Add lamps from this chunk
      chunk.lampPositions.forEach((pos) => {
        if (lampIndex < this.maxLampInstances) {
          matrix.identity();
          matrix.setPosition(pos.x, pos.y, pos.z);
          this.lampPostInstances.setMatrixAt(lampIndex, matrix);
          lampIndex++;
        }
      });
    });

    // Update instance counts and buffers
    this.treeInstances.count = treeIndex;
    this.trunkInstances.count = trunkIndex;
    this.lampPostInstances.count = lampIndex;

    this.treeInstances.instanceMatrix.needsUpdate = true;
    this.trunkInstances.instanceMatrix.needsUpdate = true;
    this.lampPostInstances.instanceMatrix.needsUpdate = true;
  }

  /**
   * Gets terrain height at a position (for player placement)
   */
  getHeightAt(x, z) {
    // Flat terrain for MVP
    return 0;
  }

  /**
   * Updates all building colors for world state changes
   */
  updateBuildingColors(buildingColor, roofColor, roadColor) {
    this.chunks.forEach((chunk) => {
      chunk.buildings.forEach((mesh) => {
        if (mesh.userData.isBuilding && mesh.material) {
          mesh.material.color.setHex(buildingColor);
        }
        if (mesh.userData.isRoof && mesh.material) {
          mesh.material.color.setHex(roofColor);
        }
        if (mesh.userData.isRoad && mesh.material) {
          mesh.material.color.setHex(roadColor);
        }
      });
    });
  }

  /**
   * Gets all building positions from loaded chunks
   */
  getBuildingPositions() {
    const positions = [];
    this.chunks.forEach((chunk) => {
      positions.push(...chunk.buildingData);
    });
    return positions;
  }
}
