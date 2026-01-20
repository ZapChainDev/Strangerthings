/**
 * Main Entry Point
 * Initializes Firebase authentication and starts the game
 *
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  STARTUP FLOW                                                                  ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  1. Firebase Google Auth → Sign in with Google account                        ║
 * ║  2. Load/Create player profile from Firestore (uses Google display name)      ║
 * ║  3. Show lobby screen → Select or create a room                               ║
 * ║  4. Connect to Socket.io server → Show character selection                    ║
 * ║  5. Select character → Character locked for this room                         ║
 * ║  6. Start game → Initialize Three.js and game loop                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { Game } from "./game/Game.js";
import { FirebaseManager } from "./firebase/FirebaseManager.js";
import { NetworkManager } from "./network/NetworkManager.js";
import { CHARACTERS, CHARACTER_LIST } from "./utils/constants.js";
import { CharacterPreview } from "./ui/CharacterPreview.js";

// Global instances
let game = null;
let firebaseManager = null;
let currentRoomId = null;
let currentPlayerName = null;
let characterPreview = null;

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", () => {
  console.log("╔═══════════════════════════════════════════════════╗");
  console.log("║     STRANGER THINGS - MULTIPLAYER EXPLORATION     ║");
  console.log("║                                                   ║");
  console.log("║   Controls:                                       ║");
  console.log("║   WASD - Move                                     ║");
  console.log("║   SHIFT - Run                                     ║");
  console.log("║   Mouse - Look around                             ║");
  console.log("║   E - Interact with portals                       ║");
  console.log("╚═══════════════════════════════════════════════════╝");

  // Show login screen and wait for user to sign in
  setupLoginScreen();
});

/**
 * Sets up the login screen and handles Google Sign-In
 */
function setupLoginScreen() {
  const loginScreen = document.getElementById("login-screen");
  const signInBtn = document.getElementById("google-signin-btn");
  const loadingScreen = document.getElementById("loading");

  signInBtn.addEventListener("click", async () => {
    try {
      // Disable button during sign-in
      signInBtn.disabled = true;
      signInBtn.textContent = "Signing in...";

      // Initialize Firebase Manager
      console.log("[Main] Initializing Firebase...");
      firebaseManager = new FirebaseManager();

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 1: Authenticate with Google (opens popup)
      // ═══════════════════════════════════════════════════════════════════════
      const uid = await firebaseManager.initialize();
      console.log("[Main] Authenticated with UID:", uid);

      // Hide login screen, show loading screen
      loginScreen.style.display = "none";
      loadingScreen.style.display = "flex";
      document.getElementById("loading-text").textContent = "Loading game...";

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 2: Load or create player profile using Google display name
      // ═══════════════════════════════════════════════════════════════════════
      let profile = await firebaseManager.getPlayerProfile();
      // Use Google display name if available, otherwise fallback
      let playerName =
        firebaseManager.getUserDisplayName() ||
        profile?.name ||
        `Player_${uid.substring(0, 6)}`;

      // Save/update profile in Firestore (low-frequency write)
      await firebaseManager.savePlayerProfile(playerName);
      console.log("[Main] Player profile loaded:", playerName);

      // ═══════════════════════════════════════════════════════════════════════
      // STEP 3: Show lobby screen
      // ═══════════════════════════════════════════════════════════════════════
      loadingScreen.style.display = "none";
      showLobbyScreen(playerName);
    } catch (error) {
      console.error("Failed to initialize game:", error);

      // Show error and re-enable sign-in button
      loadingScreen.style.display = "none";
      loginScreen.style.display = "flex";
      signInBtn.disabled = false;
      signInBtn.innerHTML = `
        <svg class="google-icon" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      `;

      // Show detailed error message
      let errorMsg = "Failed to start game. ";
      if (
        error.message &&
        error.message.includes("Firestore API has not been used")
      ) {
        errorMsg =
          "⚠️ Firestore is not enabled!\n\n" +
          "Please enable Cloud Firestore:\n" +
          "1. Go to: https://console.firebase.google.com/project/strangerthings-7938c/firestore\n" +
          "2. Click 'Create database'\n" +
          "3. Select 'Start in test mode'\n" +
          "4. Choose a location\n" +
          "5. Click 'Enable'\n\n" +
          "Then refresh this page and try again.";
      } else if (error.message && error.message.includes("offline")) {
        errorMsg =
          "Cannot connect to Firebase. Please check your internet connection.";
      } else {
        errorMsg += error.message || "Please try again.";
      }

      alert(errorMsg);
    }
  });
}

/**
 * Shows the lobby screen where players can create or join lobbies
 */
