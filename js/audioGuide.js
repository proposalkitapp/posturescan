/**
 * Audio Guidance & Voice Coaching Engine
 * Uses Web Audio API for low-latency feedback beeps and SpeechSynthesis for coaching cues.
 */

class AudioGuide {
  constructor() {
    this.isMuted = false;
    this.audioCtx = null;
    this.synth = window.speechSynthesis;
    this.lastVoiceCueTime = 0;
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

  toggleMute() {
    this.isMuted = !this.isMuted;
    const btn = document.getElementById('sound-toggle-btn');
    const icon = document.getElementById('sound-icon');
    if (this.isMuted) {
      if (btn) btn.classList.add('opacity-50');
      if (icon) icon.setAttribute('data-lucide', 'volume-x');
      if (this.synth) this.synth.cancel();
    } else {
      if (btn) btn.classList.remove('opacity-50');
      if (icon) icon.setAttribute('data-lucide', 'volume-2');
      this.playTone(523.25, 0.15, 'sine'); // Quick test beep
    }
    if (window.lucide) lucide.createIcons();
    return this.isMuted;
  }

  playTone(freq = 440, duration = 0.1, type = 'sine', volume = 0.15) {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

      gain.gain.setValueAtTime(volume, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      console.warn('Audio playback error', e);
    }
  }

  playCountdownBeep(count) {
    if (count === 1) {
      this.playTone(880, 0.25, 'triangle', 0.2); // Higher pitch for final 1
    } else {
      this.playTone(440, 0.15, 'sine', 0.15);
    }
  }

  playStartSpinTone() {
    this.playTone(523.25, 0.15, 'sine', 0.2);
    setTimeout(() => this.playTone(659.25, 0.15, 'sine', 0.2), 100);
    setTimeout(() => this.playTone(783.99, 0.3, 'sine', 0.2), 200);
  }

  playMilestoneSector() {
    this.playTone(659.25, 0.1, 'sine', 0.1);
  }

  playCompleteChime() {
    this.playTone(523.25, 0.15, 'sine', 0.2);
    setTimeout(() => this.playTone(659.25, 0.15, 'sine', 0.2), 150);
    setTimeout(() => this.playTone(783.99, 0.15, 'sine', 0.2), 300);
    setTimeout(() => this.playTone(1046.50, 0.45, 'triangle', 0.25), 450);
  }

  speak(text, priority = false) {
    if (this.isMuted || !this.synth) return;
    const now = Date.now();
    // Throttle voice cues to avoid spamming
    if (!priority && now - this.lastVoiceCueTime < 2800) {
      return;
    }
    this.lastVoiceCueTime = now;

    try {
      this.synth.cancel(); // Stop any pending speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      this.synth.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error', e);
    }
  }
}

const audioGuide = new AudioGuide();
