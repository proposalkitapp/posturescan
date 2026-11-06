/**
 * Camera Stream & Real-time Frame Loop Manager
 * Connects getUserMedia with MediaPipe Pose and provides framing feedback.
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
      if (promptCard) promptCard.classList.add('hidden');

      // Update UI Status
      const statusText = document.getElementById('scanner-status-text');
      const statusDot = document.getElementById('status-indicator-dot');
      if (statusText) statusText.innerText = 'Camera Live — Stand in Box';
      if (statusDot) {
        statusDot.className = 'w-3 h-3 rounded-full bg-accent-warning animate-pulse';
      }

      // Start Frame Processing Loop
      this.startFrameLoop();
      return true;
    } catch (err) {
      console.error('Camera error', err);
      if (promptCard) promptCard.classList.remove('hidden');
      alert('Unable to access camera. Please allow camera permissions or click "Use Synthetic Demo Scan Instead" to preview the app.');
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
        // Send frame to MediaPipe if available
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

    // Listen for pose results
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

    // Check framing
    const framing = poseEngine.checkAthleteFraming(landmarks);
    this.updateFramingHUD(framing);

    // Draw real-time skeleton overlay
    if (this.overlayCanvas) {
      skeletonRenderer.drawFramingGuide(this.overlayCanvas, landmarks, framing.isFramed);
    }

    // If callback registered (e.g. active 360 spin in progress)
    if (this.onFrameCallback) {
      this.onFrameCallback(landmarks);
    }
  }

  updateFramingHUD(framing) {
    const box = document.getElementById('framing-guide-box');
    const distBadge = document.getElementById('framing-distance-badge');
    const confBadge = document.getElementById('framing-confidence-badge');
    const triggerBtn = document.getElementById('trigger-scan-btn');
    const statusText = document.getElementById('scanner-status-text');
    const statusDot = document.getElementById('status-indicator-dot');

    if (!box) return;

    if (framing.isFramed) {
      box.classList.remove('frame-adjust');
      box.classList.add('frame-ready');
      if (distBadge) {
        distBadge.innerText = 'LOCKED & READY';
        distBadge.className = 'bg-brand-500/80 text-white px-2 py-0.5 rounded backdrop-blur font-bold';
      }
      if (confBadge) {
        confBadge.innerText = 'GOOD FRAMING';
        confBadge.className = 'bg-brand-500/80 text-white px-2 py-0.5 rounded backdrop-blur font-bold';
      }
      if (triggerBtn && !app.isSpinning) {
        triggerBtn.disabled = false;
      }
      if (statusText && !app.isSpinning) {
        statusText.innerText = 'Framing Locked — Ready to Scan';
      }
      if (statusDot) {
        statusDot.className = 'w-3 h-3 rounded-full bg-brand-400';
      }
    } else {
      box.classList.remove('frame-ready');
      box.classList.add('frame-adjust');
      if (distBadge) {
        distBadge.innerText = framing.distanceFeedback;
        distBadge.className = 'bg-accent-warning/80 text-white px-2 py-0.5 rounded backdrop-blur font-bold';
      }
      if (confBadge) {
        confBadge.innerText = framing.confidenceBadge;
        confBadge.className = 'bg-black/60 px-2 py-0.5 rounded backdrop-blur text-slate-400';
      }
      if (triggerBtn && !app.isSpinning) {
        triggerBtn.disabled = true;
      }
      if (statusText && !app.isSpinning) {
        statusText.innerText = 'Adjust Position';
      }
      if (statusDot) {
        statusDot.className = 'w-3 h-3 rounded-full bg-accent-warning animate-pulse';
      }
    }
  }
}

const cameraManager = new CameraManager();
