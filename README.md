# Stranger Things - Multiplayer 3D Exploration Game

A browser-based multiplayer 3D open-world exploration game inspired by Stranger Things, built with Three.js and Socket.io.

![Game Preview](preview.png)

## Features

### Core Gameplay

- **Third-person camera** - Cinematic over-the-shoulder view
- **Multiplayer exploration** - Play with up to 30 players per room
- **Chunk-based open world** - Small town center surrounded by dense forest
- **Night-time atmosphere** - Fog, moonlight, and glowing street lamps

### The Upside Down Mechanic

- **Two world states** - Normal world and the Upside Down
- **Single shared map** - No duplicate geometry
- **Portal transitions** - Find and enter glowing portals to switch worlds
- **Visual transformation** - Lighting, fog, materials, and atmosphere change
- **World state isolation** - Players only see others in the same world state

### Technical Highlights

- **Server-authoritative multiplayer** with Socket.io
- **Smooth player interpolation** for network movement
- **Fog-based culling** for performance
- **Chunk loading system** around the player
- **Instanced meshes** for trees (optimized rendering)
- **Low-poly stylized graphics** for performance

## Project Structure

```
stranger-things-game/
├── client/                     # Frontend (Three.js)
│   ├── index.html              # Main HTML file
│   ├── css/
│   │   └── style.css           # Game styling
│   └── js/
│       ├── main.js             # Entry point
│       ├── game/
│       │   ├── Game.js         # Main game controller
│       │   ├── Player.js       # Player mesh and state
│       │   ├── Camera.js       # Third-person camera
│       │   └── InputManager.js # Keyboard/mouse handling
│       ├── world/
│       │   ├── World.js        # World state management
│       │   ├── ChunkManager.js # Chunk loading system
│       │   ├── Chunk.js        # Individual chunk generation
│       │   ├── Environment.js  # Lighting, fog, atmosphere
│       │   └── Portal.js       # Portal objects
│       ├── network/
│       │   └── NetworkManager.js # Socket.io client
│       └── utils/
│           └── constants.js    # Game configuration
│
├── server/                     # Backend (Node.js)
│   ├── index.js                # Server entry point
│   ├── GameServer.js           # Main server logic
│   ├── Room.js                 # Room/instance management
│   └── Player.js               # Server-side player state
│
├── package.json                # Dependencies
└── README.md                   # This file
```

## Installation

1. **Clone or download** this project

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Start the server**:

   ```bash
   npm start
   ```

4. **Open in browser**:
   Navigate to `http://localhost:3000`

## Controls

| Key   | Action        |
| ----- | ------------- |
| W / ↑ | Move Forward  |
| S / ↓ | Move Backward |
| A / ← | Strafe Left   |
| D / → | Strafe Right  |
| SHIFT | Run           |
| Mouse | Look Around   |
| E     | Enter Portal  |
| ESC   | Release Mouse |

## Configuration

Edit `client/js/utils/constants.js` to customize:

```javascript
export const GAME_CONFIG = {
  CHUNK_SIZE: 64, // Terrain chunk size
  RENDER_DISTANCE: 3, // Chunks to render
  PLAYER_SPEED: 8, // Walking speed
  PLAYER_RUN_SPEED: 14, // Running speed
  FOG_NEAR: 20, // Fog start distance
  FOG_FAR: 80, // Fog end distance
  // ... more options
};
```

## Multiplayer Sync

The server synchronizes:

- Player position (x, y, z)
- Player rotation (y-axis only)
- Animation state (idle, walk, run)
- World state (normal or upsideDown)

Players in different world states cannot see each other.

## Performance Optimizations

1. **Fog-based culling** - Objects beyond fog are not rendered
2. **Chunk loading** - Only nearby chunks are in memory
3. **Instanced meshes** - Trees rendered with single draw call
4. **No real-time shadows** - Static lighting only
5. **Low-poly assets** - Minimal geometry

## Extending the Game

### Adding New Buildings

Edit `client/js/world/Chunk.js`:

```javascript
createBuilding(x, z, width, depth, height) {
    // Add your building generation logic
}
```

### Adding New Portals

Edit `client/js/world/World.js`:

```javascript
const portalLocations = [
  { x: 30, z: 30, name: "Forest Portal" },
  // Add more portal locations
];
```

### Customizing World States

Edit `client/js/utils/constants.js`:

```javascript
export const WORLD_STATES = {
  normal: {
    ambientColor: 0x1a1a2e,
    // ... customize normal world
  },
  upsideDown: {
    ambientColor: 0x1a0a0a,
    // ... customize upside down
  },
};
```

## Future Enhancements

- [ ] Character customization
- [ ] Collectible items
- [ ] AI creatures (Demogorgon)
- [ ] Voice chat
- [ ] Mobile support
- [ ] Sound effects and music
- [ ] Flashlight mechanic
- [ ] Player chat

## Technologies Used

- **Three.js** - 3D rendering
- **Socket.io** - Real-time multiplayer
- **Node.js** - Server runtime
- **Express** - HTTP server

## Browser Support

- Chrome (recommended)
- Firefox
- Edge
- Safari

## License

MIT License - Feel free to use and modify for your projects.

---

_"Friends don't lie."_ - Eleven
