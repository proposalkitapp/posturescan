/**
 * Camera Stream & Automatic Recording Framing Loop
 * Automatically starts recording when full-body framing locks green.
 * Includes visual 3-2-1 countdown, live body-part checklist, and manual start override.
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

    // Automatic trigger & countdown state
    this.framingHistory = [];
    this.historyWindowSize = 8;
    this.requiredLockedFrames = 5; // 5 out of 8 frames (~0.25s) confirms lock
    this.hasAutoTriggered = false;

    this.isCountingDown = false;
    this.countdownTimer = null;
    this.countdownSeconds = 3;
    this.isManualCountdown = false;
  }

  init(videoElementId, overlayCanvasId) {
    this.video = document.getElementById(videoElementId);
    this.overlayCanvas = document.getElementById(overlayCanvasId);
  }

  async startCamera() {
    const promptCard = document.getElementById('camera-prompt-card');
    const loadingCard = document.getElementById('pose-loading-indicator');

    try {
      if (this.stream) {
        this.stopCamera();
      }

      if (loadingCard) loadingCard.classList.remove('hidden');

      await poseEngine.init();

      if (loadingCard) loadingCard.classList.add('hidden');

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
      this.framingHistory = [];
      this.cancelCountdown();

      if (promptCard) promptCard.classList.add('hidden');

      // Instantly activate the yellow framing line on camera start
      const box = document.getElementById('framing-guide-box');
      if (box) {
        box.classList.remove('frame-ready');
        box.classList.add('frame-adjust');
      }

      const statusText = document.getElementById('scanner-status-text');
      const statusDot = document.getElementById('status-indicator-dot');
      if (statusText) statusText.innerText = 'Camera Ready — Step back into the frame';
      if (statusDot) statusDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse';

      this.startFrameLoop();
      return true;
    } catch (err) {
      console.error('Camera error', err);
      if (loadingCard) loadingCard.classList.add('hidden');
      if (promptCard) promptCard.classList.remove('hidden');
      alert('Unable to access camera. Please ensure camera permissions are allowed, or click "Load Sample Athlete Scan" to test.');
      return false;
    }
  }

  stopCamera() {
    this.isStreaming = false;
    this.cancelCountdown();
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
    if (poseEngine.pose) {
      poseEngine.pose.onResults((results) => {
        this.handlePoseResults(results);
      });
    }

    const loop = async () => {
      if (!this.isStreaming || !this.video) return;

      if (this.video.readyState >= 2 && this.video.videoWidth > 0) {
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

    // Draw real-time skeleton overlay with Green & Yellow lines
    if (this.overlayCanvas) {
      const isGuideGreen = framing.isFramed || this.isCountingDown;
      skeletonRenderer.drawFramingGuide(this.overlayCanvas, landmarks, isGuideGreen, this.video);
    }

    // Sliding window for smooth green lock
    this.framingHistory.push(framing.isFramed);
    if (this.framingHistory.length > this.historyWindowSize) {
      this.framingHistory.shift();
    }
    const lockedFramesCount = this.framingHistory.filter(Boolean).length;
    const isStableLock = lockedFramesCount >= this.requiredLockedFrames;

    // Check if countdown is currently running
    if (this.isCountingDown) {
      // If auto-countdown and athlete completely disappears from view for several frames, cancel
      if (!this.isManualCountdown && lockedFramesCount === 0 && !framing.checklist.head && !framing.checklist.torso) {
        this.cancelCountdown();
      }
      return;
    }

    // AUTOMATIC COUNTDOWN TRIGGER:
    // When framing becomes green and holds stable, initiate 3-2-1 countdown!
    if (isStableLock && !app.isSpinning && !this.hasAutoTriggered) {
      this.startCountdown(false);
    }

    // Frame hook during active spin
    if (this.onFrameCallback) {
      this.onFrameCallback(landmarks);
    }
  }

  // 3-2-1 Countdown before commencing 360° spin recording
  startCountdown(isManual = false) {
    if (this.isCountingDown || app.isSpinning) return;

    this.isCountingDown = true;
    this.isManualCountdown = isManual;
    this.countdownSeconds = 3;

    // Play lock chime & announcement
    audioGuide.announceFramingLocked();

    const overlay = document.getElementById('scan-countdown-overlay');
    const numEl = document.getElementById('scan-countdown-number');
    const textEl = document.getElementById('scan-countdown-text');
    const statusText = document.getElementById('scanner-status-text');

    if (overlay) overlay.classList.remove('hidden');
    if (numEl) {
      numEl.innerText = '3';
      numEl.className = 'text-6xl sm:text-8xl font-black text-amber-400 font-display animate-countdown-pop';
    }
    if (textEl) textEl.innerText = 'Hold steady... stand tall';
    if (statusText) statusText.innerText = 'Framing Locked! Starting in 3...';

    audioGuide.playCountdownBeep(3);

    this.countdownTimer = setInterval(() => {
      this.countdownSeconds--;

      if (this.countdownSeconds === 2) {
        if (numEl) {
          numEl.innerText = '2';
          numEl.className = 'text-6xl sm:text-8xl font-black text-amber-400 font-display animate-countdown-pop';
        }
        if (statusText) statusText.innerText = 'Starting in 2...';
        audioGuide.playCountdownBeep(2);
      } else if (this.countdownSeconds === 1) {
        if (numEl) {
          numEl.innerText = '1';
          numEl.className = 'text-6xl sm:text-8xl font-black text-emerald-400 font-display animate-countdown-pop';
        }
        if (textEl) textEl.innerText = 'Get ready to turn slowly right';
        if (statusText) statusText.innerText = 'Starting in 1...';
        audioGuide.playCountdownBeep(1);
      } else if (this.countdownSeconds <= 0) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
        this.isCountingDown = false;
        this.hasAutoTriggered = true;

        if (overlay) overlay.classList.add('hidden');

        // Immediately start hands-free 360 recording!
        if (window.app) {
          window.app.startAutomaticRecording();
        }
      }
    }, 1000);
  }

  cancelCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.isCountingDown = false;
    this.isManualCountdown = false;

    const overlay = document.getElementById('scan-countdown-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  // Manual one-click trigger
  startManualCountdown() {
    this.startCountdown(true);
  }

  updateFramingHUD(framing) {
    const box = document.getElementById('framing-guide-box');
    const distBadge = document.getElementById('framing-distance-badge');
    const confBadge = document.getElementById('framing-confidence-badge');
    const statusText = document.getElementById('scanner-status-text');
    const statusDot = document.getElementById('status-indicator-dot');

    // Checklist Pills
    const chkHead = document.getElementById('chk-head');
    const chkTorso = document.getElementById('chk-torso');
    const chkLegs = document.getElementById('chk-legs');

    if (chkHead) {
      chkHead.className = framing.checklist.head 
        ? 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
        : 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-900/80 text-stone-500 border border-white/5';
    }
    if (chkTorso) {
      chkTorso.className = framing.checklist.torso
        ? 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
        : 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-900/80 text-stone-500 border border-white/5';
    }
    if (chkLegs) {
      chkLegs.className = framing.checklist.legs
        ? 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
        : 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-900/80 text-stone-500 border border-white/5';
    }

    if (!box) return;

    if (framing.isFramed || this.isCountingDown) {
      box.classList.remove('frame-adjust');
      box.classList.add('frame-ready'); // Green glowing bounding box line!

      if (distBadge) {
        distBadge.innerText = this.isCountingDown ? 'STARTING IN 3-2-1' : 'LOCKED & READY';
        distBadge.className = 'bg-emerald-500 text-stone-950 px-2.5 py-0.5 rounded-full backdrop-blur text-[10px] font-black tracking-wider';
      }
      if (confBadge) {
        confBadge.innerText = '100% FRAMED';
        confBadge.className = 'bg-emerald-500 text-stone-950 px-2.5 py-0.5 rounded-full backdrop-blur text-[10px] font-black tracking-wider';
      }
      if (statusText && !app.isSpinning && !this.isCountingDown) {
        statusText.innerText = 'Framing Locked (Green) — Preparing Scan';
      }
      if (statusDot) {
        statusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse';
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
        statusText.innerText = framing.distanceFeedback || 'Step back into the frame';
      }
      if (statusDot) {
        statusDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse';
      }
    }
  }
}

const cameraManager = new CameraManager();