function showLobbyScreen(playerName) {
  const lobbyScreen = document.getElementById("lobby-screen");
  const userAvatar = document.getElementById("user-avatar");
  const userName = document.getElementById("user-name");

  // Set user info
  userName.textContent = playerName;
  userAvatar.src =
    firebaseManager.getUserPhotoURL() ||
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50'%3E%3Ccircle cx='25' cy='25' r='25' fill='%23ff0000'/%3E%3C/svg%3E";

  lobbyScreen.style.display = "flex";

  // Setup tab switching
  const tabBtns = document.querySelectorAll(".tab-btn");
  const joinPanel = document.getElementById("join-panel");
  const createPanel = document.getElementById("create-panel");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      if (btn.dataset.tab === "join") {
        joinPanel.style.display = "block";
        createPanel.style.display = "none";
        loadLobbies();
      } else {
        joinPanel.style.display = "none";
        createPanel.style.display = "block";
      }
    });
  });

  // Setup create lobby
  const createLobbyBtn = document.getElementById("create-lobby-btn");
  createLobbyBtn.addEventListener("click", async () => {
    const lobbyName = document.getElementById("lobby-name").value.trim();
    const maxPlayers = parseInt(document.getElementById("max-players").value);

    if (!lobbyName) {
      alert("Please enter a lobby name");
      return;
    }

    if (maxPlayers < 2 || maxPlayers > 30) {
      alert("Max players must be between 2 and 30");
      return;
    }

    await createLobby(lobbyName, maxPlayers, playerName);
  });

  // Load lobbies initially
  loadLobbies();
}

/**
 * Loads available lobbies from Firestore
 */
async function loadLobbies() {
  const lobbyList = document.getElementById("lobby-list");
  lobbyList.innerHTML = '<div class="loading-lobbies">Loading lobbies...</div>';

  try {
    const rooms = await firebaseManager.getAvailableRooms();

    if (rooms.length === 0) {
      lobbyList.innerHTML =
        '<div class="loading-lobbies">No lobbies available. Create one!</div>';
      return;
    }

    lobbyList.innerHTML = "";
    rooms.forEach((room) => {
      const lobbyItem = document.createElement("div");
      lobbyItem.className = "lobby-item";
      lobbyItem.innerHTML = `
        <div class="lobby-info">
          <h4>${room.name}</h4>
          <p>Hawkins, Indiana</p>
        </div>
        <span class="lobby-players">${room.playerCount || 0}/${
        room.maxPlayers
      }</span>
        <button class="lobby-btn secondary" onclick="joinLobby('${room.id}', '${
        room.name
      }')">Join</button>
      `;
      lobbyList.appendChild(lobbyItem);
    });
  } catch (error) {
    console.error("Failed to load lobbies:", error);
    lobbyList.innerHTML =
      '<div class="loading-lobbies">Failed to load lobbies</div>';
  }
}

/**
 * Creates a new lobby
 */
async function createLobby(lobbyName, maxPlayers, playerName) {
  const loadingScreen = document.getElementById("loading");
  const lobbyScreen = document.getElementById("lobby-screen");

  try {
    loadingScreen.style.display = "flex";
    document.getElementById("loading-text").textContent = "Creating lobby...";

    // Create room ID from lobby name
    const roomId =
      lobbyName.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-" + Date.now();

    // Create room in Firestore
    await firebaseManager.createRoom(roomId, lobbyName, maxPlayers);

    // Join the lobby
    await startGame(roomId, playerName);
  } catch (error) {
    console.error("Failed to create lobby:", error);
    loadingScreen.style.display = "none";
    alert("Failed to create lobby: " + error.message);
  }
}

/**
 * Joins an existing lobby
 */
window.joinLobby = async function (roomId, roomName) {
  const playerName = document.getElementById("user-name").textContent;
  const loadingScreen = document.getElementById("loading");

  try {
    loadingScreen.style.display = "flex";
    document.getElementById(
      "loading-text"
    ).textContent = `Joining ${roomName}...`;

    await startGame(roomId, playerName);
  } catch (error) {
    console.error("Failed to join lobby:", error);
    loadingScreen.style.display = "none";
    alert("Failed to join lobby: " + error.message);
  }
};

/**
 * Starts the game with the selected room
 * Now shows character selection first before starting the game
 */
async function startGame(roomId, playerName) {
  const lobbyScreen = document.getElementById("lobby-screen");
  const loadingScreen = document.getElementById("loading");

  try {
    lobbyScreen.style.display = "none";
    loadingScreen.style.display = "flex";
    document.getElementById("loading-text").textContent =
      "Connecting to server...";

    // Store for later use
    currentRoomId = roomId;
    currentPlayerName = playerName;

    // Create and initialize game (but don't start yet)
    game = new Game();
    game.firebaseManager = firebaseManager;

    // Initialize network manager first
    game.networkManager = game.networkManager || new NetworkManager(game);
    game.networkManager.setFirebaseUid(firebaseManager.getUid());

    // Set up character selection callbacks
    setupCharacterSelectionCallbacks(game.networkManager, roomId);

    // Connect to server - this will trigger character selection screen
    await game.networkManager.connect(playerName, roomId);

    // Hide loading, character selection will be shown by callback
    loadingScreen.style.display = "none";
  } catch (error) {
    console.error("Failed to start game:", error);
    loadingScreen.style.display = "none";
    lobbyScreen.style.display = "flex";
    alert("Failed to connect: " + error.message);
  }
}

