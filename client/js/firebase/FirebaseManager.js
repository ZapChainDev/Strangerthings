/**
 * FirebaseManager Class
 * Handles Firebase integration for authentication and Firestore data persistence
 *
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  IMPORTANT: Firebase is NOT used for real-time gameplay synchronization!      ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  WHY NOT?                                                                      ║
 * ║  1. LATENCY: Firestore has ~100-300ms latency vs WebSocket's ~10-50ms         ║
 * ║     - Player position updates need <50ms for smooth gameplay                   ║
 * ║     - Firestore's latency would cause visible rubber-banding                   ║
 * ║                                                                                ║
 * ║  2. COST: Firestore charges per read/write operation                          ║
 * ║     - At 20 updates/second × 30 players = 600 writes/second = 51M writes/day  ║
 * ║     - Free tier only allows 20K writes/day - would be exceeded in ~34 seconds ║
 * ║                                                                                ║
 * ║  3. SCALABILITY: Firestore isn't designed for high-frequency game state       ║
 * ║     - WebSockets handle thousands of messages/second efficiently              ║
 * ║     - Firestore would throttle or fail under game-loop load                   ║
 * ║                                                                                ║
 * ║  WHAT FIREBASE IS USED FOR:                                                   ║
 * ║  ✓ Anonymous authentication (identify players across sessions)                 ║
 * ║  ✓ Player profile storage (name, preferences - infrequent updates)            ║
 * ║  ✓ Room/lobby metadata (room listings, player counts)                          ║
 * ║  ✓ Global world state (normal/upsideDown - changes rarely)                     ║
 * ║  ✓ Optional text chat (low-frequency messages)                                 ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  serverTimestamp,
  increment,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/**
 * Firebase configuration
 * Your Stranger Things Firebase project
 */
const firebaseConfig = {
  apiKey: "AIzaSyBHQgcGqNK4yBwZ7NQf8lIKVZwF2YcrQ3g",
  authDomain: "strangerthings-7938c.firebaseapp.com",
  projectId: "strangerthings-7938c",
  storageBucket: "strangerthings-7938c.firebasestorage.app",
  messagingSenderId: "8403233909",
  appId: "1:8403233909:web:2640db95786741a1b95c3c",
  measurementId: "G-6SMXZ6BTLK",
};

export class FirebaseManager {
  constructor() {
    this.app = null;
    this.auth = null;
    this.db = null;
    this.uid = null;
    this.userDisplayName = null; // From Google account
    this.userEmail = null; // From Google account
    this.userPhotoURL = null; // From Google account
    this.googleProvider = null;
    this.currentRoomId = null;
    this.worldStateUnsubscribe = null;
    this.onWorldStateChange = null; // Callback for world state changes
    this.initialized = false;
  }

  /**
   * Initialize Firebase app, auth, and Firestore
   * @returns {Promise<string>} The Firebase UID after Google auth
   */
  async initialize() {
    if (this.initialized) {
      return this.uid;
    }

    try {
      // Initialize Firebase app
      this.app = initializeApp(firebaseConfig);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      this.googleProvider = new GoogleAuthProvider();

      // Wait for Google authentication
      this.uid = await this.signInWithGoogle();
      this.initialized = true;

      console.log("[Firebase] Initialized with UID:", this.uid);
      console.log("[Firebase] Welcome,", this.userDisplayName);
      return this.uid;
    } catch (error) {
      console.error("[Firebase] Initialization failed:", error);
      throw error;
    }
  }

