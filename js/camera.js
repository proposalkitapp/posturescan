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
    this.greenLockedThreshold = 10; // ~0.4s of continuous stable green framing
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

      // Instantly activate the yellow framing line on camera start
      const box = document.getElementById('framing-guide-box');
      if (box) {
        box.classList.remove('frame-ready');
        box.classList.add('frame-adjust');
      }

      const statusText = document.getElementById('scanner-status-text');
      const statusDot = document.getElementById('status-indicator-dot');
      if (statusText) statusText.innerText = 'Camera Active — Step into yellow frame';
      if (statusDot) statusDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse';

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
    // Hook onResults handler to pose detector
    if (poseEngine.pose) {
      poseEngine.pose.onResults((results) => {
        this.handlePoseResults(results);
      });
    }

    const loop = async () => {
      if (!this.isStreaming || !this.video) return;

      if (this.video.readyState >= 2 && this.video.videoWidth > 0) {
        // Synchronize overlay canvas buffer dimensions to match video stream exactly
        if (this.overlayCanvas) {
          if (this.overlayCanvas.width !== this.video.videoWidth || this.overlayCanvas.height !== this.video.videoHeight) {
            this.overlayCanvas.width = this.video.videoWidth;
            this.overlayCanvas.height = this.video.videoHeight;
          }
        }

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

    this.animationFrameId = requestAnimationFrame(loop);
  }

  handlePoseResults(results) {
    if (!results || !results.poseLandmarks) return;
    const landmarks = results.poseLandmarks;

    const framing = poseEngine.checkAthleteFraming(landmarks);
    this.updateFramingHUD(framing);

    // Draw real-time skeleton overlay with signature Green & Yellow lines
    if (this.overlayCanvas) {
      skeletonRenderer.drawFramingGuide(this.overlayCanvas, landmarks, framing.isFramed, this.video);
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
      this.consecutiveGreenFrames = Math.max(0, this.consecutiveGreenFrames - 1);
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
      box.classList.add('frame-ready'); // Green glowing bounding box line!

      if (distBadge) {
        distBadge.innerText = 'LOCKED & READY';
        distBadge.className = 'bg-emerald-500 text-stone-950 px-2.5 py-0.5 rounded-full backdrop-blur text-[10px] font-black tracking-wider';
      }
      if (confBadge) {
        confBadge.innerText = 'AUTO-STARTING...';
        confBadge.className = 'bg-emerald-500 text-stone-950 px-2.5 py-0.5 rounded-full backdrop-blur text-[10px] font-black tracking-wider';
      }
      if (statusText && !app.isSpinning) {
        statusText.innerText = 'Framing Locked (Green) — Commencing Scan';
      }
      if (statusDot) {
        statusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
      }
    } else {
      box.classList.remove('frame-ready');
      box.classList.add('frame-adjust'); // Yellow glowing bounding box line!

      if (distBadge) {
        distBadge.innerText = framing.distanceFeedback;
        distBadge.className = 'bg-amber-400 text-stone-950 px-2.5 py-0.5 rounded-full backdrop-blur text-[10px] font-black tracking-wider';
      }
      if (confBadge) {
        confBadge.innerText = framing.confidenceBadge;
        confBadge.className = 'bg-stone-900/90 text-amber-300 px-2.5 py-0.5 rounded-full backdrop-blur text-[10px] font-bold border border-amber-400/30';
      }
      if (statusText && !app.isSpinning) {
        statusText.innerText = 'Align full body inside the yellow frame';
      }
      if (statusDot) {
        statusDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse';
      }
    }
  }
}

const cameraManager = new CameraManager();