/**
 * Sets up callbacks for character selection flow
 */
function setupCharacterSelectionCallbacks(networkManager, roomId) {
  const characterScreen = document.getElementById("character-screen");
  const characterGrid = document.getElementById("character-grid");
  const startGameBtn = document.getElementById("start-game-btn");
  const selectedCharacterInfo = document.getElementById(
    "selected-character-info"
  );
  const selectedCharacterName = document.getElementById(
    "selected-character-name"
  );

  let currentSelection = null;

  // When server sends character selection screen
  networkManager.onCharacterSelectScreen = (data) => {
    console.log("[Main] Showing character selection screen");
    characterScreen.style.display = "flex";
    renderCharacterGrid(data.characters);
  };

  // When character is successfully selected
  networkManager.onCharacterSelected = (data) => {
    currentSelection = data.characterId;
    const char = CHARACTERS[data.characterId];

    selectedCharacterInfo.style.display = "block";
    selectedCharacterName.textContent = `${char.icon} ${char.name} - ${char.description}`;
    startGameBtn.disabled = false;

    renderCharacterGrid(data.characters);
  };

  // When character selection fails
  networkManager.onCharacterSelectFailed = (data) => {
    alert(data.error + ". Please choose another character.");
    renderCharacterGrid(data.characters);
  };

  // When character states change (someone else selected/left)
  networkManager.onCharacterStateChanged = (data) => {
    renderCharacterGrid(data.characters);
  };

  // Render character grid with 3D characters
  function renderCharacterGrid(characterStates) {
    // Dispose existing 3D previews
    if (characterPreview) {
      characterPreview.dispose();
      characterPreview = null;
    }

    characterGrid.innerHTML = "";

    CHARACTER_LIST.forEach((char) => {
      const state = characterStates.find((s) => s.id === char.id);
      const isTaken = state && !state.available;
      const isSelected = currentSelection === char.id;

      const card = document.createElement("div");
      card.className = `character-card${
        isTaken && !isSelected ? " taken" : ""
      }${isSelected ? " selected" : ""}`;
      card.dataset.characterId = char.id;

      // Convert hex color to CSS
      const colorHex = "#" + char.color.toString(16).padStart(6, "0");

      card.innerHTML = `
        <div class="character-canvas-container"></div>
        <div class="character-info">
          <div class="character-name">${char.name}</div>
          <div class="character-description">${char.description}</div>
        </div>
        <div class="character-color-bar" style="background: linear-gradient(90deg, ${colorHex}, ${colorHex}80);"></div>
      `;

      // Only allow selection if not taken (or is our selection)
      if (!isTaken || isSelected) {
        card.addEventListener("click", () => {
          if (char.id !== currentSelection) {
            networkManager.selectCharacter(char.id);
          }
        });
      }

      characterGrid.appendChild(card);
    });

    // Initialize 3D character previews after DOM is updated
    setTimeout(() => {
      characterPreview = new CharacterPreview(characterGrid);
      characterPreview.init();
    }, 50);
  }

  // Handle start game button
  startGameBtn.addEventListener("click", async () => {
    if (!currentSelection) {
      alert("Please select a character first!");
      return;
    }

    startGameBtn.disabled = true;
    startGameBtn.textContent = "Starting...";

    try {
      // Send ready signal
      networkManager.sendReady();

      // Dispose 3D character previews
      if (characterPreview) {
        characterPreview.dispose();
        characterPreview = null;
      }

      // Hide character screen
      characterScreen.style.display = "none";

      // Show loading screen while game initializes
      const loadingScreen = document.getElementById("loading");
      loadingScreen.style.display = "flex";
      document.getElementById("loading-text").textContent = "Loading world...";

      // Now initialize the full game
      await initializeFullGame(currentRoomId);
    } catch (error) {
      console.error("Failed to start game:", error);
      characterScreen.style.display = "flex";
      startGameBtn.disabled = false;
      startGameBtn.textContent = "Start Game";
      alert("Failed to start game: " + error.message);
    }
  });
}

/**
 * Initializes the full game after character selection
 */
async function initializeFullGame(roomId) {
  const loadingScreen = document.getElementById("loading");

  try {
    // Initialize the game properly
    await game.initWithNetwork();

    // Join room in Firestore and subscribe to world state
    await firebaseManager.joinRoom(roomId);

    firebaseManager.subscribeToWorldState(roomId, (state) => {
      console.log("[Main] World state changed via Firestore:", state);
      if (game && game.switchWorld) {
        game.switchWorld(state);
      }
    });

    console.log("[Main] Game started successfully in room:", roomId);
  } catch (error) {
    console.error("Failed to initialize game:", error);
    loadingScreen.style.display = "none";
    throw error;
  }
}

// Handle page unload - clean up Firebase and game resources
window.addEventListener("beforeunload", async () => {
  if (firebaseManager) {
    await firebaseManager.dispose();
  }
  if (game) {
    game.dispose();
  }
});

// Expose instances for debugging
window.game = game;
window.firebaseManager = firebaseManager;