  /**
   * Sign in with Google using Firebase Auth
   * Opens a popup for Google account selection
   * @returns {Promise<string>} Firebase UID
   */
  async signInWithGoogle() {
    // First check if user is already signed in
    const currentUser = this.auth.currentUser;
    if (currentUser) {
      this.userDisplayName = currentUser.displayName;
      this.userEmail = currentUser.email;
      this.userPhotoURL = currentUser.photoURL;
      console.log("[Firebase] Already signed in as:", currentUser.displayName);
      return currentUser.uid;
    }

    try {
      // Trigger Google sign-in popup
      const result = await signInWithPopup(this.auth, this.googleProvider);
      const user = result.user;

      // Store user info from Google account
      this.userDisplayName = user.displayName;
      this.userEmail = user.email;
      this.userPhotoURL = user.photoURL;

      console.log("[Firebase] Google sign-in successful:", user.displayName);
      return user.uid;
    } catch (error) {
      // Handle specific errors
      if (error.code === "auth/popup-closed-by-user") {
        console.warn("[Firebase] Sign-in popup closed by user");
        throw new Error("Sign-in cancelled. Please sign in to play.");
      }
      if (error.code === "auth/popup-blocked") {
        console.warn("[Firebase] Sign-in popup was blocked");
        throw new Error("Popup blocked. Please allow popups for this site.");
      }
      console.error("[Firebase] Google sign-in failed:", error);
      throw error;
    }
  }

  /**
   * Get the user's display name from Google account
   * @returns {string|null} Display name or null
   */
  getUserDisplayName() {
    return this.userDisplayName;
  }

  /**
   * Get the user's photo URL from Google account
   * @returns {string|null} Photo URL or null
   */
  getUserPhotoURL() {
    return this.userPhotoURL;
  }

  /**
   * Get the current Firebase UID
   * @returns {string|null} The UID or null if not authenticated
   */
  getUid() {
    return this.uid;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PLAYER PROFILE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create or update player profile in Firestore
   * Called once when player first joins or updates their name
   * @param {string} name - Player display name
   */
  async savePlayerProfile(name) {
    if (!this.uid) {
      throw new Error("Not authenticated");
    }

    const playerRef = doc(this.db, "players", this.uid);
    const playerDoc = await getDoc(playerRef);

    if (playerDoc.exists()) {
      // Update existing profile
      await updateDoc(playerRef, {
        name: name,
        lastSeen: serverTimestamp(),
      });
    } else {
      // Create new profile
      await setDoc(playerRef, {
        name: name,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
      });
    }

    console.log("[Firebase] Player profile saved");
  }

  /**
   * Get player profile from Firestore
   * @returns {Promise<Object|null>} Player profile data or null
   */
  async getPlayerProfile() {
    if (!this.uid) {
      return null;
    }

    const playerRef = doc(this.db, "players", this.uid);
    const playerDoc = await getDoc(playerRef);

    if (playerDoc.exists()) {
      return playerDoc.data();
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ROOM/LOBBY OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get available rooms from Firestore
   * @returns {Promise<Array>} List of available rooms
   */
  async getAvailableRooms() {
    const roomsRef = collection(this.db, "rooms");
    const snapshot = await getDocs(roomsRef);
    const rooms = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      // Only show rooms that aren't full
      if (data.playerCount < data.maxPlayers) {
        rooms.push({
          id: doc.id,
          ...data,
        });
      }
    });

    return rooms;
  }

  /**
   * Create a new room in Firestore
   * @param {string} roomId - Unique room ID
   * @param {string} roomName - Display name for the room
   * @param {number} maxPlayers - Maximum players allowed
   */
  async createRoom(roomId, roomName, maxPlayers = 8) {
    const roomRef = doc(this.db, "rooms", roomId);

    await setDoc(roomRef, {
      name: roomName,
      maxPlayers: maxPlayers,
      playerCount: 0,
      createdAt: serverTimestamp(),
      createdBy: this.uid,
    });

    console.log("[Firebase] Room created:", roomId);
  }

  /**
   * Join a room - increment player count
   * @param {string} roomId - Room ID to join
   */
  async joinRoom(roomId) {
    this.currentRoomId = roomId;
    const roomRef = doc(this.db, "rooms", roomId);

    try {
      await updateDoc(roomRef, {
        playerCount: increment(1),
      });
    } catch (error) {
      // Room might not exist yet in Firestore, create it
      await setDoc(roomRef, {
        name: roomId,
        maxPlayers: 30,
        playerCount: 1,
      });
    }

    console.log("[Firebase] Joined room:", roomId);
  }

  /**
   * Leave current room - decrement player count
   */
  async leaveRoom() {
    if (!this.currentRoomId) return;

    const roomRef = doc(this.db, "rooms", this.currentRoomId);

    try {
      await updateDoc(roomRef, {
        playerCount: increment(-1),
      });
    } catch (error) {
      console.warn("[Firebase] Failed to update room on leave:", error);
    }

    this.currentRoomId = null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WORLD STATE SYNC
  // Low-frequency updates only! World state changes rarely (when players enter portals)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Subscribe to world state changes for a room
   * This is a Firestore real-time listener for LOW-FREQUENCY state changes
   *
   * @param {string} roomId - Room to subscribe to
   * @param {Function} callback - Called when world state changes: callback(state)
   */
  subscribeToWorldState(roomId, callback) {
    // Unsubscribe from previous listener if exists
    if (this.worldStateUnsubscribe) {
      this.worldStateUnsubscribe();
    }

    this.onWorldStateChange = callback;
    const worldRef = doc(this.db, "worlds", roomId);

    this.worldStateUnsubscribe = onSnapshot(
      worldRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          console.log("[Firebase] World state updated:", data.state);

          if (this.onWorldStateChange) {
            this.onWorldStateChange(data.state);
          }
        }
      },
      (error) => {
        console.error("[Firebase] World state listener error:", error);
      }
    );

    console.log("[Firebase] Subscribed to world state for room:", roomId);
  }

