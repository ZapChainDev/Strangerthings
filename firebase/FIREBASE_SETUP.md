# Firebase Integration Guide

This document explains how to set up Firebase for the Stranger Things multiplayer game.

## Why Firebase?

Firebase provides:

- **Anonymous Authentication**: Persistent player identity without login
- **Firestore**: NoSQL database for player profiles, room metadata, and world state
- **Free Tier**: Generous limits for small-scale games

## ⚠️ Important: What Firebase Does NOT Do

Firebase is **NOT** used for real-time gameplay. Here's why:

| Feature              | WebSocket (Socket.io)     | Firebase Firestore    |
| -------------------- | ------------------------- | --------------------- |
| Latency              | 10-50ms                   | 100-300ms             |
| Update Rate          | 20/second                 | Not designed for this |
| Cost at 20 ticks/sec | Free (self-hosted)        | $5000+/month          |
| Use Case             | Player positions, physics | Profiles, settings    |

### The Math

- 20 updates/second × 30 players = 600 writes/second
- 600 × 60 × 60 × 24 = **51.8 million writes/day**
- Firebase free tier: **20,000 writes/day**
- You'd exceed the free tier in ~34 seconds!

## Setup Instructions

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Name it (e.g., "stranger-things-game")
4. Disable Google Analytics (optional, saves quota)
5. Click "Create project"

### 2. Enable Anonymous Authentication

1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Click "Anonymous"
3. Toggle "Enable"
4. Click "Save"

### 3. Create Firestore Database

1. Go to **Firestore Database** → **Create database**
2. Select "Start in test mode" (we'll add rules later)
3. Choose a location close to your users
4. Click "Enable"

### 4. Get Your Firebase Config

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps" section
3. Click the web icon (`</>`) to add a web app
4. Register with a nickname (e.g., "stranger-things-client")
5. Copy the `firebaseConfig` object

### 5. Update the Client Code

Edit `client/js/firebase/FirebaseManager.js` and replace the config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
```

### 6. Deploy Security Rules

1. Go to **Firestore Database** → **Rules**
2. Copy the rules from `firebase/firestore.rules.js` (the section between the comment markers)
3. Click "Publish"

## Firestore Data Model

```
players/{uid}
├── name: string
├── createdAt: timestamp
└── lastSeen: timestamp

rooms/{roomId}
├── name: string
├── maxPlayers: number
├── playerCount: number
└── messages/{messageId}
    ├── uid: string
    ├── playerName: string
    ├── message: string
    └── createdAt: timestamp

worlds/{roomId}
├── state: "normal" | "upsideDown"
└── updatedAt: timestamp
```

## Free Tier Limits

| Resource          | Free Limit | Our Usage |
| ----------------- | ---------- | --------- |
| Auth users        | Unlimited  | ✅ Safe   |
| Firestore reads   | 50K/day    | ~1-2K/day |
| Firestore writes  | 20K/day    | ~500/day  |
| Firestore storage | 1 GB       | ~10 MB    |

## Architecture Flow

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   Client     │       │  Socket.io   │       │   Firebase   │
│  (Browser)   │       │   Server     │       │  (Firestore) │
└──────┬───────┘       └──────┬───────┘       └──────┬───────┘
       │                      │                      │
       │ 1. Anonymous Auth    │                      │
       │ ─────────────────────────────────────────►  │
       │ ◄───────────────────────────────────────────│
       │    Returns UID                              │
       │                      │                      │
       │ 2. Connect + Join    │                      │
       │ ─────────────────────►                      │
       │  {uid, roomId}       │                      │
       │ ◄─────────────────────                      │
       │                      │                      │
       │ 3. Position Updates  │                      │
       │ ◄────────────────────►  (20/sec, low latency)
       │                      │                      │
       │ 4. World State Sync  │                      │
       │ ◄─────────────────────────────────────────► │
       │    (rare, when state changes)               │
       │                      │                      │
```

## Testing

1. Start the server: `npm start`
2. Open http://localhost:3000 in multiple browser tabs
3. Check browser console for Firebase auth logs
4. Check Firebase Console → Authentication for anonymous users
5. Check Firestore for player documents

## Troubleshooting

### "Firebase not initialized"

- Check that your config values are correct
- Ensure you're loading from HTTPS in production

### "Permission denied" errors

- Verify security rules are deployed
- Check that anonymous auth is enabled
- Ensure the user is authenticated before Firestore operations

### High read/write usage

- World state should only sync on actual changes
- Player profiles are written once per session
- Room playerCount updates on join/leave only

## Production Considerations

1. **Enable App Check**: Prevents abuse from non-app clients
2. **Add rate limiting**: Use Cloud Functions for write operations
3. **Monitor usage**: Set up budget alerts in Firebase Console
4. **Backup data**: Enable Firestore backups for player data
