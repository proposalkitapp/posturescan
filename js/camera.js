/**
 * Camera Stream & Automatic Recording Framing Loop
 * Automatically starts recording when full-body framing turns green.
 */

class CameraManager {
  constructor() {
    this.video = null;
    this.stream = null;
    this.facingMode = 'user';
    this.isStreaming = false;
    this.animationFrameId = null;
    this.onFrameCallback = null;
    this.overlayCanvas = null;

    // Automatic trigger state
    this.consecutiveGreenFrames = 0;
    this.greenLockedThreshold = 18; // ~0.8 to 1.0s of continuous stable green framing
    this.hasAutoTriggered = false;
  }

  init(videoElementId, overlayCanvasId) {
    this.video = document.getElementById(videoElementId);
    this.overlayCanvas = document.getElementById(overlayCanvasId);
  }

  async startCamera() {
    const promptCard = document.getElementById('camera-prompt-card');
    try {
      if (this.stream) {
        this.stopCamera();
      }

      await poseEngine.init();

      const constraints = {
        video: {
          facingMode: this.facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.video.srcObject = this.stream;
      await this.video.play();

      this.isStreaming = true;
      this.hasAutoTriggered = false;
      this.consecutiveGreenFrames = 0;

      if (promptCard) promptCard.classList.add('hidden');

      const statusText = document.getElementById('scanner-status-text');
      const statusDot = document.getElementById('status-indicator-dot');
      if (statusText) statusText.innerText = 'Camera Active — Step back into the frame';
      if (statusDot) statusDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse';

      this.startFrameLoop();
      return true;
    } catch (err) {
      console.error('Camera error', err);
      if (promptCard) promptCard.classList.remove('hidden');
      alert('Unable to access camera. Please ensure camera permissions are allowed, or click "Load Sample Athlete Scan" to test.');
      return false;
    }
  }

  stopCamera() {
    this.isStreaming = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.video) {
      this.video.srcObject = null;
    }
  }

  async switchCamera() {
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    await this.startCamera();
  }

  startFrameLoop() {
    const loop = async () => {
      if (!this.isStreaming || !this.video) return;

      if (this.video.readyState >= 2) {
        if (poseEngine.pose && !poseEngine.isProcessing) {
          poseEngine.isProcessing = true;
          try {
            await poseEngine.pose.send({ image: this.video });
          } catch (e) {
            console.warn('Frame estimation error', e);
          } finally {
            poseEngine.isProcessing = false;
          }
        }
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    if (poseEngine.pose) {
      poseEngine.pose.onResults((results) => {
        this.handlePoseResults(results);
      });
    }

    this.animationFrameId = requestAnimationFrame(loop);
  }

  handlePoseResults(results) {
    if (!results || !results.poseLandmarks) return;
    const landmarks = results.poseLandmarks;

    const framing = poseEngine.checkAthleteFraming(landmarks);
    this.updateFramingHUD(framing);

    // Draw real-time skeleton overlay with subtle glow
    if (this.overlayCanvas) {
      skeletonRenderer.drawFramingGuide(this.overlayCanvas, landmarks, framing.isFramed);
    }

    // AUTOMATIC RECORDING TRIGGER:
    // When framing becomes green and holds stable, automatically start!
    if (framing.isFramed && !app.isSpinning && !this.hasAutoTriggered) {
      this.consecutiveGreenFrames++;
      if (this.consecutiveGreenFrames >= this.greenLockedThreshold) {
        this.hasAutoTriggered = true;
        this.consecutiveGreenFrames = 0;
        // Trigger automatic hands-free recording
        if (window.app) {
          window.app.startAutomaticRecording();
        }
      }
    } else if (!framing.isFramed) {
      this.consecutiveGreenFrames = Math.max(0, this.consecutiveGreenFrames - 2);
    }

    // Frame hook during active spin
    if (this.onFrameCallback) {
      this.onFrameCallback(landmarks);
    }
  }

  updateFramingHUD(framing) {
    const box = document.getElementById('framing-guide-box');
    const distBadge = document.getElementById('framing-distance-badge');
    const confBadge = document.getElementById('framing-confidence-badge');
    const statusText = document.getElementById('scanner-status-text');
    const statusDot = document.getElementById('status-indicator-dot');

    if (!box) return;

    if (framing.isFramed) {
      box.classList.remove('frame-adjust');
      box.classList.add('frame-ready');

      if (distBadge) {
        distBadge.innerText = 'LOCKED & READY';
        distBadge.className = 'bg-emerald-500/90 text-white px-2.5 py-0.5 rounded-full backdrop-blur text-[10px] font-bold tracking-wider';
      }
      if (confBadge) {
        confBadge.innerText = 'AUTO-STARTING...';
        confBadge.className = 'bg-emerald-500/90 text-white px-2.5 py-0.5 rounded-full backdrop-blur text-[10px] font-bold tracking-wider';
      }
      if (statusText && !app.isSpinning) {
        statusText.innerText = 'Framing Locked — Commencing Scan';
      }
      if (statusDot) {
        statusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
      }
    } else {
      box.classList.remove('frame-ready');
      box.classList.add('frame-adjust');

      if (distBadge) {
        distBadge.innerText = framing.distanceFeedback;
        distBadge.className = 'bg-amber-500/90 text-white px-2.5 py-0.5 rounded-full backdrop-blur text-[10px] font-bold tracking-wider';
      }
      if (confBadge) {
        confBadge.innerText = framing.confidenceBadge;
        confBadge.className = 'bg-stone-900/80 px-2.5 py-0.5 rounded-full backdrop-blur text-[10px] text-stone-300';
      }
      if (statusText && !app.isSpinning) {
        statusText.innerText = 'Align your full body inside the frame';
      }
      if (statusDot) {
        statusDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse';
      }
    }
  }
}

const cameraManager = new CameraManager();