  /**
   * Update global world state in Firestore
   * This should be called SPARINGLY - only when world state actually changes
   *
   * @param {string} roomId - Room ID
   * @param {string} state - "normal" or "upsideDown"
   */
  async updateWorldState(roomId, state) {
    if (state !== "normal" && state !== "upsideDown") {
      throw new Error("Invalid world state");
    }

    const worldRef = doc(this.db, "worlds", roomId);

    try {
      await updateDoc(worldRef, {
        state: state,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      // World doc might not exist, create it
      await setDoc(worldRef, {
        state: state,
        updatedAt: serverTimestamp(),
      });
    }

    console.log("[Firebase] World state updated to:", state);
  }

  /**
   * Unsubscribe from world state changes
   */
  unsubscribeFromWorldState() {
    if (this.worldStateUnsubscribe) {
      this.worldStateUnsubscribe();
      this.worldStateUnsubscribe = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIONAL TEXT CHAT
  // Low-frequency - only when players send messages
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Send a chat message to Firestore
   * Messages are stored for persistence and can be displayed to late joiners
   *
   * @param {string} roomId - Room ID
   * @param {string} message - Chat message text
   */
  async sendChatMessage(roomId, message) {
    if (!this.uid) {
      throw new Error("Not authenticated");
    }

    const profile = await this.getPlayerProfile();
    const playerName = profile?.name || "Anonymous";

    const messagesRef = collection(this.db, "rooms", roomId, "messages");

    await setDoc(doc(messagesRef), {
      uid: this.uid,
      playerName: playerName,
      message: message.substring(0, 500), // Limit message length
      createdAt: serverTimestamp(),
    });

    console.log("[Firebase] Chat message sent");
  }

  /**
   * Subscribe to chat messages for a room
   * @param {string} roomId - Room ID
   * @param {Function} callback - Called when new messages arrive
   * @returns {Function} Unsubscribe function
   */
  subscribeToChatMessages(roomId, callback) {
    const messagesRef = collection(this.db, "rooms", roomId, "messages");

    // Get recent messages only (last 50)
    const messagesQuery = query(
      messagesRef,
      where("createdAt", ">", new Date(Date.now() - 3600000)) // Last hour
    );

    return onSnapshot(messagesQuery, (snapshot) => {
      const messages = [];
      snapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data(),
        });
      });
      callback(messages);
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Clean up Firebase resources
   * Call this when the player leaves the game
   */
  async dispose() {
    // Unsubscribe from listeners
    this.unsubscribeFromWorldState();

    // Leave current room
    await this.leaveRoom();

    console.log("[Firebase] Disposed");
  }
}
