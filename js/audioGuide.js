/**
 * Audio Guidance & Voice Coaching Engine
 * Uses Web Audio API for warm harmonic feedback and SpeechSynthesis for hands-free coaching.
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
      if (btn) btn.classList.add('opacity-40');
      if (icon) icon.setAttribute('data-lucide', 'volume-x');
      if (this.synth) this.synth.cancel();
    } else {
      if (btn) btn.classList.remove('opacity-40');
      if (icon) icon.setAttribute('data-lucide', 'volume-2');
      this.playHarmonicChime([440, 554.37, 659.25]); // A major triad welcome
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

        gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime + idx * 0.08);
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

  playRecordingCommencedCue() {
    // Warm 3-tone ascending chord
    this.playHarmonicChime([392, 523.25, 659.25], 0.5);
  }

  playMilestoneSector() {
    this.playHarmonicChime([523.25, 659.25], 0.15);
  }

  playCompleteChime() {
    // Warm harmonic resolution
    this.playHarmonicChime([392, 523.25, 659.25, 783.99], 0.8);
  }

  // Mandatory prompt immediately upon green framing:
  // "Recording Commenced" + "Turn 360 degrees in a slow motion."
  announceRecordingCommenced() {
    this.playRecordingCommencedCue();
    this.speak('Recording commenced. Turn 360 degrees in a slow motion.', true);
  }

  speak(text, priority = false) {
    if (this.isMuted || !this.synth) return;
    const now = Date.now();
    if (!priority && now - this.lastVoiceCueTime < 2400) {
      return;
    }
    this.lastVoiceCueTime = now;

    try {
      this.synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.95;
      this.synth.speak(utterance);
    } catch (e) {
      console.warn('Speech error', e);
    }
  }
}

const audioGuide = new AudioGuide();
