/**
 * Room Class
 * Represents a game room/instance that holds players
 * Manages player lists and world state separation
 */

// Available characters - must match client constants
const AVAILABLE_CHARACTERS = [
  "eleven",
  "mike",
  "dustin",
  "lucas",
  "will",
  "max",
];

class Room {
  constructor(id, maxPlayers = 30) {
    this.id = id;
    this.maxPlayers = maxPlayers;
    this.players = new Map(); // playerId -> Player
    this.createdAt = Date.now();

    // Character selection tracking
    // Maps characterId -> playerId (who has selected it)
    this.selectedCharacters = new Map();
  }

  /**
   * Gets available characters that haven't been selected
   */
  getAvailableCharacters() {
    return AVAILABLE_CHARACTERS.filter(
      (charId) => !this.selectedCharacters.has(charId)
    );
  }

  /**
   * Gets all character states (available/taken)
   */
  getCharacterStates() {
    return AVAILABLE_CHARACTERS.map((charId) => ({
      id: charId,
      available: !this.selectedCharacters.has(charId),
      takenBy: this.selectedCharacters.get(charId) || null,
    }));
  }

  /**
   * Attempts to select a character for a player
   * @returns {boolean} true if selection succeeded
   */
  selectCharacter(playerId, characterId) {
    // Validate character exists
    if (!AVAILABLE_CHARACTERS.includes(characterId)) {
      return { success: false, error: "Invalid character" };
    }

    // Check if character is already taken
    if (this.selectedCharacters.has(characterId)) {
      return { success: false, error: "Character already taken" };
    }

    // Release any previously selected character by this player
    this.releaseCharacter(playerId);

    // Select the new character
    this.selectedCharacters.set(characterId, playerId);
    return { success: true };
  }

  /**
   * Releases a character when player leaves or changes selection
   */
  releaseCharacter(playerId) {
    for (const [charId, pId] of this.selectedCharacters.entries()) {
      if (pId === playerId) {
        this.selectedCharacters.delete(charId);
        return charId;
      }
    }
    return null;
  }

  /**
   * Gets the character selected by a player
   */
  getPlayerCharacter(playerId) {
    for (const [charId, pId] of this.selectedCharacters.entries()) {
      if (pId === playerId) {
        return charId;
      }
    }
    return null;
  }

  /**
   * Adds a player to the room
   */
  addPlayer(player) {
    this.players.set(player.id, player);
  }

  /**
   * Removes a player from the room
   */
  removePlayer(playerId) {
    // Release their character when they leave
    const releasedCharacter = this.releaseCharacter(playerId);
    this.players.delete(playerId);
    return releasedCharacter;
  }

  /**
   * Gets a player by ID
   */
  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  /**
   * Gets all players in a specific world state
   * This is crucial for the Upside Down mechanic - players only see others in same state
   */
  getPlayersInWorldState(worldState) {
    return Array.from(this.players.values()).filter(
      (p) => p.worldState === worldState
    );
  }

  /**
   * Gets all players in the room
   */
  getAllPlayers() {
    return Array.from(this.players.values());
  }

  /**
   * Gets current player count
   */
  getPlayerCount() {
    return this.players.size;
  }

  /**
   * Checks if room is full
   */
  isFull() {
    return this.players.size >= this.maxPlayers;
  }

  /**
   * Serializes room data for client
   */
  serialize() {
    return {
      id: this.id,
      playerCount: this.players.size,
      maxPlayers: this.maxPlayers,
    };
  }
}

module.exports = Room;
