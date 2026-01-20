/**
 * AudioSystem Class
 * Manages ambient sounds and audio for atmosphere
 * Handles spatial audio and state-based sound switching
 */

export class AudioSystem {
  constructor() {
    this.audioContext = null;
    this.masterGain = null;
    this.sounds = new Map();
    this.currentAmbient = null;
    this.isUpsideDown = false;
    this.isInitialized = false;

    // Audio URLs (using Web Audio API oscillators for demo, replace with actual audio files)
    this.audioSources = {
      normal: {
        ambient: null, // Would be: 'assets/audio/night-ambience.mp3'
        wind: null, // Would be: 'assets/audio/gentle-wind.mp3'
      },
      upsideDown: {
        ambient: null, // Would be: 'assets/audio/upside-down-drone.mp3'
        hum: null, // Would be: 'assets/audio/electric-hum.mp3'
      },
    };
  }

  /**
   * Initialize audio system (must be called after user interaction)
   */
  async init() {
    if (this.isInitialized) return;

    try {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.audioContext.destination);

      // Create ambient drones using oscillators (placeholder for real audio)
      this.createAmbientDrone("normal");

      this.isInitialized = true;
      console.log("[AudioSystem] Initialized");
    } catch (error) {
      console.warn("[AudioSystem] Failed to initialize:", error);
    }
  }

  /**
   * Create ambient drone sound (placeholder using oscillators)
   */
  createAmbientDrone(state) {
    if (!this.audioContext) return;

    const oscillators = [];
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 0;

    if (state === "normal") {
      // Gentle night ambience - low frequency hum
      const osc1 = this.audioContext.createOscillator();
      osc1.type = "sine";
      osc1.frequency.value = 60;

      const osc2 = this.audioContext.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = 90;

      // Very subtle
      gainNode.gain.value = 0;

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      oscillators.push(osc1, osc2);
    } else {
      // Upside Down - unsettling low drone
      const osc1 = this.audioContext.createOscillator();
      osc1.type = "sawtooth";
      osc1.frequency.value = 30;

      const osc2 = this.audioContext.createOscillator();
      osc2.type = "sine";
      osc2.frequency.value = 45;

      // Filter for muffled sound
      const filter = this.audioContext.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 200;

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gainNode);

      oscillators.push(osc1, osc2);
    }

    gainNode.connect(this.masterGain);

    this.sounds.set(state, {
      oscillators,
      gainNode,
      isPlaying: false,
    });
  }

  /**
   * Start playing ambient sound for state
   */
  playAmbient(state) {
    if (!this.audioContext || !this.sounds.has(state)) return;

    const sound = this.sounds.get(state);
    if (sound.isPlaying) return;

    // Start oscillators
    sound.oscillators.forEach((osc) => {
      if (!osc.started) {
        osc.start();
        osc.started = true;
      }
    });

    // Fade in
    sound.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
    sound.gainNode.gain.setValueAtTime(
      sound.gainNode.gain.value,
      this.audioContext.currentTime
    );
    sound.gainNode.gain.linearRampToValueAtTime(
      0.15,
      this.audioContext.currentTime + 2
    );

    sound.isPlaying = true;
    this.currentAmbient = state;
  }

  /**
   * Stop playing ambient sound
   */
  stopAmbient(state) {
    if (!this.audioContext || !this.sounds.has(state)) return;

    const sound = this.sounds.get(state);
    if (!sound.isPlaying) return;

    // Fade out
    sound.gainNode.gain.cancelScheduledValues(this.audioContext.currentTime);
    sound.gainNode.gain.setValueAtTime(
      sound.gainNode.gain.value,
      this.audioContext.currentTime
    );
    sound.gainNode.gain.linearRampToValueAtTime(
      0,
      this.audioContext.currentTime + 1.5
    );

    sound.isPlaying = false;
  }

  /**
   * Switch to Upside Down audio
   */
  setUpsideDown(isUpsideDown) {
    this.isUpsideDown = isUpsideDown;

    if (!this.sounds.has("upsideDown")) {
      this.createAmbientDrone("upsideDown");
    }

    if (isUpsideDown) {
      this.stopAmbient("normal");
      this.playAmbient("upsideDown");
    } else {
      this.stopAmbient("upsideDown");
      this.playAmbient("normal");
    }
  }

  /**
   * Set master volume
   */
  setVolume(volume) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Resume audio context (required after user gesture)
   */
  resume() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
  }

  /**
   * Dispose audio system
   */
  dispose() {
    this.sounds.forEach((sound) => {
      sound.oscillators.forEach((osc) => {
        try {
          osc.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      });
    });

    if (this.audioContext) {
      this.audioContext.close();
    }
  }
}
