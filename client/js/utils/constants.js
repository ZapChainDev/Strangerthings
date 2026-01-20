/**
 * Game Constants
 * Central configuration for all game systems
 */

export const GAME_CONFIG = {
  // World settings
  CHUNK_SIZE: 64, // Size of each terrain chunk
  RENDER_DISTANCE: 3, // Number of chunks to render around player
  WORLD_SIZE: 8, // Total chunks in each direction

  // Player settings
  PLAYER_SPEED: 8, // Walking speed
  PLAYER_RUN_SPEED: 14, // Running speed
  BICYCLE_SPEED: 20, // Bicycle riding speed
  PLAYER_HEIGHT: 1.8, // Player capsule height
  PLAYER_RADIUS: 0.4, // Player collision radius
  JUMP_FORCE: 8, // Jump velocity
  GRAVITY: 20, // Gravity acceleration

  // Camera settings
  CAMERA_DISTANCE: 5, // Distance behind player
  CAMERA_HEIGHT: 2.5, // Height above player
  CAMERA_LERP_SPEED: 0.1, // Camera smoothing factor
  CAMERA_ROTATION_SPEED: 0.002, // Mouse sensitivity

  // Network settings
  NETWORK_TICK_RATE: 20, // Updates per second
  INTERPOLATION_DELAY: 100, // ms delay for smooth interpolation

  // Performance settings
  FOG_NEAR: 40, // Normal world fog start
  FOG_FAR: 150, // Normal world fog end
  FOG_NEAR_UPSIDE: 30, // Upside Down fog start
  FOG_FAR_UPSIDE: 150, // Upside Down fog end - same as normal
};

/**
 * World State Configurations
 * Defines the visual properties for Normal and Upside Down worlds
 */
export const WORLD_STATES = {
  normal: {
    // Lighting - Pleasant evening/dusk atmosphere
    ambientColor: 0x4466aa, // Soft blue ambient
    ambientIntensity: 0.6,
    moonColor: 0xaabbdd, // Bright moonlight
    moonIntensity: 0.8,

    // Fog - Light atmospheric fog
    fogColor: 0x1a2030, // Soft blue-gray fog
    fogNear: GAME_CONFIG.FOG_NEAR,
    fogFar: GAME_CONFIG.FOG_FAR,

    // Sky - Evening sky
    skyColor: 0x1a2540, // Deep blue evening sky

    // Materials - Visible, pleasant colors
    groundColor: 0x3a5a2a, // Grass green
    treeColor: 0x1a3310, // Forest green
    buildingColor: 0x5a5a6a, // Light gray buildings

    // Street lamps - Warm, welcoming glow
    lampColor: 0xffcc66, // Warm yellow-orange glow
    lampIntensity: 2.5,
    lampDistance: 25,
  },

  upsideDown: {
    // Lighting - Same as normal world for visibility
    ambientColor: 0x4466aa, // Same soft blue ambient
    ambientIntensity: 0.6,
    moonColor: 0xaabbdd, // Same bright moonlight
    moonIntensity: 0.8,

    // Fog - Same as normal world
    fogColor: 0x1a2030, // Same soft blue-gray fog
    fogNear: GAME_CONFIG.FOG_NEAR,
    fogFar: GAME_CONFIG.FOG_FAR,

    // Sky - Dark blue sky (only difference)
    skyColor: 0x0a1220, // Dark blue sky

    // Materials - Same as normal for visibility
    groundColor: 0x3a5a2a, // Same grass green as normal
    treeColor: 0x1a3310, // Same forest green
    buildingColor: 0x5a5a6a, // Same light gray buildings
    lampColor: 0xffcc66, // Same warm yellow-orange glow
    lampIntensity: 2.5,
    lampDistance: 25,
  },
};

/**
 * Animation States
 */
export const ANIMATIONS = {
  IDLE: "idle",
  WALK: "walk",
  RUN: "run",
  JUMP: "jump",
};

/**
 * Input Key Bindings
 */
export const KEY_BINDINGS = {
  FORWARD: ["KeyW", "ArrowUp"],
  BACKWARD: ["KeyS", "ArrowDown"],
  LEFT: ["KeyA", "ArrowLeft"],
  RIGHT: ["KeyD", "ArrowRight"],
  RUN: ["ShiftLeft", "ShiftRight"],
  JUMP: ["Space"],
  INTERACT: ["KeyE"],
  OPEN_DOOR: ["KeyG"],
  RIDE_BICYCLE: ["KeyF"],
  TOGGLE_DEBUG: ["KeyF3"],
};

/**
 * Asset Definitions for Low-Poly World
 */
export const ASSETS = {
  // Tree variations
  TREE_TYPES: [
    { name: "pine", height: 8, radius: 2 },
    { name: "oak", height: 6, radius: 3 },
    { name: "dead", height: 5, radius: 1.5 },
  ],

  // Building types for town
  BUILDING_TYPES: [
    { name: "house_small", width: 6, depth: 6, height: 4 },
    { name: "house_medium", width: 8, depth: 10, height: 5 },
    { name: "shop", width: 10, depth: 8, height: 4 },
    { name: "school", width: 20, depth: 15, height: 8 },
  ],
};

/**
 * Chunk Types for World Generation
 */
export const CHUNK_TYPES = {
  TOWN: "town",
  FOREST: "forest",
  ROAD: "road",
  EMPTY: "empty",
};

/**
 * Playable Characters
 * Each room has 6 unique characters - one per player max
 */
export const CHARACTERS = {
  eleven: {
    id: "eleven",
    name: "Eleven",
    description: "Telekinesis vibe",
    color: 0xff69b4, // Pink
    icon: "🔮",
    image: "images/characters/Eleven.png",
  },
  mike: {
    id: "mike",
    name: "Mike",
    description: "Leader",
    color: 0x4488ff, // Blue
    icon: "👑",
    image: "images/characters/Mike.png",
  },
  dustin: {
    id: "dustin",
    name: "Dustin",
    description: "Tech",
    color: 0x44ff44, // Green
    icon: "🔧",
    image: "images/characters/Dustin.png",
  },
  lucas: {
    id: "lucas",
    name: "Lucas",
    description: "Brave",
    color: 0xffaa00, // Orange
    icon: "🎯",
    image: "images/characters/Lucas.png",
  },
  will: {
    id: "will",
    name: "Will",
    description: "Sensitive",
    color: 0x9966ff, // Purple
    icon: "🎨",
    image: "images/characters/Will.png",
  },
  max: {
    id: "max",
    name: "Max",
    description: "Athletic",
    color: 0xff4444, // Red
    icon: "🛹",
    image: "images/characters/Max.png",
  },
};

export const CHARACTER_LIST = Object.values(CHARACTERS);
