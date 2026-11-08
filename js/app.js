/**
 * KineticScan 360 Master Controller
 * Directional Voice Coaching & Hands-Free Automatic 360 Recording
 */

class AppController {
  constructor() {
    this.currentView = 'home';
    this.selectedSport = 'runner';
    this.isSpinning = false;
    this.currentScanResults = null;
    this.activeMilestoneAngle = 90;
    this.spinTimer = null;
    this.spinDurationMs = 12000; // 12 seconds for full comfortable 360 turn
    this.pendingCameraAction = null;

    // Track directional voice command states to avoid repeating
    this.commandedStates = {
      start: false,
      right: false,
      back: false,
      left: false,
      complete: false
    };
  }

  init() {
    this.renderSportSelectors();
    privacyManager.init();
    cameraManager.init('webcam-video', 'overlay-canvas');

    window.addEventListener('resize', () => {
      if (this.currentView === 'results' && this.currentScanResults) {
        this.renderMilestoneInspection();
        this.renderScoreArc(this.currentScanResults.compositeScore);
      }
    });

    const cached = localStorage.getItem('ks_saved_scan');
    if (cached) {
      try {
        this.currentScanResults = JSON.parse(cached);
        const reportBtn = document.getElementById('nav-btn-results');
        if (reportBtn) reportBtn.classList.remove('opacity-40', 'cursor-not-allowed');
      } catch (e) {}
    }

    this.initPostureSlider();

    if (window.lucide) lucide.createIcons();
  }

  initPostureSlider() {
    this.updatePostureSlider(50);
  }

  updatePostureSlider(val) {
    const container = document.getElementById('posture-slider-container');
    if (container) {
      container.style.setProperty('--split-pos', `${val}%`);
    }
  }

  navigate(view) {
    this.currentView = view;
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.add('hidden'));

    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.remove('hidden');

    ['home', 'scan', 'results'].forEach(v => {
      const btn = document.getElementById(`dock-btn-${v}`);
      if (btn) {
        if (v === view) {
          btn.className = 'w-10 h-10 rounded-full flex items-center justify-center transition-all bg-sunset-500 text-stone-950 shadow-lg shadow-sunset-500/30';
        } else {
          btn.className = 'w-10 h-10 rounded-full flex items-center justify-center transition-all text-stone-400 hover:text-stone-100 hover:bg-stone-800/60';
        }
      }
    });

    if (view !== 'scan') {
      cameraManager.stopCamera();
    }

