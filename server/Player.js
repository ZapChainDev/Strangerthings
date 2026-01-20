/**
 * Player Class (Server-side)
 * Represents a player's state on the server
 * Handles position, rotation, world state, and animation
 */

class Player {
  constructor(id, username, position = { x: 0, y: 0, z: 0 }) {
    this.id = id;
    this.username = username;

    // Transform data
    this.position = { ...position };
    this.rotation = 0; // Y-axis rotation only (radians)

    // World state: 'normal' or 'upsideDown'
    this.worldState = "normal";

    // Animation state: 'idle', 'walk', 'run'
    this.animation = "idle";

    // Character selection (eleven, mike, dustin, lucas, will, max)
    this.characterId = null;

    // Timestamps
    this.joinedAt = Date.now();
    this.lastUpdate = Date.now();

    // Flag for broadcasting updates
    this.needsBroadcast = false;
  }

  /**
   * Sets the player's selected character
   */
  setCharacter(characterId) {
    this.characterId = characterId;
  }

  /**
   * Updates player position
   */
  setPosition(position) {
    this.position.x = position.x;
    this.position.y = position.y;
    this.position.z = position.z;
  }

  /**
   * Updates player rotation (Y-axis only)
   */
  setRotation(rotation) {
    this.rotation = rotation;
  }

  /**
   * Checks if position has changed significantly
   */
  hasPositionChanged(newPos, threshold) {
    const dx = Math.abs(this.position.x - newPos.x);
    const dy = Math.abs(this.position.y - newPos.y);
    const dz = Math.abs(this.position.z - newPos.z);
    return dx > threshold || dy > threshold || dz > threshold;
  }

  /**
   * Checks if rotation has changed significantly
   */
  hasRotationChanged(newRot, threshold) {
    return Math.abs(this.rotation - newRot) > threshold;
  }

  /**
   * Serializes player data for network transmission
   */
  serialize() {
    return {
      id: this.id,
      username: this.username,
      position: { ...this.position },
      rotation: this.rotation,
      worldState: this.worldState,
      animation: this.animation,
      characterId: this.characterId,
    };
  }
}

module.exports = Player;
