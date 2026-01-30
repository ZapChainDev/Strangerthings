/**
 * Chunk Class
 * Represents a single terrain chunk with its objects
 * Generates terrain, buildings, trees based on chunk type
 */

import * as THREE from "three";
import { GAME_CONFIG, CHUNK_TYPES } from "../utils/constants.js";

export class Chunk {
  constructor(chunkX, chunkZ, type, scene, materials) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.type = type;
    this.scene = scene;
    this.materials = materials;

    // World position of chunk corner
    this.worldX = chunkX * GAME_CONFIG.CHUNK_SIZE;
    this.worldZ = chunkZ * GAME_CONFIG.CHUNK_SIZE;

    // Objects in this chunk
    this.groundMesh = null;
    this.buildings = [];
    this.buildingData = []; // Store building positions for effects
    this.treePositions = []; // For instanced rendering
    this.lampPositions = []; // For instanced rendering
    this.pointLights = []; // Street lamp lights

    // Seeded random for consistent generation
    this.seed = this.hashCode(`${chunkX},${chunkZ}`);
  }

  /**
   * Generates a hash code for seeded random
   */
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Seeded random number generator
   */
  seededRandom() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  /**
   * Generates chunk content based on type
   */
  generate() {
    // Create ground plane
    this.createGround();

    // Generate content based on chunk type
    switch (this.type) {
      case CHUNK_TYPES.TOWN:
        this.generateTown();
        break;
      case CHUNK_TYPES.FOREST:
        this.generateForest();
        break;
      case CHUNK_TYPES.ROAD:
        this.generateRoad();
        break;
    }
  }

  /**
   * Creates the ground plane for this chunk
   */
  createGround() {
    const size = GAME_CONFIG.CHUNK_SIZE;
    const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
    geometry.rotateX(-Math.PI / 2);

    this.groundMesh = new THREE.Mesh(geometry, this.materials.ground);
    this.groundMesh.position.set(
      this.worldX + size / 2,
      0,
      this.worldZ + size / 2,
    );
    this.groundMesh.receiveShadow = true;

    this.scene.add(this.groundMesh);
  }

  /**
   * Generates town buildings and street lamps
   */
  generateTown() {
    const size = GAME_CONFIG.CHUNK_SIZE;

    // Create sidewalks around perimeter
    this.createSidewalks();

    // Add grass patches and dirt spots for variety
    this.createGroundDetails();

    // Determine which special building to create (if any)
    const specialRandom = this.seededRandom();

    if (this.chunkX === 0 && this.chunkZ === 0) {
      // Center chunk - create school
      const schoolX = this.worldX + size / 2;
      const schoolZ = this.worldZ + size / 2;
      this.createSchool(schoolX, schoolZ);
      // Walkway to school entrance
      this.createWalkway(schoolX, schoolZ + 17.5, 4, 8);
    } else if (this.chunkX === 1 && this.chunkZ === 0) {
      // Right of center - create police station
      const policeX = this.worldX + size / 2;
      const policeZ = this.worldZ + size / 2;
      this.createPoliceStation(policeX, policeZ);
      // Parking lot in front
      this.createParkingLot(policeX, policeZ + 15, 12, 8);
    } else if (this.chunkX === -1 && this.chunkZ === 0) {
      // Left of center - create church
      const churchX = this.worldX + size / 2;
      const churchZ = this.worldZ + size / 2;
      this.createChurch(churchX, churchZ);
      // Stone pathway to church
      this.createWalkway(churchX, churchZ + 12, 3, 6);
    } else {
      // Regular residential buildings
      const buildingCount = 2 + Math.floor(this.seededRandom() * 2);

      for (let i = 0; i < buildingCount; i++) {
        const width = 5 + this.seededRandom() * 5;
        const depth = 5 + this.seededRandom() * 5;
        const height = 4 + this.seededRandom() * 3;

        const x = this.worldX + 10 + this.seededRandom() * (size - 20);
        const z = this.worldZ + 10 + this.seededRandom() * (size - 20);

        this.createBuilding(x, z, width, depth, height);

        // Add walkway from sidewalk to front door
        this.createWalkway(x, z + depth / 2 + 2, 1.5, 3);

        // Add realistic details around house
        this.createMailbox(x + width / 2 + 1, z + depth / 2 + 3);
        this.createTrashCans(x - width / 2 - 1.5, z + depth / 2 + 1);
        this.createFence(x, z, width, depth);
        this.createFlowerBed(x + width / 2 - 2, z + depth / 2 + 1.5);
        this.createBushes(x - width / 2 - 1, z - depth / 2 - 1);
      }

      // Add street furniture
      this.createStreetFurniture();
    }

    // Generate street lamps along edges - REDUCED for performance
    // Only add lamps on two edges to avoid uniform limit
    const lampSpacing = 32; // Increased spacing to reduce lamp count
    for (let offset = lampSpacing / 2; offset < size; offset += lampSpacing) {
      // Only lamps on top and left edges (reduce by 50%)
      this.createStreetLamp(this.worldX + offset, this.worldZ + 3);
      this.createStreetLamp(this.worldX + 3, this.worldZ + offset);
    }

    // Add fire hydrants along streets
    const hydrantSpacing = 20;
    for (let offset = 10; offset < size; offset += hydrantSpacing) {
      this.createFireHydrant(this.worldX + offset, this.worldZ + 1.5);
      this.createFireHydrant(this.worldX + 1.5, this.worldZ + offset);
    }
  }

  /**
   * Creates sidewalks around town perimeter
   */
  createSidewalks() {
    const size = GAME_CONFIG.CHUNK_SIZE;
    const sidewalkWidth = 3;
    const sidewalkMat = new THREE.MeshBasicMaterial({ color: 0xa9a9a9 });

    // Top sidewalk
    const topGeo = new THREE.PlaneGeometry(size, sidewalkWidth);
    topGeo.rotateX(-Math.PI / 2);
    const topSidewalk = new THREE.Mesh(topGeo, sidewalkMat);
    topSidewalk.position.set(
      this.worldX + size / 2,
      0.01,
      this.worldZ + sidewalkWidth / 2,
    );
    this.scene.add(topSidewalk);
    this.buildings.push(topSidewalk);

    // Bottom sidewalk
    const bottomSidewalk = new THREE.Mesh(topGeo, sidewalkMat);
    bottomSidewalk.position.set(
      this.worldX + size / 2,
      0.01,
      this.worldZ + size - sidewalkWidth / 2,
    );
    this.scene.add(bottomSidewalk);
    this.buildings.push(bottomSidewalk);

    // Left sidewalk
    const sideGeo = new THREE.PlaneGeometry(sidewalkWidth, size);
    sideGeo.rotateX(-Math.PI / 2);
    const leftSidewalk = new THREE.Mesh(sideGeo, sidewalkMat);
    leftSidewalk.position.set(
      this.worldX + sidewalkWidth / 2,
      0.01,
      this.worldZ + size / 2,
    );
    this.scene.add(leftSidewalk);
    this.buildings.push(leftSidewalk);

    // Right sidewalk
    const rightSidewalk = new THREE.Mesh(sideGeo, sidewalkMat);
    rightSidewalk.position.set(
      this.worldX + size - sidewalkWidth / 2,
      0.01,
      this.worldZ + size / 2,
    );
    this.scene.add(rightSidewalk);
    this.buildings.push(rightSidewalk);
  }

  /**
   * Creates ground details like grass patches and dirt spots
   */
  createGroundDetails() {
    const size = GAME_CONFIG.CHUNK_SIZE;

    // Add random dirt patches
    const dirtCount = 5 + Math.floor(this.seededRandom() * 8);
    const dirtMat = new THREE.MeshBasicMaterial({ color: 0x6b5d46 });

    for (let i = 0; i < dirtCount; i++) {
      const patchSize = 2 + this.seededRandom() * 3;
      const x = this.worldX + 5 + this.seededRandom() * (size - 10);
      const z = this.worldZ + 5 + this.seededRandom() * (size - 10);

      const patchGeo = new THREE.CircleGeometry(patchSize, 8);
      patchGeo.rotateX(-Math.PI / 2);
      const patch = new THREE.Mesh(patchGeo, dirtMat);
      patch.position.set(x, 0.01, z);
      this.scene.add(patch);
      this.buildings.push(patch);
    }

    // Add darker grass patches for variation
    const grassCount = 8 + Math.floor(this.seededRandom() * 10);
    const darkGrassMat = new THREE.MeshBasicMaterial({ color: 0x2a4a1a });

    for (let i = 0; i < grassCount; i++) {
      const patchSize = 1.5 + this.seededRandom() * 2.5;
      const x = this.worldX + 5 + this.seededRandom() * (size - 10);
      const z = this.worldZ + 5 + this.seededRandom() * (size - 10);

      const patchGeo = new THREE.CircleGeometry(patchSize, 8);
      patchGeo.rotateX(-Math.PI / 2);
      const patch = new THREE.Mesh(patchGeo, darkGrassMat);
      patch.position.set(x, 0.005, z);
      this.scene.add(patch);
      this.buildings.push(patch);
    }
  }

  /**
   * Creates a walkway/path
   */
  createWalkway(x, z, width, length) {
    const walkwayMat = new THREE.MeshBasicMaterial({ color: 0x8b8680 });
    const walkwayGeo = new THREE.PlaneGeometry(width, length);
    walkwayGeo.rotateX(-Math.PI / 2);
    const walkway = new THREE.Mesh(walkwayGeo, walkwayMat);
    walkway.position.set(x, 0.015, z);
    this.scene.add(walkway);
    this.buildings.push(walkway);

    // Add border stones
    const stoneMat = new THREE.MeshBasicMaterial({ color: 0x505050 });
    const stoneCount = Math.floor(length / 0.8);

    for (let i = 0; i < stoneCount; i++) {
      const sz = z - length / 2 + i * 0.8;

      // Left border stones
      const leftStoneGeo = new THREE.BoxGeometry(0.3, 0.2, 0.3);
      const leftStone = new THREE.Mesh(leftStoneGeo, stoneMat);
      leftStone.position.set(x - width / 2 - 0.15, 0.02, sz);
      this.scene.add(leftStone);
      this.buildings.push(leftStone);

      // Right border stones
      const rightStone = new THREE.Mesh(leftStoneGeo, stoneMat);
      rightStone.position.set(x + width / 2 + 0.15, 0.02, sz);
      this.scene.add(rightStone);
      this.buildings.push(rightStone);
    }
  }

  /**
   * Creates a parking lot with spaces
   */
  createParkingLot(x, z, width, depth) {
    const asphaltMat = new THREE.MeshBasicMaterial({ color: 0x3a3a3a });
    const lotGeo = new THREE.PlaneGeometry(width, depth);
    lotGeo.rotateX(-Math.PI / 2);
    const lot = new THREE.Mesh(lotGeo, asphaltMat);
    lot.position.set(x, 0.015, z);
    this.scene.add(lot);
    this.buildings.push(lot);

    // Parking space lines (yellow)
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const spaces = 4;
    const spaceWidth = width / spaces;

    for (let i = 1; i < spaces; i++) {
      const lineGeo = new THREE.PlaneGeometry(0.1, depth - 0.5);
      lineGeo.rotateX(-Math.PI / 2);
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(x - width / 2 + i * spaceWidth, 0.02, z);
      this.scene.add(line);
      this.buildings.push(line);
    }
  }

  /**
   * Creates a mailbox
   */
  createMailbox(x, z) {
    const postMat = new THREE.MeshBasicMaterial({ color: 0x4a3a2a });
    const boxMat = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });
    const flagMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    // Post
    const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8);
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(x, 0.6, z);
    this.scene.add(post);
    this.buildings.push(post);

    // Mailbox
    const boxGeo = new THREE.BoxGeometry(0.4, 0.3, 0.6);
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(x, 1.3, z);
    this.scene.add(box);
    this.buildings.push(box);

    // Flag
    const flagGeo = new THREE.BoxGeometry(0.05, 0.15, 0.25);
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(x + 0.25, 1.35, z);
    this.scene.add(flag);
    this.buildings.push(flag);
  }

  /**
   * Creates trash cans
   */
  createTrashCans(x, z) {
    const canMat = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });
    const lidMat = new THREE.MeshBasicMaterial({ color: 0x3a3a3a });

    for (let i = 0; i < 2; i++) {
      const offset = i * 0.6;

      // Can body
      const canGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.8, 8);
      const can = new THREE.Mesh(canGeo, canMat);
      can.position.set(x + offset, 0.4, z);
      this.scene.add(can);
      this.buildings.push(can);

      // Lid
      const lidGeo = new THREE.CylinderGeometry(0.28, 0.26, 0.1, 8);
      const lid = new THREE.Mesh(lidGeo, lidMat);
      lid.position.set(x + offset, 0.85, z);
      this.scene.add(lid);
      this.buildings.push(lid);
    }
  }

  /**
   * Creates a fence around property
   */
  createFence(x, z, width, depth) {
    const fenceMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const fenceHeight = 1.2;
    const postGeo = new THREE.BoxGeometry(0.1, fenceHeight, 0.1);
    const railGeo = new THREE.BoxGeometry(0.05, 0.05, 1);

    const positions = [
      // Back fence
      {
        x: x - width / 2 - 2,
        z: z - depth / 2 - 2,
        horizontal: true,
        length: width + 4,
      },
      // Left fence
      { x: x - width / 2 - 2, z: z, horizontal: false, length: depth },
      // Right fence
      { x: x + width / 2 + 2, z: z, horizontal: false, length: depth },
    ];

    positions.forEach((pos) => {
      const postCount = Math.floor(pos.length / 2);
      for (let i = 0; i <= postCount; i++) {
        const postX = pos.horizontal ? pos.x + i * 2 - pos.length / 2 : pos.x;
        const postZ = pos.horizontal ? pos.z : pos.z + i * 2 - pos.length / 2;

        // Post
        const post = new THREE.Mesh(postGeo, fenceMat);
        post.position.set(postX, fenceHeight / 2, postZ);
        this.scene.add(post);
        this.buildings.push(post);

        // Rails between posts
        if (i < postCount) {
          for (let r = 0; r < 2; r++) {
            const railHeight = 0.3 + r * 0.5;
            const rail = new THREE.Mesh(railGeo, fenceMat);
            if (pos.horizontal) {
              rail.rotation.y = 0;
              rail.position.set(postX + 1, railHeight, postZ);
            } else {
              rail.rotation.y = Math.PI / 2;
              rail.position.set(postX, railHeight, postZ + 1);
            }
            this.scene.add(rail);
            this.buildings.push(rail);
          }
        }
      }
    });
  }

  /**
   * Creates a flower bed
   */
  createFlowerBed(x, z) {
    const bedMat = new THREE.MeshBasicMaterial({ color: 0x3a2a1a });
    const flowerColors = [0xff0000, 0xff00ff, 0xffff00, 0xff6600, 0xffffff];

    // Soil bed
    const bedGeo = new THREE.BoxGeometry(2, 0.15, 0.8);
    const bed = new THREE.Mesh(bedGeo, bedMat);
    bed.position.set(x, 0.075, z);
    this.scene.add(bed);
    this.buildings.push(bed);

    // Flowers
    for (let i = 0; i < 8; i++) {
      const flowerX = x - 0.8 + (i % 4) * 0.5;
      const flowerZ = z - 0.3 + Math.floor(i / 4) * 0.5;
      const color =
        flowerColors[Math.floor(this.seededRandom() * flowerColors.length)];

      // Stem
      const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4);
      const stemMat = new THREE.MeshBasicMaterial({ color: 0x00aa00 });
      const stem = new THREE.Mesh(stemGeo, stemMat);
      stem.position.set(flowerX, 0.3, flowerZ);
      this.scene.add(stem);
      this.buildings.push(stem);

      // Flower
      const flowerGeo = new THREE.SphereGeometry(0.08, 6, 6);
      const flowerMat = new THREE.MeshBasicMaterial({ color: color });
      const flower = new THREE.Mesh(flowerGeo, flowerMat);
      flower.position.set(flowerX, 0.5, flowerZ);
      this.scene.add(flower);
      this.buildings.push(flower);
    }
  }

  /**
   * Creates decorative bushes
   */
  createBushes(x, z) {
    const bushMat = new THREE.MeshBasicMaterial({ color: 0x2a5a1a });

    for (let i = 0; i < 3; i++) {
      const bushGeo = new THREE.SphereGeometry(
        0.4 + this.seededRandom() * 0.2,
        8,
        6,
      );
      const bush = new THREE.Mesh(bushGeo, bushMat);
      bush.position.set(x + i * 0.6, 0.3, z);
      bush.scale.y = 0.7;
      this.scene.add(bush);
      this.buildings.push(bush);
    }
  }

  /**
   * Creates fire hydrant
   */
  createFireHydrant(x, z) {
    const hydrantMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const capMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    // Main body
    const bodyGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.6, 8);
    const body = new THREE.Mesh(bodyGeo, hydrantMat);
    body.position.set(x, 0.3, z);
    this.scene.add(body);
    this.buildings.push(body);

    // Top cap
    const capGeo = new THREE.CylinderGeometry(0.18, 0.15, 0.15, 8);
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(x, 0.675, z);
    this.scene.add(cap);
    this.buildings.push(cap);

    // Side outlets
    const outletGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.15, 6);
    outletGeo.rotateZ(Math.PI / 2);
    const leftOutlet = new THREE.Mesh(outletGeo, hydrantMat);
    leftOutlet.position.set(x - 0.15, 0.4, z);
    this.scene.add(leftOutlet);
    this.buildings.push(leftOutlet);

    const rightOutlet = new THREE.Mesh(outletGeo, hydrantMat);
    rightOutlet.position.set(x + 0.15, 0.4, z);
    this.scene.add(rightOutlet);
    this.buildings.push(rightOutlet);
  }

  /**
   * Creates street furniture (benches, signs)
   */
  createStreetFurniture() {
    const size = GAME_CONFIG.CHUNK_SIZE;

    // Bench near corner
    this.createBench(this.worldX + 8, this.worldZ + 8);

    // Stop sign at intersection
    this.createStopSign(this.worldX + 2, this.worldZ + 2);
  }

  /**
   * Creates a park bench
   */
  createBench(x, z) {
    const woodMat = new THREE.MeshBasicMaterial({ color: 0x654321 });
    const metalMat = new THREE.MeshBasicMaterial({ color: 0x444444 });

    // Seat
    const seatGeo = new THREE.BoxGeometry(1.5, 0.1, 0.4);
    const seat = new THREE.Mesh(seatGeo, woodMat);
    seat.position.set(x, 0.5, z);
    this.scene.add(seat);
    this.buildings.push(seat);

    // Backrest
    const backGeo = new THREE.BoxGeometry(1.5, 0.6, 0.1);
    const back = new THREE.Mesh(backGeo, woodMat);
    back.position.set(x, 0.8, z - 0.2);
    this.scene.add(back);
    this.buildings.push(back);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.08, 0.5, 0.08);
    for (let lx of [-0.6, 0.6]) {
      for (let lz of [-0.15, 0.15]) {
        const leg = new THREE.Mesh(legGeo, metalMat);
        leg.position.set(x + lx, 0.25, z + lz);
        this.scene.add(leg);
        this.buildings.push(leg);
      }
    }
  }

  /**
   * Creates a stop sign
   */
  createStopSign(x, z) {
    const postMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const signMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const textMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Post
    const postGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.5, 8);
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.set(x, 1.25, z);
    this.scene.add(post);
    this.buildings.push(post);

    // Sign (octagon approximation)
    const signGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 8);
    signGeo.rotateX(Math.PI / 2);
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(x, 2.5, z);
    this.scene.add(sign);
    this.buildings.push(sign);

    // White border
    const borderGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.06, 8);
    borderGeo.rotateX(Math.PI / 2);
    const border = new THREE.Mesh(borderGeo, textMat);
    border.position.set(x, 2.5, z - 0.01);
    this.scene.add(border);
    this.buildings.push(border);
  }

  /**
   * Creates a detailed low-poly house with interior
   */
  createBuilding(x, z, width, depth, height) {
    // Store building data for vessel placement and collisions
    this.buildingData.push({ x, z, width, depth, height });

    const wallThickness = 0.3;
    const doorWidth = 2;
    const doorHeight = 3;

    // Create walls with door opening on front
    this.createWalls(
      x,
      z,
      width,
      depth,
      height,
      wallThickness,
      doorWidth,
      doorHeight,
    );

    // Add roof
    this.createRoof(x, z, width, depth, height);

    // Add windows
    this.createWindows(x, z, width, depth, height);

    // Add interior furniture
    this.createInterior(x, z, width, depth, height);

    // Add door
    this.createDoor(x, z, width, depth, doorWidth, doorHeight);
  }

  /**
   * Creates walls with door opening
   */
  createWalls(
    x,
    z,
    width,
    depth,
    height,
    wallThickness,
    doorWidth,
    doorHeight,
  ) {
    // Varied wall colors for realism (brick red, tan, gray, white)
    const wallColors = [0x8b4513, 0xd2b48c, 0x808080, 0xe8e8e8, 0xa0522d];
    const wallColor =
      wallColors[Math.floor(this.seededRandom() * wallColors.length)];
    const wallMaterial = new THREE.MeshBasicMaterial({ color: wallColor });
    const trimMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Front wall (with door opening) - split into two parts
    const frontLeftWidth = (width - doorWidth) / 2;

    // Left part of front wall
    const frontLeftGeo = new THREE.BoxGeometry(
      frontLeftWidth,
      height,
      wallThickness,
    );
    const frontLeft = new THREE.Mesh(frontLeftGeo, wallMaterial);
    frontLeft.position.set(
      x - width / 2 + frontLeftWidth / 2,
      height / 2,
      z + depth / 2,
    );
    frontLeft.userData.isBuilding = true;
    frontLeft.userData.isWall = true;
    this.scene.add(frontLeft);
    this.buildings.push(frontLeft);

    // Right part of front wall
    const frontRight = new THREE.Mesh(frontLeftGeo, wallMaterial);
    frontRight.position.set(
      x + width / 2 - frontLeftWidth / 2,
      height / 2,
      z + depth / 2,
    );
    frontRight.userData.isBuilding = true;
    frontRight.userData.isWall = true;
    this.scene.add(frontRight);
    this.buildings.push(frontRight);

    // Top part above door
    const doorTopGeo = new THREE.BoxGeometry(
      doorWidth,
      height - doorHeight,
      wallThickness,
    );
    const doorTop = new THREE.Mesh(doorTopGeo, wallMaterial);
    doorTop.position.set(x, height - (height - doorHeight) / 2, z + depth / 2);
    doorTop.userData.isBuilding = true;
    doorTop.userData.isWall = true;
    this.scene.add(doorTop);
    this.buildings.push(doorTop);

    // Back wall
    const backWallGeo = new THREE.BoxGeometry(width, height, wallThickness);
    const backWall = new THREE.Mesh(backWallGeo, wallMaterial);
    backWall.position.set(x, height / 2, z - depth / 2);
    backWall.userData.isBuilding = true;
    backWall.userData.isWall = true;
    this.scene.add(backWall);
    this.buildings.push(backWall);

    // Left wall
    const sideWallGeo = new THREE.BoxGeometry(wallThickness, height, depth);
    const leftWall = new THREE.Mesh(sideWallGeo, wallMaterial);
    leftWall.position.set(x - width / 2, height / 2, z);
    leftWall.userData.isBuilding = true;
    leftWall.userData.isWall = true;
    this.scene.add(leftWall);
    this.buildings.push(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(sideWallGeo, wallMaterial);
    rightWall.position.set(x + width / 2, height / 2, z);
    rightWall.userData.isBuilding = true;
    rightWall.userData.isWall = true;
    this.scene.add(rightWall);
    this.buildings.push(rightWall);

    // Floor
    const floorGeo = new THREE.BoxGeometry(width, 0.1, depth);
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0x4a3a2a });
    const floor = new THREE.Mesh(floorGeo, floorMaterial);
    floor.position.set(x, 0.05, z);
    this.scene.add(floor);
    this.buildings.push(floor);

    // Foundation - stone base
    const foundationGeo = new THREE.BoxGeometry(width + 0.4, 0.6, depth + 0.4);
    const foundationMat = new THREE.MeshBasicMaterial({ color: 0x505050 });
    const foundation = new THREE.Mesh(foundationGeo, foundationMat);
    foundation.position.set(x, 0.3, z);
    this.scene.add(foundation);
    this.buildings.push(foundation);

    // Trim around top of walls
    const trimHeight = 0.15;
    const trimGeo = new THREE.BoxGeometry(width + 0.2, trimHeight, depth + 0.2);
    const trim = new THREE.Mesh(trimGeo, trimMaterial);
    trim.position.set(x, height - trimHeight / 2, z);
    this.scene.add(trim);
    this.buildings.push(trim);
  }

  /**
   * Creates roof
   */
  createRoof(x, z, width, depth, height) {
    const roofHeight = height * 0.4;

    // Varied roof colors (dark brown, gray, dark red, black)
    const roofColors = [0x3a2a1a, 0x404040, 0x5a2a2a, 0x2a2a2a];
    const roofColor =
      roofColors[Math.floor(this.seededRandom() * roofColors.length)];
    const roofMaterial = new THREE.MeshBasicMaterial({ color: roofColor });

    // Pitched roof using pyramid
    const roofGeometry = new THREE.ConeGeometry(
      Math.max(width, depth) * 0.72,
      roofHeight,
      4,
    );
    roofGeometry.rotateY(Math.PI / 4);

    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.set(x, height + roofHeight / 2, z);
    roof.userData.isRoof = true;
    this.scene.add(roof);
    this.buildings.push(roof);

    // Chimney (60% chance)
    if (this.seededRandom() > 0.4) {
      const chimneyGeo = new THREE.BoxGeometry(0.8, 2, 0.8);
      const chimneyMat = new THREE.MeshBasicMaterial({ color: 0x6a4a4a });
      const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
      const chimneyX = x + (this.seededRandom() - 0.5) * width * 0.4;
      const chimneyZ = z + (this.seededRandom() - 0.5) * depth * 0.4;
      chimney.position.set(chimneyX, height + roofHeight * 0.6 + 1, chimneyZ);
      this.scene.add(chimney);
      this.buildings.push(chimney);
    }
  }

  /**
   * Creates door
   */
  createDoor(x, z, width, depth, doorWidth, doorHeight) {
    // Door frame
    const frameMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const frameThick = 0.15;

    // Left frame
    const leftFrameGeo = new THREE.BoxGeometry(
      frameThick,
      doorHeight + frameThick,
      frameThick,
    );
    const leftFrame = new THREE.Mesh(leftFrameGeo, frameMat);
    leftFrame.position.set(
      x - doorWidth / 2 - frameThick / 2,
      doorHeight / 2,
      z + depth / 2 + 0.15,
    );
    this.scene.add(leftFrame);
    this.buildings.push(leftFrame);

    // Right frame
    const rightFrame = new THREE.Mesh(leftFrameGeo, frameMat);
    rightFrame.position.set(
      x + doorWidth / 2 + frameThick / 2,
      doorHeight / 2,
      z + depth / 2 + 0.15,
    );
    this.scene.add(rightFrame);
    this.buildings.push(rightFrame);

    // Top frame
    const topFrameGeo = new THREE.BoxGeometry(
      doorWidth + frameThick * 2,
      frameThick,
      frameThick,
    );
    const topFrame = new THREE.Mesh(topFrameGeo, frameMat);
    topFrame.position.set(x, doorHeight + frameThick / 2, z + depth / 2 + 0.15);
    this.scene.add(topFrame);
    this.buildings.push(topFrame);

    // Door panel
    const doorGeo = new THREE.BoxGeometry(
      doorWidth - 0.2,
      doorHeight - 0.2,
      0.15,
    );
    const doorColors = [0x4a2a1a, 0x8b4513, 0x654321, 0x3a3a3a];
    const doorColor =
      doorColors[Math.floor(this.seededRandom() * doorColors.length)];
    const doorMaterial = new THREE.MeshBasicMaterial({ color: doorColor });
    const door = new THREE.Mesh(doorGeo, doorMaterial);
    door.position.set(x, doorHeight / 2, z + depth / 2 + 0.1);
    door.userData.isDoor = true;
    door.userData.isOpen = false;
    door.userData.closedPosition = door.position.clone();
    door.userData.closedRotation = door.rotation.clone();
    door.userData.doorPivot = {
      x: x - doorWidth / 2 + 0.1,
      z: z + depth / 2 + 0.1,
    };
    door.userData.buildingPosition = { x, z, width, depth };
    this.scene.add(door);
    this.buildings.push(door);

    // Door panels (decorative)
    const panelGeo = new THREE.BoxGeometry(
      doorWidth * 0.4,
      doorHeight * 0.35,
      0.05,
    );
    const panelMat = new THREE.MeshBasicMaterial({ color: doorColor * 0.8 });

    // Top panels
    const topLeftPanel = new THREE.Mesh(panelGeo, panelMat);
    topLeftPanel.position.set(
      x - doorWidth * 0.22,
      doorHeight * 0.65,
      z + depth / 2 + 0.18,
    );
    this.scene.add(topLeftPanel);
    this.buildings.push(topLeftPanel);

    const topRightPanel = new THREE.Mesh(panelGeo, panelMat);
    topRightPanel.position.set(
      x + doorWidth * 0.22,
      doorHeight * 0.65,
      z + depth / 2 + 0.18,
    );
    this.scene.add(topRightPanel);
    this.buildings.push(topRightPanel);

    // Bottom panels
    const botLeftPanel = new THREE.Mesh(panelGeo, panelMat);
    botLeftPanel.position.set(
      x - doorWidth * 0.22,
      doorHeight * 0.25,
      z + depth / 2 + 0.18,
    );
    this.scene.add(botLeftPanel);
    this.buildings.push(botLeftPanel);

    const botRightPanel = new THREE.Mesh(panelGeo, panelMat);
    botRightPanel.position.set(
      x + doorWidth * 0.22,
      doorHeight * 0.25,
      z + depth / 2 + 0.18,
    );
    this.scene.add(botRightPanel);
    this.buildings.push(botRightPanel);

    // Door handle
    const handleGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8);
    handleGeo.rotateZ(Math.PI / 2);
    const handleMaterial = new THREE.MeshBasicMaterial({ color: 0xd4af37 });
    const handle = new THREE.Mesh(handleGeo, handleMaterial);
    handle.position.set(
      x + doorWidth / 2 - 0.35,
      doorHeight * 0.45,
      z + depth / 2 + 0.25,
    );
    handle.userData.isDoorHandle = true;
    handle.userData.parentDoor = door;
    this.scene.add(handle);
    this.buildings.push(handle);

    // Doorknob
    const knobGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const knob = new THREE.Mesh(knobGeo, handleMaterial);
    knob.position.set(
      x + doorWidth / 2 - 0.35,
      doorHeight * 0.45,
      z + depth / 2 + 0.35,
    );
    this.scene.add(knob);
    this.buildings.push(knob);
  }

  /**
   * Creates interior furniture
   */
  createInterior(x, z, width, depth, height) {
    // Bedroom area - back corner
    this.createBed(x - width / 2 + 2, z - depth / 2 + 2);
    this.createShelf(x + width / 2 - 0.5, z - depth / 2 + 2);
    this.createNightstand(x - width / 2 + 3.5, z - depth / 2 + 1);

    // Dining area - center
    this.createTable(x, z + 1);
    this.createChair(x - 1.2, z + 1.8);
    this.createChair(x + 1.2, z + 1.8);
    this.createChair(x - 1.2, z + 0.2);
    this.createChair(x + 1.2, z + 0.2);

    // Kitchen area - front corner
    this.createKitchen(x - width / 2 + 3, z + depth / 2 - 3, width);

    // Living room - side area
    this.createCouch(x + width / 2 - 2, z + 2);
    this.createCoffeeTable(x + width / 2 - 2.5, z);
    this.createTV(x + width / 2 - 0.3, z - 1);

    // Bathroom - corner
    this.createBathroom(x + width / 2 - 2, z - depth / 2 + 2);

    // Decorations
    this.createLamp(x, z + 1); // Table lamp
    this.createRug(x, z); // Floor rug
  }

  /**
   * Creates a bed
   */
  createBed(x, z) {
    const bedMaterial = new THREE.MeshBasicMaterial({ color: 0x6a4a3a });
    const mattressMaterial = new THREE.MeshBasicMaterial({ color: 0x8a6a5a });

    // Bed frame
    const frameGeo = new THREE.BoxGeometry(2, 0.3, 3);
    const frame = new THREE.Mesh(frameGeo, bedMaterial);
    frame.position.set(x, 0.15, z);
    this.scene.add(frame);
    this.buildings.push(frame);

    // Mattress
    const mattressGeo = new THREE.BoxGeometry(1.8, 0.4, 2.8);
    const mattress = new THREE.Mesh(mattressGeo, mattressMaterial);
    mattress.position.set(x, 0.5, z);
    this.scene.add(mattress);
    this.buildings.push(mattress);

    // Pillow
    const pillowGeo = new THREE.BoxGeometry(0.6, 0.2, 0.4);
    const pillowMaterial = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
    const pillow = new THREE.Mesh(pillowGeo, pillowMaterial);
    pillow.position.set(x, 0.8, z - 1.2);
    this.scene.add(pillow);
    this.buildings.push(pillow);
  }

  /**
   * Creates a table
   */
  createTable(x, z) {
    const tableMaterial = new THREE.MeshBasicMaterial({ color: 0x5a3a2a });

    // Table top
    const topGeo = new THREE.BoxGeometry(2, 0.1, 1.5);
    const top = new THREE.Mesh(topGeo, tableMaterial);
    top.position.set(x, 1.5, z);
    this.scene.add(top);
    this.buildings.push(top);

    // Table legs
    const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 6);
    const positions = [
      [x - 0.8, 0.75, z - 0.6],
      [x + 0.8, 0.75, z - 0.6],
      [x - 0.8, 0.75, z + 0.6],
      [x + 0.8, 0.75, z + 0.6],
    ];

    positions.forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(legGeo, tableMaterial);
      leg.position.set(lx, ly, lz);
      this.scene.add(leg);
      this.buildings.push(leg);
    });
  }

  /**
   * Creates a chair
   */
  createChair(x, z) {
    const chairMaterial = new THREE.MeshBasicMaterial({ color: 0x5a3a2a });

    // Seat
    const seatGeo = new THREE.BoxGeometry(0.8, 0.1, 0.8);
    const seat = new THREE.Mesh(seatGeo, chairMaterial);
    seat.position.set(x, 1, z);
    this.scene.add(seat);
    this.buildings.push(seat);

    // Backrest
    const backGeo = new THREE.BoxGeometry(0.8, 0.8, 0.1);
    const back = new THREE.Mesh(backGeo, chairMaterial);
    back.position.set(x, 1.5, z - 0.35);
    this.scene.add(back);
    this.buildings.push(back);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 6);
    const legPositions = [
      [x - 0.3, 0.5, z - 0.3],
      [x + 0.3, 0.5, z - 0.3],
      [x - 0.3, 0.5, z + 0.3],
      [x + 0.3, 0.5, z + 0.3],
    ];

    legPositions.forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(legGeo, chairMaterial);
      leg.position.set(lx, ly, lz);
      this.scene.add(leg);
      this.buildings.push(leg);
    });
  }

  /**
   * Creates a nightstand
   */
  createNightstand(x, z) {
    const nightstandMat = new THREE.MeshBasicMaterial({ color: 0x6a4a3a });

    // Main body
    const bodyGeo = new THREE.BoxGeometry(0.8, 0.8, 0.6);
    const body = new THREE.Mesh(bodyGeo, nightstandMat);
    body.position.set(x, 0.4, z);
    this.scene.add(body);
    this.buildings.push(body);

    // Drawer front
    const drawerGeo = new THREE.BoxGeometry(0.7, 0.3, 0.05);
    const drawerMat = new THREE.MeshBasicMaterial({ color: 0x5a3a2a });
    const drawer = new THREE.Mesh(drawerGeo, drawerMat);
    drawer.position.set(x, 0.5, z + 0.35);
    this.scene.add(drawer);
    this.buildings.push(drawer);

    // Drawer handle
    const handleGeo = new THREE.SphereGeometry(0.05, 6, 6);
    const handleMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(x, 0.5, z + 0.4);
    this.scene.add(handle);
    this.buildings.push(handle);
  }

  /**
   * Creates a shelf
   */
  createShelf(x, z) {
    const shelfMaterial = new THREE.MeshBasicMaterial({ color: 0x6a4a3a });

    // Shelves
    for (let i = 0; i < 3; i++) {
      const shelfGeo = new THREE.BoxGeometry(1.5, 0.1, 0.4);
      const shelf = new THREE.Mesh(shelfGeo, shelfMaterial);
      shelf.position.set(x, 1 + i * 0.8, z);
      this.scene.add(shelf);
      this.buildings.push(shelf);
    }

    // Side supports
    const supportGeo = new THREE.BoxGeometry(0.1, 2.5, 0.4);
    const leftSupport = new THREE.Mesh(supportGeo, shelfMaterial);
    leftSupport.position.set(x - 0.7, 1.8, z);
    this.scene.add(leftSupport);
    this.buildings.push(leftSupport);

    const rightSupport = new THREE.Mesh(supportGeo, shelfMaterial);
    rightSupport.position.set(x + 0.7, 1.8, z);
    this.scene.add(rightSupport);
    this.buildings.push(rightSupport);
  }

  /**
   * Creates a kitchen area
   */
  createKitchen(x, z, width) {
    const counterMat = new THREE.MeshBasicMaterial({ color: 0xd4a574 });
    const applianceMat = new THREE.MeshBasicMaterial({ color: 0xe8e8e8 });

    // Counter
    const counterGeo = new THREE.BoxGeometry(3, 1, 0.8);
    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.set(x, 0.5, z);
    this.scene.add(counter);
    this.buildings.push(counter);

    // Sink on counter
    const sinkGeo = new THREE.BoxGeometry(0.6, 0.2, 0.5);
    const sinkMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    const sink = new THREE.Mesh(sinkGeo, sinkMat);
    sink.position.set(x - 0.8, 1.1, z);
    this.scene.add(sink);
    this.buildings.push(sink);

    // Stove
    const stoveGeo = new THREE.BoxGeometry(0.9, 1, 0.8);
    const stove = new THREE.Mesh(stoveGeo, applianceMat);
    stove.position.set(x + 1.2, 0.5, z);
    this.scene.add(stove);
    this.buildings.push(stove);

    // Stove burners
    const burnerGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 8);
    const burnerMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    for (let bx of [-0.25, 0.25]) {
      for (let bz of [-0.2, 0.2]) {
        const burner = new THREE.Mesh(burnerGeo, burnerMat);
        burner.position.set(x + 1.2 + bx, 1.05, z + bz);
        this.scene.add(burner);
        this.buildings.push(burner);
      }
    }

    // Refrigerator
    const fridgeGeo = new THREE.BoxGeometry(0.8, 2, 0.8);
    const fridge = new THREE.Mesh(fridgeGeo, applianceMat);
    fridge.position.set(x - 1.8, 1, z);
    this.scene.add(fridge);
    this.buildings.push(fridge);

    // Upper cabinets
    const cabinetGeo = new THREE.BoxGeometry(3, 0.8, 0.4);
    const cabinetMat = new THREE.MeshBasicMaterial({ color: 0x6a4a3a });
    const cabinet = new THREE.Mesh(cabinetGeo, cabinetMat);
    cabinet.position.set(x, 2.2, z - 0.5);
    this.scene.add(cabinet);
    this.buildings.push(cabinet);
  }

  /**
   * Creates a couch
   */
  createCouch(x, z) {
    const couchMat = new THREE.MeshBasicMaterial({ color: 0x4a6a8a });

    // Seat
    const seatGeo = new THREE.BoxGeometry(2.5, 0.4, 1);
    const seat = new THREE.Mesh(seatGeo, couchMat);
    seat.position.set(x, 0.6, z);
    this.scene.add(seat);
    this.buildings.push(seat);

    // Backrest
    const backGeo = new THREE.BoxGeometry(2.5, 0.8, 0.3);
    const back = new THREE.Mesh(backGeo, couchMat);
    back.position.set(x, 1.2, z - 0.5);
    this.scene.add(back);
    this.buildings.push(back);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.3, 0.6, 1);
    const leftArm = new THREE.Mesh(armGeo, couchMat);
    leftArm.position.set(x - 1.25, 1, z);
    this.scene.add(leftArm);
    this.buildings.push(leftArm);

    const rightArm = new THREE.Mesh(armGeo, couchMat);
    rightArm.position.set(x + 1.25, 1, z);
    this.scene.add(rightArm);
    this.buildings.push(rightArm);

    // Cushions
    const cushionGeo = new THREE.BoxGeometry(0.7, 0.2, 0.8);
    const cushionMat = new THREE.MeshBasicMaterial({ color: 0x5a7a9a });
    for (let cx of [-0.8, 0, 0.8]) {
      const cushion = new THREE.Mesh(cushionGeo, cushionMat);
      cushion.position.set(x + cx, 0.9, z);
      this.scene.add(cushion);
      this.buildings.push(cushion);
    }
  }

  /**
   * Creates a coffee table
   */
  createCoffeeTable(x, z) {
    const tableMat = new THREE.MeshBasicMaterial({ color: 0x5a3a2a });

    // Top
    const topGeo = new THREE.BoxGeometry(1.5, 0.1, 0.8);
    const top = new THREE.Mesh(topGeo, tableMat);
    top.position.set(x, 0.5, z);
    this.scene.add(top);
    this.buildings.push(top);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.1, 0.5, 0.1);
    for (let lx of [-0.6, 0.6]) {
      for (let lz of [-0.3, 0.3]) {
        const leg = new THREE.Mesh(legGeo, tableMat);
        leg.position.set(x + lx, 0.25, z + lz);
        this.scene.add(leg);
        this.buildings.push(leg);
      }
    }
  }

  /**
   * Creates a TV
   */
  createTV(x, z) {
    // TV stand
    const standGeo = new THREE.BoxGeometry(1.2, 0.6, 0.4);
    const standMat = new THREE.MeshBasicMaterial({ color: 0x3a3a3a });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.set(x, 0.3, z);
    this.scene.add(stand);
    this.buildings.push(stand);

    // TV screen
    const screenGeo = new THREE.BoxGeometry(1, 0.6, 0.1);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(x, 1, z);
    this.scene.add(screen);
    this.buildings.push(screen);

    // Screen display (blue glow)
    const displayGeo = new THREE.PlaneGeometry(0.9, 0.5);
    const displayMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.6,
    });
    const display = new THREE.Mesh(displayGeo, displayMat);
    display.position.set(x, 1, z + 0.06);
    this.scene.add(display);
    this.buildings.push(display);
  }

  /**
   * Creates a bathroom area
   */
  createBathroom(x, z) {
    const fixtureMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Toilet
    const toiletBaseGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.4, 8);
    const toiletBase = new THREE.Mesh(toiletBaseGeo, fixtureMat);
    toiletBase.position.set(x, 0.2, z);
    this.scene.add(toiletBase);
    this.buildings.push(toiletBase);

    const toiletSeatGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.1, 8);
    const toiletSeat = new THREE.Mesh(toiletSeatGeo, fixtureMat);
    toiletSeat.position.set(x, 0.45, z);
    this.scene.add(toiletSeat);
    this.buildings.push(toiletSeat);

    const tankGeo = new THREE.BoxGeometry(0.4, 0.5, 0.2);
    const tank = new THREE.Mesh(tankGeo, fixtureMat);
    tank.position.set(x, 0.65, z - 0.3);
    this.scene.add(tank);
    this.buildings.push(tank);

    // Sink
    const sinkBaseGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.8, 8);
    const sinkBase = new THREE.Mesh(sinkBaseGeo, fixtureMat);
    sinkBase.position.set(x + 0.8, 0.4, z);
    this.scene.add(sinkBase);
    this.buildings.push(sinkBase);

    const basinGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.15, 8);
    const basin = new THREE.Mesh(basinGeo, fixtureMat);
    basin.position.set(x + 0.8, 0.85, z);
    this.scene.add(basin);
    this.buildings.push(basin);
  }

  /**
   * Creates a lamp
   */
  createLamp(x, z) {
    const baseMat = new THREE.MeshBasicMaterial({ color: 0x6a4a3a });
    const shadeMat = new THREE.MeshBasicMaterial({ color: 0xffeeaa });

    // Base
    const baseGeo = new THREE.CylinderGeometry(0.1, 0.15, 0.1, 8);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(x, 1.55, z);
    this.scene.add(base);
    this.buildings.push(base);

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8);
    const pole = new THREE.Mesh(poleGeo, baseMat);
    pole.position.set(x, 1.8, z);
    this.scene.add(pole);
    this.buildings.push(pole);

    // Shade
    const shadeGeo = new THREE.CylinderGeometry(0.15, 0.25, 0.3, 8);
    const shade = new THREE.Mesh(shadeGeo, shadeMat);
    shade.position.set(x, 2.1, z);
    this.scene.add(shade);
    this.buildings.push(shade);
  }

  /**
   * Creates a floor rug
   */
  createRug(x, z) {
    const rugGeo = new THREE.PlaneGeometry(3, 2);
    const rugMat = new THREE.MeshBasicMaterial({
      color: 0x8a4a3a,
      side: THREE.DoubleSide,
    });
    const rug = new THREE.Mesh(rugGeo, rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(x, 0.02, z);
    this.scene.add(rug);
    this.buildings.push(rug);

    // Rug pattern
    const patternGeo = new THREE.PlaneGeometry(2.5, 1.5);
    const patternMat = new THREE.MeshBasicMaterial({
      color: 0xaa6a5a,
      side: THREE.DoubleSide,
    });
    const pattern = new THREE.Mesh(patternGeo, patternMat);
    pattern.rotation.x = -Math.PI / 2;
    pattern.position.set(x, 0.03, z);
    this.scene.add(pattern);
    this.buildings.push(pattern);
  }

  /**
   * Creates glowing windows on a building
   */
  createWindows(buildingX, buildingZ, width, depth, height) {
    const windowMaterial = new THREE.MeshBasicMaterial({
      color: 0xaaccff,
      transparent: true,
      opacity: 0.7,
    });

    const frameMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const windowWidth = 1.2;
    const windowHeight = 1.6;
    const windowGeometry = new THREE.PlaneGeometry(windowWidth, windowHeight);

    // Windows on front and back
    const floors = Math.floor(height / 3);
    const windowsPerFloor = Math.floor(width / 3);

    for (let floor = 0; floor < floors; floor++) {
      for (let w = 0; w < windowsPerFloor; w++) {
        const wx = buildingX - width / 2 + 1.8 + w * 2.8;
        const wy = 1.8 + floor * 2.8;

        // Skip door area on first floor front
        const isDoorArea = floor === 0 && Math.abs(wx - buildingX) < 1.5;
        if (isDoorArea) continue;

        // Window frame - front
        const frameGeo = new THREE.PlaneGeometry(
          windowWidth + 0.3,
          windowHeight + 0.3,
        );
        const frontFrame = new THREE.Mesh(frameGeo, frameMat);
        frontFrame.position.set(wx, wy, buildingZ + depth / 2 + 0.02);
        this.scene.add(frontFrame);
        this.buildings.push(frontFrame);

        // Window pane - front
        const frontWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        frontWindow.position.set(wx, wy, buildingZ + depth / 2 + 0.03);
        this.scene.add(frontWindow);
        this.buildings.push(frontWindow);

        // Window cross bars (muntins)
        const barMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
        const vBarGeo = new THREE.PlaneGeometry(0.05, windowHeight);
        const hBarGeo = new THREE.PlaneGeometry(windowWidth, 0.05);

        const vBar = new THREE.Mesh(vBarGeo, barMat);
        vBar.position.set(wx, wy, buildingZ + depth / 2 + 0.04);
        this.scene.add(vBar);
        this.buildings.push(vBar);

        const hBar = new THREE.Mesh(hBarGeo, barMat);
        hBar.position.set(wx, wy, buildingZ + depth / 2 + 0.04);
        this.scene.add(hBar);
        this.buildings.push(hBar);

        // Window sill
        const sillGeo = new THREE.BoxGeometry(windowWidth + 0.4, 0.1, 0.25);
        const sill = new THREE.Mesh(sillGeo, frameMat);
        sill.position.set(
          wx,
          wy - windowHeight / 2 - 0.05,
          buildingZ + depth / 2 + 0.15,
        );
        this.scene.add(sill);
        this.buildings.push(sill);

        // Back window with frame
        const backFrame = new THREE.Mesh(frameGeo, frameMat);
        backFrame.position.set(wx, wy, buildingZ - depth / 2 - 0.02);
        backFrame.rotation.y = Math.PI;
        this.scene.add(backFrame);
        this.buildings.push(backFrame);

        const backWindow = new THREE.Mesh(windowGeometry, windowMaterial);
        backWindow.position.set(wx, wy, buildingZ - depth / 2 - 0.03);
        backWindow.rotation.y = Math.PI;
        this.scene.add(backWindow);
        this.buildings.push(backWindow);

        const backVBar = new THREE.Mesh(vBarGeo, barMat);
        backVBar.position.set(wx, wy, buildingZ - depth / 2 - 0.04);
        backVBar.rotation.y = Math.PI;
        this.scene.add(backVBar);
        this.buildings.push(backVBar);

        const backHBar = new THREE.Mesh(hBarGeo, barMat);
        backHBar.position.set(wx, wy, buildingZ - depth / 2 - 0.04);
        backHBar.rotation.y = Math.PI;
        this.scene.add(backHBar);
        this.buildings.push(backHBar);
      }
    }
  }

  /**
   * Creates a street lamp with point light
   */
  createStreetLamp(x, z) {
    this.lampPositions.push({ x, y: 0, z });

    // Create point light for the lamp - brighter with larger radius
    const light = new THREE.PointLight(0xffcc66, 2.5, 25, 1.5);
    light.position.set(x, 5, z);
    this.scene.add(light);
    this.pointLights.push(light);

    // Lamp post (visible body) - use MeshBasicMaterial
    const postGeometry = new THREE.CylinderGeometry(0.1, 0.15, 5, 8);
    const postMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const post = new THREE.Mesh(postGeometry, postMaterial);
    post.position.set(x, 2.5, z);
    this.scene.add(post);
    this.buildings.push(post);

    // Lamp arm (horizontal part)
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 6);
    const arm = new THREE.Mesh(armGeometry, postMaterial);
    arm.position.set(x, 5, z);
    arm.rotation.z = Math.PI / 2;
    this.scene.add(arm);
    this.buildings.push(arm);

    // Lamp head (glowing bulb) - brighter
    const bulbGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const bulbMaterial = new THREE.MeshBasicMaterial({ color: 0xffffee });
    const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
    bulb.position.set(x, 5.2, z);
    this.scene.add(bulb);
    this.buildings.push(bulb);

    // Add a secondary glow sphere for more visible light
    const glowGeometry = new THREE.SphereGeometry(0.6, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffeeaa,
      transparent: true,
      opacity: 0.3,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(x, 5.2, z);
    this.scene.add(glow);
    this.buildings.push(glow);
  }

  /**
   * Generates dense forest with trees
   */
  generateForest() {
    const size = GAME_CONFIG.CHUNK_SIZE;
    const treeCount = 20 + Math.floor(this.seededRandom() * 30);

    for (let i = 0; i < treeCount; i++) {
      const x = this.worldX + this.seededRandom() * size;
      const z = this.worldZ + this.seededRandom() * size;

      this.treePositions.push({ x, y: 0, z });
    }
  }

  /**
   * Generates road with sparse trees and lamps
   */
  generateRoad() {
    const size = GAME_CONFIG.CHUNK_SIZE;

    // Create road surface - use MeshBasicMaterial for visibility
    const roadWidth = 8;
    const roadGeometry = new THREE.PlaneGeometry(roadWidth, size);
    roadGeometry.rotateX(-Math.PI / 2);

    const roadMaterial = new THREE.MeshBasicMaterial({
      color: 0x2a2a2a,
    });

    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.position.set(this.worldX + size / 2, 0.01, this.worldZ + size / 2);
    road.userData.isRoad = true; // Mark for world state updates

    this.scene.add(road);
    this.buildings.push(road);

    // Street lamps along road - REDUCED for performance
    const lampSpacing = 40; // Increased spacing
    for (let offset = 0; offset < size; offset += lampSpacing) {
      this.createStreetLamp(this.worldX + size / 2 + 5, this.worldZ + offset);
      // Only one side to reduce lamp count further
    }

    // Sparse trees on sides
    const treeCount = 5 + Math.floor(this.seededRandom() * 5);
    for (let i = 0; i < treeCount; i++) {
      const side = this.seededRandom() > 0.5 ? 1 : -1;
      const x = this.worldX + size / 2 + side * (10 + this.seededRandom() * 20);
      const z = this.worldZ + this.seededRandom() * size;

      this.treePositions.push({ x, y: 0, z });
    }
  }

  /**
   * Creates a school building with multiple rooms
   */
  createSchool(x, z) {
    const width = 30;
    const depth = 35;
    const height = 12;

    // Red brick material for school
    const brickMat = new THREE.MeshBasicMaterial({ color: 0xa0522d });
    const wallThickness = 0.4;

    // Create main walls manually with brick color
    const frontWallGeo = new THREE.BoxGeometry(width, height, wallThickness);
    const frontWall = new THREE.Mesh(frontWallGeo, brickMat);
    frontWall.position.set(x, height / 2, z + depth / 2);
    frontWall.userData.isWall = true;
    this.scene.add(frontWall);
    this.buildings.push(frontWall);

    const backWallGeo = new THREE.BoxGeometry(width, height, wallThickness);
    const backWall = new THREE.Mesh(backWallGeo, brickMat);
    backWall.position.set(x, height / 2, z - depth / 2);
    backWall.userData.isWall = true;
    this.scene.add(backWall);
    this.buildings.push(backWall);

    const sideWallGeo = new THREE.BoxGeometry(wallThickness, height, depth);
    const leftWall = new THREE.Mesh(sideWallGeo, brickMat);
    leftWall.position.set(x - width / 2, height / 2, z);
    leftWall.userData.isWall = true;
    this.scene.add(leftWall);
    this.buildings.push(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeo, brickMat);
    rightWall.position.set(x + width / 2, height / 2, z);
    rightWall.userData.isWall = true;
    this.scene.add(rightWall);
    this.buildings.push(rightWall);

    // Large entrance doors (double doors)
    const doorGeo = new THREE.BoxGeometry(1.8, 3.5, 0.2);
    const doorMat = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });
    const leftDoor = new THREE.Mesh(doorGeo, doorMat);
    leftDoor.position.set(x - 1, 1.75, z + depth / 2 + 0.15);
    leftDoor.userData.isDoor = true;
    leftDoor.userData.isOpen = false;
    leftDoor.userData.closedPosition = leftDoor.position.clone();
    leftDoor.userData.closedRotation = leftDoor.rotation.clone();
    leftDoor.userData.doorPivot = {
      x: x - 1.9,
      z: z + depth / 2 + 0.15,
    };
    leftDoor.userData.buildingPosition = { x, z, width, depth };
    this.scene.add(leftDoor);
    this.buildings.push(leftDoor);

    const rightDoor = new THREE.Mesh(doorGeo, doorMat);
    rightDoor.position.set(x + 1, 1.75, z + depth / 2 + 0.15);
    rightDoor.userData.isDoor = true;
    rightDoor.userData.isOpen = false;
    rightDoor.userData.closedPosition = rightDoor.position.clone();
    rightDoor.userData.closedRotation = rightDoor.rotation.clone();
    rightDoor.userData.doorPivot = {
      x: x + 0.1,
      z: z + depth / 2 + 0.15,
    };
    rightDoor.userData.buildingPosition = { x, z, width, depth };
    this.scene.add(rightDoor);
    this.buildings.push(rightDoor);

    // Entrance canopy
    const canopyGeo = new THREE.BoxGeometry(8, 0.2, 3);
    const canopyMat = new THREE.MeshBasicMaterial({ color: 0x4a4a4a });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(x, 4.5, z + depth / 2 + 1.5);
    this.scene.add(canopy);
    this.buildings.push(canopy);

    // Canopy support posts
    const postGeo = new THREE.CylinderGeometry(0.15, 0.15, 4, 8);
    const postMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    for (let px of [-3.5, 3.5]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(x + px, 2, z + depth / 2 + 3);
      this.scene.add(post);
      this.buildings.push(post);
    }

    // Large school windows (many rows)
    const windowGeo = new THREE.PlaneGeometry(2.5, 2);
    const windowMat = new THREE.MeshBasicMaterial({
      color: 0xaaccff,
      transparent: true,
      opacity: 0.6,
    });
    const frameMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Front windows
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        if (row === 0 && col >= 3 && col <= 4) continue; // Skip door area
        const wx = x - 13 + col * 3.5;
        const wy = 2.5 + row * 3.5;

        const frame = new THREE.Mesh(
          new THREE.PlaneGeometry(2.8, 2.3),
          frameMat,
        );
        frame.position.set(wx, wy, z + depth / 2 + 0.02);
        this.scene.add(frame);
        this.buildings.push(frame);

        const window = new THREE.Mesh(windowGeo, windowMat);
        window.position.set(wx, wy, z + depth / 2 + 0.03);
        this.scene.add(window);
        this.buildings.push(window);
      }
    }

    // Flat roof
    const roofGeo = new THREE.BoxGeometry(width + 0.5, 0.4, depth + 0.5);
    const roofMat = new THREE.MeshBasicMaterial({ color: 0x3a3a3a });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(x, height, z);
    this.scene.add(roof);
    this.buildings.push(roof);

    // Flag pole
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 12, 8);
    const poleMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x - width / 2 - 3, 6, z + depth / 2 - 3);
    this.scene.add(pole);
    this.buildings.push(pole);

    // American flag
    const flagGeo = new THREE.PlaneGeometry(2, 1.3);
    const flagMat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      side: THREE.DoubleSide,
    });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(x - width / 2 - 2, 10, z + depth / 2 - 3);
    this.scene.add(flag);
    this.buildings.push(flag);

    // Blue canton
    const cantonGeo = new THREE.PlaneGeometry(0.8, 0.6);
    const cantonMat = new THREE.MeshBasicMaterial({
      color: 0x0000ff,
      side: THREE.DoubleSide,
    });
    const canton = new THREE.Mesh(cantonGeo, cantonMat);
    canton.position.set(x - width / 2 - 2.6, 10.35, z + depth / 2 - 2.99);
    this.scene.add(canton);
    this.buildings.push(canton);

    // "SCHOOL" sign
    const signGeo = new THREE.BoxGeometry(10, 1.5, 0.3);
    const signMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(x, height + 1.2, z - depth / 2 + 0.5);
    this.scene.add(sign);
    this.buildings.push(sign);

    // Interior - Hallway down middle
    const hallwayWall1Geo = new THREE.BoxGeometry(width - 2, height - 0.2, 0.3);
    const hallwayMat = new THREE.MeshBasicMaterial({ color: 0xd2b48c });
    const hallwayWall1 = new THREE.Mesh(hallwayWall1Geo, hallwayMat);
    hallwayWall1.position.set(x, height / 2, z);
    hallwayWall1.userData.isWall = true;
    this.scene.add(hallwayWall1);
    this.buildings.push(hallwayWall1);

    // Classrooms - 4 rooms (2 on each side)
    for (let i = 0; i < 2; i++) {
      const offsetZ = -10 + i * 20;

      // Left classroom
      this.createClassroom(x - width / 4, z + offsetZ, 12, 12);

      // Right classroom
      this.createClassroom(x + width / 4, z + offsetZ, 12, 12);
    }
  }

  /**
   * Creates a classroom with desks
   */
  createClassroom(x, z, width, depth) {
    // Desks - 3 rows of 4 desks
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const deskX = x - width / 3 + col * 2.5;
        const deskZ = z - depth / 3 + row * 3;

        // Desk top
        const deskGeo = new THREE.BoxGeometry(1.8, 0.1, 1.2);
        const desk = new THREE.Mesh(deskGeo, this.buildingMaterial);
        desk.position.set(deskX, 1.5, deskZ);
        this.scene.add(desk);
        this.buildings.push(desk);

        // Desk legs
        const legGeo = new THREE.BoxGeometry(0.1, 1.5, 0.1);
        for (let lx of [-0.8, 0.8]) {
          for (let lz of [-0.5, 0.5]) {
            const leg = new THREE.Mesh(legGeo, this.buildingMaterial);
            leg.position.set(deskX + lx, 0.75, deskZ + lz);
            this.scene.add(leg);
            this.buildings.push(leg);
          }
        }
      }
    }

    // Teacher's desk at front
    const teacherDeskGeo = new THREE.BoxGeometry(3, 0.15, 1.5);
    const teacherDesk = new THREE.Mesh(teacherDeskGeo, this.buildingMaterial);
    teacherDesk.position.set(x, 1.5, z + depth / 2 - 2);
    this.scene.add(teacherDesk);
    this.buildings.push(teacherDesk);
  }

  /**
   * Creates a police station with cells and desk
   */
  createPoliceStation(x, z) {
    const width = 18;
    const depth = 22;
    const height = 8;

    // White walls with blue trim for police station
    const wallMat = new THREE.MeshBasicMaterial({ color: 0xe8e8e8 });
    const blueTrimMat = new THREE.MeshBasicMaterial({ color: 0x0033aa });
    const wallThickness = 0.4;

    // Walls
    const frontWallGeo = new THREE.BoxGeometry(width, height, wallThickness);
    const frontWall = new THREE.Mesh(frontWallGeo, wallMat);
    frontWall.position.set(x, height / 2, z + depth / 2);
    frontWall.userData.isWall = true;
    this.scene.add(frontWall);
    this.buildings.push(frontWall);

    const backWallGeo = new THREE.BoxGeometry(width, height, wallThickness);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(x, height / 2, z - depth / 2);
    backWall.userData.isWall = true;
    this.scene.add(backWall);
    this.buildings.push(backWall);

    const sideWallGeo = new THREE.BoxGeometry(wallThickness, height, depth);
    const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
    leftWall.position.set(x - width / 2, height / 2, z);
    leftWall.userData.isWall = true;
    this.scene.add(leftWall);
    this.buildings.push(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
    rightWall.position.set(x + width / 2, height / 2, z);
    rightWall.userData.isWall = true;
    this.scene.add(rightWall);
    this.buildings.push(rightWall);

    // Blue stripe around building
    const stripeGeo = new THREE.BoxGeometry(width + 0.5, 0.8, depth + 0.5);
    const stripe = new THREE.Mesh(stripeGeo, blueTrimMat);
    stripe.position.set(x, height * 0.6, z);
    this.scene.add(stripe);
    this.buildings.push(stripe);

    // Flat roof
    const roofGeo = new THREE.BoxGeometry(width + 0.3, 0.3, depth + 0.3);
    const roofMat = new THREE.MeshBasicMaterial({ color: 0x3a3a3a });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(x, height, z);
    this.scene.add(roof);
    this.buildings.push(roof);

    // Rotating police lights on roof
    const lightGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 8);
    const redLightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const blueLightMat = new THREE.MeshBasicMaterial({ color: 0x0000ff });

    const redLight = new THREE.Mesh(lightGeo, redLightMat);
    redLight.position.set(x - 1.5, height + 0.4, z);
    this.scene.add(redLight);
    this.buildings.push(redLight);

    const blueLight = new THREE.Mesh(lightGeo, blueLightMat);
    blueLight.position.set(x + 1.5, height + 0.4, z);
    this.scene.add(blueLight);
    this.buildings.push(blueLight);

    // Radio antenna
    const antennaGeo = new THREE.CylinderGeometry(0.05, 0.05, 4, 6);
    const antennaMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.set(x + width / 2 - 2, height + 2.2, z - depth / 2 + 2);
    this.scene.add(antenna);
    this.buildings.push(antenna);

    // Entrance door
    const doorGeo = new THREE.BoxGeometry(2, 3, 0.2);
    const doorMat = new THREE.MeshBasicMaterial({ color: 0x0033aa });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(x, 1.5, z + depth / 2 + 0.15);
    door.userData.isDoor = true;
    door.userData.isOpen = false;
    door.userData.closedPosition = door.position.clone();
    door.userData.closedRotation = door.rotation.clone();
    door.userData.doorPivot = {
      x: x - 1,
      z: z + depth / 2 + 0.15,
    };
    door.userData.buildingPosition = { x, z, width, depth };
    this.scene.add(door);
    this.buildings.push(door);

    // Door handle
    const handleGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 8);
    handleGeo.rotateZ(Math.PI / 2);
    const handleMat = new THREE.MeshBasicMaterial({ color: 0xd4af37 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(x + 0.7, 1.5, z + depth / 2 + 0.25);
    handle.userData.isDoorHandle = true;
    handle.userData.parentDoor = door;
    this.scene.add(handle);
    this.buildings.push(handle);

    // Door glass window
    const glassGeo = new THREE.PlaneGeometry(1.2, 1.8);
    const glassMat = new THREE.MeshBasicMaterial({
      color: 0xaaccff,
      transparent: true,
      opacity: 0.6,
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(x, 2, z + depth / 2 + 0.25);
    this.scene.add(glass);
    this.buildings.push(glass);

    // "POLICE" sign with star
    const signGeo = new THREE.BoxGeometry(8, 1.8, 0.3);
    const signMat = new THREE.MeshBasicMaterial({ color: 0x0033aa });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(x, height + 1.2, z - depth / 2 + 0.5);
    this.scene.add(sign);
    this.buildings.push(sign);

    // Badge star on sign
    const starShape = new THREE.Shape();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const radius = i % 2 === 0 ? 0.4 : 0.18;
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) starShape.moveTo(px, py);
      else starShape.lineTo(px, py);
    }
    starShape.closePath();

    const starGeo = new THREE.ShapeGeometry(starShape);
    const starMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      side: THREE.DoubleSide,
    });
    const star = new THREE.Mesh(starGeo, starMat);
    star.position.set(x - 2.5, height + 1.2, z - depth / 2 + 0.7);
    this.scene.add(star);
    this.buildings.push(star);

    // Front desk area
    const deskGeo = new THREE.BoxGeometry(6, 0.2, 3);
    const deskMat = new THREE.MeshBasicMaterial({ color: 0x654321 });
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.set(x, 1.5, z + depth / 4);
    this.scene.add(desk);
    this.buildings.push(desk);

    // Holding cells in back (3 cells)
    for (let i = 0; i < 3; i++) {
      const cellX = x - 5 + i * 5;
      const cellZ = z - depth / 3;

      // Cell bars (front)
      for (let b = 0; b < 7; b++) {
        const barGeo = new THREE.BoxGeometry(0.1, 3, 0.1);
        const barMat = new THREE.MeshBasicMaterial({ color: 0x555555 });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set(cellX - 1.5 + b * 0.5, 1.5, cellZ + 2);
        this.scene.add(bar);
        this.buildings.push(bar);
      }

      // Cell walls
      const cellWallGeo = new THREE.BoxGeometry(3, 3, 0.2);
      const cellWallMat = new THREE.MeshBasicMaterial({ color: 0x808080 });

      // Back wall
      const backCellWall = new THREE.Mesh(cellWallGeo, cellWallMat);
      backCellWall.position.set(cellX, 1.5, cellZ - 2);
      backCellWall.userData.isWall = true;
      this.scene.add(backCellWall);
      this.buildings.push(backCellWall);

      // Side walls
      const sideWallGeo = new THREE.BoxGeometry(0.2, 3, 4);
      if (i > 0) {
        const leftCellWall = new THREE.Mesh(sideWallGeo, cellWallMat);
        leftCellWall.position.set(cellX - 1.5, 1.5, cellZ);
        leftCellWall.userData.isWall = true;
        this.scene.add(leftCellWall);
        this.buildings.push(leftCellWall);
      }
      if (i < 2) {
        const rightCellWall = new THREE.Mesh(sideWallGeo, cellWallMat);
        rightCellWall.position.set(cellX + 1.5, 1.5, cellZ);
        rightCellWall.userData.isWall = true;
        this.scene.add(rightCellWall);
        this.buildings.push(rightCellWall);
      }

      // Simple bed in cell
      this.createBed(cellX, cellZ - 1);
    }
  }

  /**
   * Creates a church with pews and altar
   */
  createChurch(x, z) {
    const width = 14;
    const depth = 24;
    const height = 16;

    // Stone walls for church
    const stoneMat = new THREE.MeshBasicMaterial({ color: 0x8a8a8a });
    const wallThickness = 0.5;

    // Walls
    const frontWallGeo = new THREE.BoxGeometry(width, height, wallThickness);
    const frontWall = new THREE.Mesh(frontWallGeo, stoneMat);
    frontWall.position.set(x, height / 2, z + depth / 2);
    frontWall.userData.isWall = true;
    this.scene.add(frontWall);
    this.buildings.push(frontWall);

    const backWallGeo = new THREE.BoxGeometry(width, height, wallThickness);
    const backWall = new THREE.Mesh(backWallGeo, stoneMat);
    backWall.position.set(x, height / 2, z - depth / 2);
    backWall.userData.isWall = true;
    this.scene.add(backWall);
    this.buildings.push(backWall);

    const sideWallGeo = new THREE.BoxGeometry(wallThickness, height, depth);
    const leftWall = new THREE.Mesh(sideWallGeo, stoneMat);
    leftWall.position.set(x - width / 2, height / 2, z);
    leftWall.userData.isWall = true;
    this.scene.add(leftWall);
    this.buildings.push(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeo, stoneMat);
    rightWall.position.set(x + width / 2, height / 2, z);
    rightWall.userData.isWall = true;
    this.scene.add(rightWall);
    this.buildings.push(rightWall);

    // Arched doorway
    const archGeo = new THREE.CylinderGeometry(
      1.2,
      1.2,
      0.5,
      16,
      1,
      false,
      0,
      Math.PI,
    );
    archGeo.rotateZ(Math.PI / 2);
    const archMat = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.set(x, 3, z + depth / 2 + 0.25);
    this.scene.add(arch);
    this.buildings.push(arch);

    const doorGeo = new THREE.BoxGeometry(2, 3, 0.2);
    const doorMat = new THREE.MeshBasicMaterial({ color: 0x3a2a1a });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(x, 1.5, z + depth / 2 + 0.15);
    door.userData.isDoor = true;
    door.userData.isOpen = false;
    door.userData.closedPosition = door.position.clone();
    door.userData.closedRotation = door.rotation.clone();
    door.userData.doorPivot = {
      x: x - 1,
      z: z + depth / 2 + 0.15,
    };
    door.userData.buildingPosition = { x, z, width, depth };
    this.scene.add(door);
    this.buildings.push(door);

    // Door iron handle rings
    const ringGeo = new THREE.TorusGeometry(0.15, 0.04, 8, 12);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(x + 0.7, 1.5, z + depth / 2 + 0.25);
    ring.userData.isDoorHandle = true;
    ring.userData.parentDoor = door;
    this.scene.add(ring);
    this.buildings.push(ring);

    // Stained glass windows on sides
    const stainedGlassColors = [
      0xff0000, 0x0000ff, 0xffaa00, 0x00ff00, 0xff00ff,
    ];

    for (let i = 0; i < 4; i++) {
      const wz = z - depth / 3 + i * 5;
      const color = stainedGlassColors[i % stainedGlassColors.length];
      const glassGeo = new THREE.PlaneGeometry(0.1, 3, 2);
      const glassMat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      });

      // Left window
      const leftWindow = new THREE.Mesh(glassGeo, glassMat);
      leftWindow.rotation.y = Math.PI / 2;
      leftWindow.position.set(x - width / 2 - 0.01, height / 2, wz);
      this.scene.add(leftWindow);
      this.buildings.push(leftWindow);

      // Right window
      const rightWindow = new THREE.Mesh(glassGeo, glassMat);
      rightWindow.rotation.y = Math.PI / 2;
      rightWindow.position.set(x + width / 2 + 0.01, height / 2, wz);
      this.scene.add(rightWindow);
      this.buildings.push(rightWindow);
    }

    // Large rose window above door
    const roseGeo = new THREE.CircleGeometry(1.5, 16);
    const roseMat = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.8,
    });
    const rose = new THREE.Mesh(roseGeo, roseMat);
    rose.position.set(x, height - 3, z + depth / 2 + 0.02);
    this.scene.add(rose);
    this.buildings.push(rose);

    // Pitched roof
    const roofHeight = 5;
    const roofGeo = new THREE.ConeGeometry(
      Math.max(width, depth) * 0.7,
      roofHeight,
      4,
    );
    roofGeo.rotateY(Math.PI / 4);
    const roofMat = new THREE.MeshBasicMaterial({ color: 0x4a3a3a });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(x, height + roofHeight / 2, z);
    this.scene.add(roof);
    this.buildings.push(roof);

    // Bell tower spire
    const towerBaseGeo = new THREE.BoxGeometry(3, 6, 3);
    const towerBase = new THREE.Mesh(towerBaseGeo, stoneMat);
    towerBase.position.set(x, height + roofHeight + 3, z - depth / 2 + 3);
    this.scene.add(towerBase);
    this.buildings.push(towerBase);

    // Spire on tower
    const spireGeo = new THREE.ConeGeometry(1.8, 8, 4);
    const spire = new THREE.Mesh(spireGeo, roofMat);
    spire.position.set(x, height + roofHeight + 10, z - depth / 2 + 3);
    this.scene.add(spire);
    this.buildings.push(spire);

    // Large gold cross on spire
    const crossVGeo = new THREE.BoxGeometry(0.4, 4, 0.4);
    const goldMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    const crossV = new THREE.Mesh(crossVGeo, goldMat);
    crossV.position.set(x, height + roofHeight + 16, z - depth / 2 + 3);
    this.scene.add(crossV);
    this.buildings.push(crossV);

    const crossHGeo = new THREE.BoxGeometry(2.5, 0.4, 0.4);
    const crossH = new THREE.Mesh(crossHGeo, goldMat);
    crossH.position.set(x, height + roofHeight + 15, z - depth / 2 + 3);
    this.scene.add(crossH);
    this.buildings.push(crossH);

    // Bell in tower
    const bellGeo = new THREE.SphereGeometry(
      0.6,
      8,
      8,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2,
    );
    const bellMat = new THREE.MeshBasicMaterial({ color: 0xccaa66 });
    const bell = new THREE.Mesh(bellGeo, bellMat);
    bell.position.set(x, height + roofHeight + 5, z - depth / 2 + 3);
    this.scene.add(bell);
    this.buildings.push(bell);

    // Pews - 6 rows of benches
    for (let row = 0; row < 6; row++) {
      const pewZ = z + 4 - row * 3.5;

      // Left pew
      this.createPew(x - 3.5, pewZ);

      // Right pew
      this.createPew(x + 3.5, pewZ);
    }

    // Altar at front
    const altarGeo = new THREE.BoxGeometry(8, 1.5, 3);
    const altarMat = new THREE.MeshBasicMaterial({ color: 0x8a7a6a });
    const altar = new THREE.Mesh(altarGeo, altarMat);
    altar.position.set(x, 0.75, z - depth / 2 + 4);
    this.scene.add(altar);
    this.buildings.push(altar);

    // Candles on altar
    for (let i = 0; i < 3; i++) {
      const candleGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
      const candleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const candle = new THREE.Mesh(candleGeo, candleMat);
      candle.position.set(x - 2.5 + i * 2.5, 1.9, z - depth / 2 + 4);
      this.scene.add(candle);
      this.buildings.push(candle);

      // Flame
      const flameGeo = new THREE.SphereGeometry(0.15, 8, 8);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(x - 2.5 + i * 2.5, 2.4, z - depth / 2 + 4);
      this.scene.add(flame);
      this.buildings.push(flame);
    }
  }

  /**
   * Creates a church pew (bench)
   */
  createPew(x, z) {
    const woodMat = new THREE.MeshBasicMaterial({ color: 0x654321 });

    // Seat
    const seatGeo = new THREE.BoxGeometry(2, 0.2, 5);
    const seat = new THREE.Mesh(seatGeo, woodMat);
    seat.position.set(x, 0.8, z);
    this.scene.add(seat);
    this.buildings.push(seat);

    // Backrest
    const backGeo = new THREE.BoxGeometry(2, 1.5, 0.2);
    const back = new THREE.Mesh(backGeo, woodMat);
    back.position.set(x, 1.5, z - 2.4);
    this.scene.add(back);
    this.buildings.push(back);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.2, 0.8, 0.2);
    for (let lx of [-0.8, 0.8]) {
      for (let lz of [-2, 2]) {
        const leg = new THREE.Mesh(legGeo, woodMat);
        leg.position.set(x + lx, 0.4, z + lz);
        this.scene.add(leg);
        this.buildings.push(leg);
      }
    }
  }

  /**
   * Cleans up chunk resources
   */
  dispose() {
    // Remove ground
    if (this.groundMesh) {
      this.scene.remove(this.groundMesh);
      this.groundMesh.geometry.dispose();
    }

    // Remove buildings
    this.buildings.forEach((mesh) => {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
    });

    // Remove point lights
    this.pointLights.forEach((light) => {
      this.scene.remove(light);
    });

    this.buildings = [];
    this.pointLights = [];
    this.treePositions = [];
    this.lampPositions = [];
  }
}
