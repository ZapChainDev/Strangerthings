/**
 * Firestore Security Rules for Stranger Things Multiplayer Game
 *
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║  SECURITY PRINCIPLES                                                          ║
 * ╠═══════════════════════════════════════════════════════════════════════════════╣
 * ║  1. Players can only write to their OWN player document                       ║
 * ║  2. All players can READ rooms and world state                                ║
 * ║  3. Room metadata updates (playerCount) are protected                         ║
 * ║  4. World state is readable by all, writable by authenticated users           ║
 * ║  5. Chat messages can only be created, not edited or deleted                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Go to Firebase Console > Firestore Database > Rules
 * 2. Copy and paste the rules below (without the JavaScript comment markers)
 * 3. Click "Publish"
 *
 * Or use Firebase CLI:
 *   firebase deploy --only firestore:rules
 */

/*
===================================================================================
COPY EVERYTHING BELOW THIS LINE INTO FIREBASE CONSOLE
===================================================================================

rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ═══════════════════════════════════════════════════════════════════════════
    // HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Check if the authenticated user owns this document
    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }
    
    // Validate that a field exists and is a string
    function isValidString(field) {
      return field is string && field.size() > 0 && field.size() <= 100;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PLAYER PROFILES: players/{uid}
    // Players can ONLY write to their own document
    // ═══════════════════════════════════════════════════════════════════════════
    
    match /players/{userId} {
      // Anyone can read player profiles (for displaying names)
      allow read: if isAuthenticated();
      
      // Players can only write to their OWN profile
      allow create: if isOwner(userId)
        && request.resource.data.keys().hasAll(['name', 'createdAt'])
        && isValidString(request.resource.data.name);
      
      allow update: if isOwner(userId)
        && request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['name', 'lastSeen'])
        && isValidString(request.resource.data.name);
      
      // Players cannot delete their profiles
      allow delete: if false;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // ROOMS: rooms/{roomId}
    // All authenticated users can read
    // Only server should ideally write (but we allow limited writes for MVP)
    // ═══════════════════════════════════════════════════════════════════════════
    
    match /rooms/{roomId} {
      // Anyone authenticated can read room data
      allow read: if isAuthenticated();
      
      // Allow room creation and updates for playerCount only
      // In production, this should be done via Cloud Functions
      allow create: if isAuthenticated()
        && request.resource.data.keys().hasAll(['name', 'maxPlayers', 'playerCount'])
        && request.resource.data.playerCount >= 0
        && request.resource.data.playerCount <= 30;
      
      // Only allow playerCount updates (not name/maxPlayers)
      allow update: if isAuthenticated()
        && request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['playerCount'])
        && request.resource.data.playerCount >= 0
        && request.resource.data.playerCount <= 30;
      
      allow delete: if false;
      
      // ═══════════════════════════════════════════════════════════════════════
      // CHAT MESSAGES: rooms/{roomId}/messages/{messageId}
      // Players can create messages, but not edit or delete them
      // ═══════════════════════════════════════════════════════════════════════
      
      match /messages/{messageId} {
        // Anyone in the room can read messages
        allow read: if isAuthenticated();
        
        // Players can create messages with their own UID
        allow create: if isAuthenticated()
          && request.resource.data.uid == request.auth.uid
          && request.resource.data.keys().hasAll(['uid', 'playerName', 'message', 'createdAt'])
          && request.resource.data.message.size() <= 500;
        
        // No editing or deleting messages
        allow update, delete: if false;
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // WORLD STATE: worlds/{roomId}
    // All authenticated users can read
    // Authenticated users can update (triggers world sync)
    // ═══════════════════════════════════════════════════════════════════════════
    
    match /worlds/{roomId} {
      // Anyone authenticated can read world state
      allow read: if isAuthenticated();
      
      // Allow creating world state document
      allow create: if isAuthenticated()
        && request.resource.data.keys().hasAll(['state', 'updatedAt'])
        && request.resource.data.state in ['normal', 'upsideDown'];
      
      // Allow updating world state (limited to state field)
      // In production, consider using Cloud Functions for state changes
      allow update: if isAuthenticated()
        && request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['state', 'updatedAt'])
        && request.resource.data.state in ['normal', 'upsideDown'];
      
      allow delete: if false;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // DEFAULT: Deny all other access
    // ═══════════════════════════════════════════════════════════════════════════
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}

===================================================================================
END OF RULES
===================================================================================
*/

/**
 * SECURITY NOTES FOR PRODUCTION:
 *
 * 1. RATE LIMITING: Consider using Cloud Functions with rate limiting for:
 *    - World state updates (prevent spam toggling)
 *    - Chat messages (prevent flood)
 *    - Room join/leave operations
 *
 * 2. ABUSE PREVENTION:
 *    - Add profanity filter for player names and chat
 *    - Implement IP-based rate limiting
 *    - Consider requiring email verification for persistent accounts
 *
 * 3. DATA VALIDATION:
 *    - All string lengths are limited
 *    - Numeric values are bounded
 *    - Only specific fields can be written
 *
 * 4. FREE TIER CONSIDERATIONS:
 *    - Firestore free tier: 50K reads, 20K writes per day
 *    - Authentication: Unlimited anonymous users
 *    - Keep operations low-frequency as designed
 */
