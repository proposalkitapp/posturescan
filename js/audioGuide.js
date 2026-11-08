/**
 * Audio Guidance & Voice Command Engine
 * Uses Web Audio API for harmonic chimes and SpeechSynthesis for directional coaching.
 * Completely handles browser autoplay restrictions, voice loading, and sequential cues.
 */

class AudioGuide {
  constructor() {
    this.isMuted = false;
    this.audioCtx = null;
    this.synth = window.speechSynthesis;
    this.selectedVoice = null;
    this.isUnlocked = false;
    this.lastVoiceCueTime = 0;
    this.speechQueue = [];
    this.isSpeaking = false;

    // Load available system voices
    this.initVoices();
  }

  init() {
    if (!this.audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  initVoices() {
    if (!this.synth) return;

    const setVoice = () => {
      const voices = this.synth.getVoices();
      if (!voices || voices.length === 0) return;

      // Prefer high-quality natural English voices
      this.selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('David') || v.name.includes('Zira'))) ||
                           voices.find(v => v.lang.startsWith('en')) ||
                           voices[0];
    };

    setVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = setVoice;
    }
  }

  // Unlocks browser audio and speech synthesis on user interaction
  unlock() {
    this.init();
    if (this.synth) {
      try {
        this.synth.resume();
        this.initVoices();
      } catch (e) {}
    }
    this.isUnlocked = true;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    const btn = document.getElementById('sound-toggle-btn');
    const icon = document.getElementById('sound-icon');
    if (this.isMuted) {
      if (btn) btn.classList.add('opacity-40');
      if (icon) icon.setAttribute('data-lucide', 'volume-x');
      if (this.synth) this.synth.cancel();
    } else {
      if (btn) btn.classList.remove('opacity-40');
      if (icon) icon.setAttribute('data-lucide', 'volume-2');
      this.unlock();
      this.playHarmonicChime([440, 554.37, 659.25], 0.35);
      this.speak('Voice commands enabled.', true);
    }
    if (window.lucide) lucide.createIcons();
    return this.isMuted;
  }

  playHarmonicChime(frequencies = [440, 554.37, 659.25], duration = 0.4) {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.audioCtx) return;

      frequencies.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.09, this.audioCtx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + idx * 0.08 + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(this.audioCtx.currentTime + idx * 0.08);
        osc.stop(this.audioCtx.currentTime + idx * 0.08 + duration);
      });
    } catch (e) {
      console.warn('Audio chime error', e);
    }
  }

  // DIRECTIONAL VOICE COMMANDS & AUDIO CUES

  // 0. Pre-scan countdown and locking cues
  announceFramingLocked() {
    this.unlock();
    this.playHarmonicChime([523.25, 659.25], 0.25);
    this.speak('Position locked! Stand tall.', true);
  }

  playCountdownBeep(count) {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.audioCtx) return;

      const freq = count === 1 ? 987.77 : count === 2 ? 880 : 783.99;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn('Countdown beep error', e);
    }
  }

  playMilestoneSector() {
    if (this.isMuted) return;
    this.playHarmonicChime([659.25, 880], 0.18);
  }

  // 1. Initial trigger: Immediately upon countdown completion
  announceRecordingCommenced() {
    this.unlock();
    this.playHarmonicChime([392, 523.25, 659.25], 0.45);
    this.speak('Recording commenced! Slowly turn to your right now.', true);
  }

  // 2. Right profile captured (90°) -> command turn to back
  announceRightProfileCaptured() {
    this.playHarmonicChime([523.25, 659.25], 0.25);
    this.speak('Right side captured! Continue turning your back to the camera.', true);
  }

  // 3. Back view captured (180°) -> command turn to left profile
  announceBackCaptured() {
    this.playHarmonicChime([587.33, 739.99], 0.25);
    this.speak('Back view captured! Keep turning around to your left side.', true);
  }

  // 4. Left profile captured (270°) -> command turn to front
  announceLeftProfileCaptured() {
    this.playHarmonicChime([659.25, 783.99], 0.25);
    this.speak('Left side captured! Now turn back to face the camera to finish.', true);
  }

  // 5. Complete (360° / Front Returned)
  announceScanComplete() {
    this.playHarmonicChime([392, 523.25, 659.25, 783.99, 1046.50], 0.85);
    this.speak('Scan complete! All angles captured. Stop and face front.', true);
  }

  // Test voice button
  testVoice() {
    this.unlock();
    this.playHarmonicChime([440, 659.25], 0.3);
    this.speak('Voice commands are working. When your frame turns green, turn slowly 360 degrees.', true);
  }

  speak(text, forceImmediate = false) {
    if (this.isMuted || !this.synth) return;
    this.unlock();

    const now = Date.now();
    if (!forceImmediate && now - this.lastVoiceCueTime < 2200) {
      return;
    }
    this.lastVoiceCueTime = now;

    try {
      if (this.synth.paused) {
        this.synth.resume();
      }

      // Safe asynchronous cancellation to avoid Chromium audio thread hang
      if (forceImmediate && (this.synth.speaking || this.synth.pending)) {
        this.synth.cancel();
      }

      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'en-US';
          utterance.rate = 0.95; // Clear, commanding cadence
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          if (this.selectedVoice) {
            utterance.voice = this.selectedVoice;
          }

          utterance.onend = () => {
            this.isSpeaking = false;
          };

          utterance.onerror = (err) => {
            console.warn('Speech error', err);
            this.isSpeaking = false;
          };

          this.isSpeaking = true;
          this.synth.speak(utterance);
        } catch (err) {
          console.warn('Utterance error', err);
        }
      }, forceImmediate ? 40 : 0);
    } catch (e) {
      console.warn('Speech synthesis call failed', e);
    }
  }
}

const audioGuide = new AudioGuide();

// Auto unlock on first user click or tap anywhere on page
document.addEventListener('pointerdown', () => audioGuide.unlock(), { once: true });
document.addEventListener('keydown', () => audioGuide.unlock(), { once: true });