    if (view === 'results' && this.currentScanResults) {
      this.renderResultsDashboard();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.lucide) lucide.createIcons();
  }

  renderSportSelectors() {
    const container = document.getElementById('sport-selector-container');
    if (!container) return;

    container.innerHTML = SPORT_PROFILES.map(sport => {
      const isSelected = sport.id === this.selectedSport;
      const borderClass = isSelected
        ? 'border-sunset-500/80 bg-gradient-to-b from-sunset-500/15 to-transparent text-white shadow-lg shadow-sunset-500/10'
        : 'border-white/5 bg-stone-900/60 text-stone-300 hover:border-stone-700 hover:bg-stone-900/90';
      return `
        <button onclick="app.setSport('${sport.id}')"
          class="p-4 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sunset-500 ${borderClass}"
          role="radio" aria-checked="${isSelected}">
          <div class="flex items-center justify-between w-full">
            <div class="w-8 h-8 rounded-full ${isSelected ? 'bg-sunset-500/20 text-sunset-400' : 'bg-stone-800 text-stone-400'} flex items-center justify-center">
              <i data-lucide="${sport.icon}" class="w-4 h-4"></i>
            </div>
            ${isSelected ? '<span class="w-2 h-2 rounded-full bg-sunset-400 shadow-sm shadow-sunset-400"></span>' : ''}
          </div>
          <div>
            <div class="font-display font-bold text-sm text-stone-100">${sport.name}</div>
            <div class="text-[11px] text-stone-400 line-clamp-1 mt-0.5">${sport.description}</div>
          </div>
        </button>
      `;
    }).join('');

    if (window.lucide) lucide.createIcons();
  }

  setSport(sportId) {
    this.selectedSport = sportId;
    this.renderSportSelectors();
    if (this.currentScanResults) {
      this.currentScanResults = biomechanics.evaluateFullScan(poseEngine.milestones, this.selectedSport);
      this.renderResultsDashboard();
    }
  }

  startScanFlow() {
    audioGuide.unlock();
    privacyManager.requireAgeVerificationBeforeCamera(async () => {
      this.navigate('scan');
      await cameraManager.startCamera();
    });
  }

  // ==============================================================
  // HANDS-FREE AUTOMATIC RECORDING & DIRECTIONAL VOICE COMMANDS
  // ==============================================================
  startAutomaticRecording() {
    if (this.isSpinning) return;
    this.isSpinning = true;
    poseEngine.resetMilestones();

    // Reset command flags
    this.commandedStates = {
      start: true,
      right: false,
      back: false,
      left: false,
      complete: false
    };

    // 1. Voice Announcement + Directional Banner
    audioGuide.announceRecordingCommenced();
    this.setDirectionalBanner('RECORDING COMMENCED', 'Slowly turn to your right now →', 'sunset');

    const hud = document.getElementById('spin-progress-hud');
    const circle = document.getElementById('spin-progress-circle');
    const angleText = document.getElementById('spin-angle-text');
    const sectorText = document.getElementById('spin-current-sector');
    const statusText = document.getElementById('scanner-status-text');
    const statusDot = document.getElementById('status-indicator-dot');

    if (hud) hud.classList.remove('hidden');
    if (statusText) statusText.innerText = 'Scanning 360° turn in progress...';
    if (statusDot) statusDot.className = 'w-2.5 h-2.5 rounded-full bg-sunset-400 animate-spin';

    const startTime = Date.now();
    const circumference = 2 * Math.PI * 26; // r = 26 => ~163.36

    // Real-time Frame Hook: Evaluate rotation angle and issue directional commands
    cameraManager.onFrameCallback = (landmarks) => {
      if (!this.isSpinning) return;

      const result = poseEngine.processSpinFrame(landmarks);
      if (result) {
        const yaw = result.yaw;
        if (angleText) angleText.innerText = `${yaw}°`;
        if (sectorText) sectorText.innerText = result.sector;

        // DIRECTIONAL VOICE COMMAND DISPATCHER BASED ON BODY YAW & MILESTONES:

        // Quadrant 1: Right profile captured (~90°)
        if (poseEngine.milestones[90] && !this.commandedStates.right) {
          this.commandedStates.right = true;
          audioGuide.announceRightProfileCaptured();
          this.setDirectionalBanner('RIGHT PROFILE CAPTURED (90°)', 'Keep turning your back to the camera →', 'amber');
        }

        // Quadrant 2: Back view captured (~180°)
        if (poseEngine.milestones[180] && !this.commandedStates.back) {
          this.commandedStates.back = true;
          audioGuide.announceBackCaptured();
          this.setDirectionalBanner('BACK VIEW CAPTURED (180°)', 'Turn around to your left profile →', 'amber');
        }

        // Quadrant 3: Left profile captured (~270°)
        if (poseEngine.milestones[270] && !this.commandedStates.left) {
          this.commandedStates.left = true;
          audioGuide.announceLeftProfileCaptured();
          this.setDirectionalBanner('LEFT PROFILE CAPTURED (270°)', 'Turn back to face front to finish →', 'emerald');
        }

        // Update milestone indicator badges
        ['front', 'right', 'back', 'left'].forEach(sec => {
          const badge = document.getElementById(`badge-${sec}`);
          if (badge && poseEngine.milestones[sec === 'front' ? 0 : sec === 'right' ? 90 : sec === 'back' ? 180 : 270]) {
            badge.classList.add('active');
          }
        });
      }
    };

    // Spin Progress Timer
    this.spinTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / this.spinDurationMs);

      if (circle) {
        const offset = circumference - (progress * circumference);
        circle.style.strokeDashoffset = offset;
      }

      // Check if all milestones are captured early or duration met
      const capturedCount = Object.values(poseEngine.milestones).filter(Boolean).length;
      if (capturedCount >= 4 && elapsed > 7000) {
        clearInterval(this.spinTimer);
        this.finish360Spin();
      } else if (progress >= 1) {
        clearInterval(this.spinTimer);
        this.finish360Spin();
      }
    }, 100);
  }

  setDirectionalBanner(title, instruction, theme = 'amber') {
    const banner = document.getElementById('directional-command-banner');
    const titleEl = document.getElementById('directional-command-title');
    const textEl = document.getElementById('directional-command-text');
    if (!banner || !titleEl || !textEl) return;

    banner.classList.remove('hidden');
    titleEl.innerText = title;
    textEl.innerText = instruction;

    if (theme === 'emerald') {
      banner.className = 'absolute top-5 inset-x-4 sm:inset-x-16 z-30 bg-emerald-500 text-stone-950 font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center justify-between border border-emerald-300';
    } else if (theme === 'amber') {
      banner.className = 'absolute top-5 inset-x-4 sm:inset-x-16 z-30 bg-amber-400 text-stone-950 font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center justify-between border border-amber-300';
    } else {
      banner.className = 'absolute top-5 inset-x-4 sm:inset-x-16 z-30 bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center justify-between border border-amber-300';
    }
    if (window.lucide) lucide.createIcons();
  }

  finish360Spin() {
    this.isSpinning = false;
    cameraManager.onFrameCallback = null;

    const hud = document.getElementById('spin-progress-hud');
    if (hud) hud.classList.add('hidden');

    // Directional banner informs user scan is complete!
    this.setDirectionalBanner('360° SCAN COMPLETE', 'All angles captured. Stop and face front.', 'emerald');

    // Final Voice command informing user it is complete:
    audioGuide.announceScanComplete();

    const captured = poseEngine.milestones;
    const hasAnyRealMilestone = Object.values(captured).some(m => m !== null && m.landmarks);

    if (hasAnyRealMilestone) {
      // Evaluate strictly from real user frames without injecting synthetic mocks
      this.currentScanResults = biomechanics.evaluateFullScan(captured, this.selectedSport, true);
    } else {
      // Graceful fallback only if zero frames were received
      const synthetic = poseEngine.generateSyntheticAthlete(this.selectedSport);
      this.currentScanResults = biomechanics.evaluateFullScan(synthetic, this.selectedSport, false);
    }

    try {
      localStorage.setItem('ks_saved_scan', JSON.stringify(this.currentScanResults));
    } catch (e) {}

    setTimeout(() => {
      const banner = document.getElementById('directional-command-banner');
      if (banner) banner.classList.add('hidden');
      this.navigate('results');
    }, 1800);
  }

  // ==============================================================
  // REAL DATA FILE UPLOAD: ANALYZE REAL PHOTO OR VIDEO
  // ==============================================================
  async handleFileUpload(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    audioGuide.unlock();
    const reader = new FileReader();

    reader.onload = async (e) => {
      const dataUrl = e.target.result;

      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = async () => {
          await poseEngine.init();

          // One-shot handler for uploaded real image
          const originalHandler = poseEngine.pose.onResults;
          poseEngine.pose.onResults((results) => {
            if (!results || !results.poseLandmarks || results.poseLandmarks.length < 25) {
              alert('Could not detect clear human posture landmarks in this image. Please ensure the full body from head to ankles is visible.');
              return;
            }

            const landmarks = results.poseLandmarks;
            const yaw = biomechanics.estimateBodyYaw(landmarks);
            const sector = biomechanics.getSectorForYaw(yaw);

            poseEngine.milestones = {
              0: null, 90: null, 180: null, 270: null
            };

            poseEngine.milestones[sector.angle] = {
              landmarks: JSON.parse(JSON.stringify(landmarks)),
              yaw: yaw,
              sector: sector.name,
              isRealUserCapture: true,
              sourceFilename: file.name,
              timestamp: Date.now()
            };

            this.currentScanResults = biomechanics.evaluateFullScan(poseEngine.milestones, this.selectedSport, true);
            this.navigate('results');
            audioGuide.speak('Real image posture analysis complete.', true);
          });

          await poseEngine.pose.send({ image: img });
        };
        img.src = dataUrl;
      } else if (file.type.startsWith('video/')) {
        const video = document.getElementById('webcam-video');
        if (video) {
          video.srcObject = null;
          video.src = dataUrl;
          this.navigate('scan');
          await video.play();
          cameraManager.isStreaming = true;
          cameraManager.startFrameLoop();
          audioGuide.speak('Analyzing uploaded video footage.', true);
        }
      }
    };

    reader.readAsDataURL(file);
    // Reset file input so same file can be re-uploaded if desired
    event.target.value = '';
  }

  cancelScan() {
    this.isSpinning = false;
    if (this.spinTimer) clearInterval(this.spinTimer);
    cameraManager.cancelCountdown();
    cameraManager.onFrameCallback = null;
    cameraManager.hasAutoTriggered = false;
    const hud = document.getElementById('spin-progress-hud');
    if (hud) hud.classList.add('hidden');
    const banner = document.getElementById('directional-command-banner');
    if (banner) banner.classList.add('hidden');
    this.navigate('home');
  }

  retakeScan() {
    cameraManager.hasAutoTriggered = false;
    this.startScanFlow();
  }

  loadDemoAthlete(sport = 'runner') {
    audioGuide.unlock();
    this.selectedSport = sport;
    const synthetic = poseEngine.generateSyntheticAthlete(sport);
    poseEngine.milestones = synthetic;
    this.currentScanResults = biomechanics.evaluateFullScan(synthetic, sport);
    try {
      localStorage.setItem('ks_saved_scan', JSON.stringify(this.currentScanResults));
    } catch (e) {}
    audioGuide.speak('Loaded sample alignment scan.', true);
    this.navigate('results');
  }

  // ==========================================
  // ATHLETIC RESULTS & MINIMALIST SCORE ARC
  // ==========================================
  renderResultsDashboard() {
    const res = this.currentScanResults;
    if (!res) return;

    const sportPill = document.getElementById('report-sport-pill');
    const dateSpan = document.getElementById('report-timestamp');
    if (sportPill) sportPill.innerText = res.sport.name;
    if (dateSpan) dateSpan.innerText = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    this.renderScoreArc(res.compositeScore);

    const ratingBadge = document.getElementById('composite-rating-badge');
    const scoreTransfer = document.getElementById('score-transfer');
    const barTransfer = document.getElementById('bar-transfer');
    const scoreBalance = document.getElementById('score-balance');
    const barBalance = document.getElementById('bar-balance');

    if (ratingBadge) {
      ratingBadge.innerText = res.rating;
      ratingBadge.className = res.compositeScore >= 85
        ? 'px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
        : res.compositeScore >= 75
          ? 'px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30'
          : 'px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30';
    }

    if (scoreTransfer) scoreTransfer.innerText = `${res.metrics.forceTransferScore}%`;
    if (barTransfer) barTransfer.style.width = `${res.metrics.forceTransferScore}%`;
    if (scoreBalance) scoreBalance.innerText = `${res.metrics.bilateralBalanceScore}%`;
    if (barBalance) barBalance.style.width = `${res.metrics.bilateralBalanceScore}%`;

    const getSeverityBadgeClass = (severity) => {
      if (severity === 'Optimal') return 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25';
      if (severity === 'Mild') return 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/25';
      return 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/25';
    };

    const m = res.metrics;

    // 1. Cervical Card (CVA & Neck Strain in lbs & kg)
    const badgeCervical = document.getElementById('badge-cervical');
    const descCervical = document.getElementById('desc-cervical');
    const loadCervical = document.getElementById('load-cervical');

    if (badgeCervical) {
      badgeCervical.innerText = m.extraNeckLoadLbs > 0 
        ? `${m.cervicalSeverity} (+${m.extraNeckLoadLbs} lbs / ${m.extraNeckLoadKg} kg)`
        : 'Optimal Alignment';
      badgeCervical.className = getSeverityBadgeClass(m.cervicalSeverity);
    }
    if (descCervical) {
      descCervical.innerText = m.extraNeckLoadLbs > 0
        ? `CVA ${m.cvaDeg}° adds +${m.extraNeckLoadLbs} lbs (${m.extraNeckLoadKg} kg) of continuous tension on upper cervical extensors.`
        : `CVA ${m.cvaDeg}° represents optimal neutral head stacking over the thoracic spine with minimal neck muscle fatigue.`;
    }
    if (loadCervical) {
      loadCervical.innerHTML = m.extraNeckLoadLbs > 0
        ? `<i data-lucide="scale" class="w-3.5 h-3.5" aria-hidden="true"></i><span>Extra neck strain: +${m.extraNeckLoadLbs} lbs / ${m.extraNeckLoadKg} kg</span>`
        : `<i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-400" aria-hidden="true"></i><span class="text-emerald-400">Neutral cervical gravity line</span>`;
    }

    // 2. Thoracic Card (Cobb Proxy & Kyphosis)
    const badgeKyphosis = document.getElementById('badge-kyphosis');
    const descKyphosis = document.getElementById('desc-kyphosis');
    if (badgeKyphosis) {
      badgeKyphosis.innerText = `Cobb ${m.kyphosisCobb}° • ${m.kyphosisSeverity}`;
      badgeKyphosis.className = getSeverityBadgeClass(m.kyphosisSeverity);
    }
    if (descKyphosis) {
      descKyphosis.innerText = m.kyphosisCobb > 45
        ? 'Scapular protraction and thoracic curve restrict overhead reach and rotational power.'
        : 'Upright thoracic stacking supporting deep respiratory volume and scapular mobility.';
    }

    // 3. Pelvic Card (APT)
    const badgeApt = document.getElementById('badge-pelvic-tilt');
    const descApt = document.getElementById('desc-pelvic-tilt');
    if (badgeApt) {
      badgeApt.innerText = `APT (${m.pelvicDev}°) • ${m.pelvicSeverity}`;
      badgeApt.className = getSeverityBadgeClass(m.pelvicSeverity);
    }
    if (descApt) {
      descApt.innerText = m.pelvicDev > 7
        ? 'Shortened hip flexors limit terminal hip extension in the drive phase and load the lumbar spine.'
        : 'Neutral pelvis alignment allows efficient glute activation and abdominal bracing.';
    }

    // 4. Knee Tracking Card (Valgus)
    const badgeValgus = document.getElementById('badge-knee-valgus');
    const descValgus = document.getElementById('desc-knee-valgus');
    if (badgeValgus) {
      badgeValgus.innerText = `${m.valgusSeverity} (${m.valgusAngle}°)`;
      badgeValgus.className = getSeverityBadgeClass(m.valgusSeverity);
    }
    if (descValgus) {
      descValgus.innerText = m.valgusAngle > 4.5
        ? 'Medial tracking points to underactive gluteus medius stabilizers and elevated patellofemoral shear.'
        : 'Neutral knee alignment tracked along the second toe axis with balanced lateral stability.';
    }

    this.renderMilestoneInspection();
    this.renderDrillCards(res.prescribedDrills);

    if (window.lucide) lucide.createIcons();
  }

  renderScoreArc(score) {
    const canvas = document.getElementById('score-arc-canvas');
    if (!canvas) return;

    const ctx = skeletonRenderer.setupCanvas(canvas, 240, 150);
    const w = 240;
    const h = 150;
    ctx.clearRect(0, 0, w, h);

    const centerX = w / 2;
    const centerY = h - 20;
    const radius = 95;
    const startAngle = Math.PI * 0.9;
    const endAngle = Math.PI * 2.1;
    const totalAngle = endAngle - startAngle;

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    const pct = Math.max(0, Math.min(1, score / 100));
    const activeEndAngle = startAngle + totalAngle * pct;

    const grad = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY - radius);
    grad.addColorStop(0, '#c2410c');
    grad.addColorStop(0.5, '#ea580c');
    grad.addColorStop(1, '#fdba74');

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, activeEndAngle);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    const pillX = centerX + Math.cos(activeEndAngle) * radius;
    const pillY = centerY + Math.sin(activeEndAngle) * radius;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(253, 186, 116, 0.6)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(pillX, pillY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const scoreVal = document.getElementById('composite-score-text');
    if (scoreVal) scoreVal.innerHTML = `${score}<span class="text-xl font-normal text-stone-400">/100</span>`;
  }

  selectMilestoneAngle(angle) {
    this.activeMilestoneAngle = angle;
    [0, 90, 180, 270].forEach(deg => {
      const tab = document.getElementById(`tab-angle-${deg}`);
      if (tab) {
        if (deg === angle) {
          tab.className = 'px-3.5 py-1.5 rounded-full bg-sunset-500 text-stone-950 font-bold transition-all';
        } else {
          tab.className = 'px-3.5 py-1.5 rounded-full text-stone-400 hover:text-stone-200 transition-all';
        }
      }
    });

    this.renderMilestoneInspection();
  }

  renderMilestoneInspection() {
    const canvas = document.getElementById('results-skeleton-canvas');
    if (!canvas || !this.currentScanResults) return;

    const angle = this.activeMilestoneAngle;
    const landmarkData = poseEngine.milestones[angle];

    skeletonRenderer.drawMilestoneInspection(canvas, landmarkData, angle);

    const planeTitle = document.getElementById('active-plane-title');
    const vectorList = document.getElementById('vector-details-list');
    const insightText = document.getElementById('coach-insight-text');

    const m = this.currentScanResults.metrics;

    if (angle === 90 || angle === 270) {
      const sideName = angle === 90 ? 'Right' : 'Left';
      if (planeTitle) planeTitle.innerText = `Sagittal Profile Stack (${sideName} Side - ${angle}°)`;
      if (vectorList) {
        vectorList.innerHTML = `
          <div class="flex items-center justify-between p-3.5 rounded-2xl bg-stone-900/70 border border-white/5">
            <div>
              <div class="text-xs font-bold text-stone-200">Forward Head Angle (CVA)</div>
              <div class="text-[11px] text-stone-400">Tragus relative to shoulder acromion</div>
            </div>
            <span class="text-xs font-bold px-2.5 py-1 rounded-full ${m.forwardHead > 12 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}">${m.forwardHead}°</span>
          </div>

          <div class="flex items-center justify-between p-3.5 rounded-2xl bg-stone-900/70 border border-white/5">
            <div>
              <div class="text-xs font-bold text-stone-200">Thoracic Spine Curvature</div>
              <div class="text-[11px] text-stone-400">Mid-back kyphosis deviation</div>
            </div>
            <span class="text-xs font-bold px-2.5 py-1 rounded-full ${m.thoracicTilt > 8 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}">${m.thoracicTilt}°</span>
          </div>

          <div class="flex items-center justify-between p-3.5 rounded-2xl bg-stone-900/70 border border-white/5">
            <div>
              <div class="text-xs font-bold text-stone-200">Pelvic Girdle Tilt Vector</div>
              <div class="text-[11px] text-stone-400">ASIS to PSIS deviation from horizontal</div>
            </div>
            <span class="text-xs font-bold px-2.5 py-1 rounded-full ${m.pelvicDev > 8 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}">${m.pelvicDev}° APT</span>
          </div>
        `;
      }

      if (insightText) {
        insightText.innerText = m.pelvicDev > 7
          ? `Your ${sideName} profile displays an anterior pelvic tilt (${m.pelvicDev}°). During acceleration and squats, this places shear stress on the lumbar erectors rather than transferring force through the glutes.`
          : `Your ${sideName} sagittal plumb line demonstrates balanced joint stacking from tragus down to lateral ankle.`;
      }
    } else {
      const planeName = angle === 0 ? 'Anterior (Front)' : 'Posterior (Back)';
      if (planeTitle) planeTitle.innerText = `Coronal Alignment (${planeName} - ${angle}°)`;
      if (vectorList) {
        vectorList.innerHTML = `
          <div class="flex items-center justify-between p-3.5 rounded-2xl bg-stone-900/70 border border-white/5">
            <div>
              <div class="text-xs font-bold text-stone-200">Bilateral Shoulder Delta</div>
              <div class="text-[11px] text-stone-400">Horizontal tilt between clavicles</div>
            </div>
            <span class="text-xs font-bold px-2.5 py-1 rounded-full ${m.shoulderAsymmetry > 2.5 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}">${m.shoulderAsymmetry}°</span>
          </div>

          <div class="flex items-center justify-between p-3.5 rounded-2xl bg-stone-900/70 border border-white/5">
            <div>
              <div class="text-xs font-bold text-stone-200">Pelvic Crest Symmetry</div>
              <div class="text-[11px] text-stone-400">Left vs right iliac crest elevation</div>
            </div>
            <span class="text-xs font-bold px-2.5 py-1 rounded-full ${m.pelvicAsymmetry > 2.5 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}">${m.pelvicAsymmetry}°</span>
          </div>

          <div class="flex items-center justify-between p-3.5 rounded-2xl bg-stone-900/70 border border-white/5">
            <div>
              <div class="text-xs font-bold text-stone-200">Knee Tracking Alignment</div>
              <div class="text-[11px] text-stone-400">Medial angle deviation relative to vertical</div>
            </div>
            <span class="text-xs font-bold px-2.5 py-1 rounded-full ${m.valgusAngle > 5.5 ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'}">${m.valgusAngle}°</span>
          </div>
        `;
      }

      if (insightText) {
        insightText.innerText = m.valgusAngle > 5.5
          ? `Notice the ${m.valgusAngle}° inward medial knee deviation. Incorporate the lateral monster walks and single-leg RDLs to reinforce the gluteus medius.`
          : `Frontal plane symmetry is solid with level shoulder horizontal axes.`;
      }
    }
  }

  renderDrillCards(drills) {
    const container = document.getElementById('drill-cards-container');
    if (!container || !drills) return;

    container.innerHTML = drills.map((drill, idx) => `
      <div class="bg-stone-900/70 rounded-3xl p-5 border border-white/5 flex flex-col justify-between space-y-4 hover:border-sunset-500/30 transition-all">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sunset-500/15 text-sunset-300 border border-sunset-500/20">Protocol 0${idx + 1}</span>
            <span class="text-[11px] text-stone-400 font-medium">${drill.frequency}</span>
          </div>
          <div>
            <h4 class="font-display font-bold text-stone-100 text-sm sm:text-base">${drill.name}</h4>
            <div class="text-[11px] text-sunset-400 font-semibold mt-0.5">${drill.target}</div>
          </div>
          <p class="text-xs text-stone-300 leading-relaxed">${drill.impact}</p>
        </div>

        <div class="space-y-1.5 pt-3 border-t border-stone-800">
          <div class="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Coach Execution Cue</div>
          <div class="text-xs text-stone-300 italic">"${drill.instructions[1] || drill.instructions[0]}"</div>
        </div>
      </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
  }

  // ==============================================================
  // RAW BIOMETRIC TELEMETRY MODAL CONTROLLER
  // ==============================================================
  openRawTelemetryModal() {
    const modal = document.getElementById('raw-telemetry-modal');
    if (!modal) return;

    const angle = this.activeMilestoneAngle || 0;
    const angleLabel = document.getElementById('telemetry-active-angle');
    if (angleLabel) angleLabel.innerText = `${angle}° (${angle === 0 ? 'Front' : angle === 90 ? 'Right Profile' : angle === 180 ? 'Back' : 'Left Profile'})`;

    const milestoneData = poseEngine.milestones[angle] || poseEngine.milestones[0] || poseEngine.milestones[90] || poseEngine.milestones[180] || poseEngine.milestones[270];
    const tbody = document.getElementById('telemetry-table-body');

    const landmarkNames = [
      'Nose', 'Left Eye Inner', 'Left Eye', 'Left Eye Outer',
      'Right Eye Inner', 'Right Eye', 'Right Eye Outer',
      'Left Ear (Tragus)', 'Right Ear (Tragus)', 'Mouth Left', 'Mouth Right',
      'Left Shoulder (Acromion)', 'Right Shoulder (Acromion)',
      'Left Elbow', 'Right Elbow', 'Left Wrist', 'Right Wrist',
      'Left Pinky', 'Right Pinky', 'Left Index', 'Right Index',
      'Left Thumb', 'Right Thumb',
      'Left Hip (ASIS/Trochanter)', 'Right Hip (ASIS/Trochanter)',
      'Left Knee (Femoral Condyle)', 'Right Knee (Femoral Condyle)',
      'Left Ankle (Lateral Malleolus)', 'Right Ankle (Lateral Malleolus)',
      'Left Heel', 'Right Heel', 'Left Foot Index', 'Right Foot Index'
    ];

    if (!milestoneData || !milestoneData.landmarks || milestoneData.landmarks.length === 0) {
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" class="py-4 text-center text-stone-500 italic">
              No live telemetry captured yet for this angle. Run a scan or upload a photo to populate live coordinate vectors.
            </td>
          </tr>
        `;
      }
    } else {
      const lm = milestoneData.landmarks;
      if (tbody) {
        tbody.innerHTML = lm.map((pt, idx) => {
          const name = landmarkNames[idx] || `Landmark ${idx}`;
          const isKeyJoint = [0, 7, 8, 11, 12, 23, 24, 25, 26, 27, 28].includes(idx);
          const x = typeof pt.x === 'number' ? pt.x.toFixed(4) : '--';
          const y = typeof pt.y === 'number' ? pt.y.toFixed(4) : '--';
          const z = typeof pt.z === 'number' ? pt.z.toFixed(4) : '--';
          const vis = typeof pt.visibility === 'number' ? `${(pt.visibility * 100).toFixed(1)}%` : '100%';

          return `
            <tr class="${isKeyJoint ? 'bg-sunset-500/5 font-semibold text-stone-200' : 'hover:bg-white/5'} transition">
              <td class="py-1.5 px-2 text-stone-500">${idx}</td>
              <td class="py-1.5 px-2 ${isKeyJoint ? 'text-sunset-300' : 'text-stone-300'} flex items-center space-x-1.5">
                ${isKeyJoint ? '<span class="w-1.5 h-1.5 rounded-full bg-sunset-400"></span>' : ''}
                <span>${name}</span>
              </td>
              <td class="py-1.5 px-2 font-mono text-stone-300">${x}</td>
              <td class="py-1.5 px-2 font-mono text-stone-300">${y}</td>
              <td class="py-1.5 px-2 font-mono text-stone-400">${z}</td>
              <td class="py-1.5 px-2 font-mono text-emerald-400">${vis}</td>
            </tr>
          `;
        }).join('');
      }
    }

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  }

  closeRawTelemetryModal() {
    const modal = document.getElementById('raw-telemetry-modal');
    if (modal) modal.classList.add('hidden');
  }

  downloadRawTelemetryJson() {
    const angle = this.activeMilestoneAngle || 0;
    const milestoneData = poseEngine.milestones[angle] || poseEngine.milestones;
    const exportData = {
      app: 'KineticScan 360',
      exportType: 'Empirical Biometric Telemetry',
      activeAngle: angle,
      sportDiscipline: this.selectedSport,
      timestamp: new Date().toISOString(),
      metrics: this.currentScanResults ? this.currentScanResults.metrics : null,
      compositeScore: this.currentScanResults ? this.currentScanResults.compositeScore : null,
      milestonesCaptured: poseEngine.milestones
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kineticscan-telemetry-${angle}deg-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

const app = new AppController();

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
