/**
 * KineticScan 360 Main Application Controller
 */

class AppController {
  constructor() {
    this.currentView = 'home';
    this.selectedSport = 'runner';
    this.scanMode = 'continuous'; // 'continuous' or 'stepped'
    this.isSpinning = false;
    this.currentScanResults = null;
    this.activeMilestoneAngle = 90; // Default to right profile in results
    this.spinTimer = null;
    this.spinDurationMs = 10000; // 10 seconds for 360 spin
  }

  init() {
    // Render sports buttons
    this.renderSportSelectors();

    // Init camera manager bindings
    cameraManager.init('webcam-video', 'overlay-canvas');

    // Setup resize observer for crisp canvas redrawing
    window.addEventListener('resize', () => {
      if (this.currentView === 'results' && this.currentScanResults) {
        this.renderMilestoneInspection();
      }
    });

    // Icons
    if (window.lucide) lucide.createIcons();
  }

  // Navigate between views: 'home', 'scan', 'results'
  navigate(view) {
    this.currentView = view;
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.add('hidden'));

    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.remove('hidden');

    // Update nav active states
    ['home', 'scan', 'results'].forEach(v => {
      const btn = document.getElementById(`nav-btn-${v}`);
      if (btn) {
        if (v === view) {
          btn.className = 'px-3 py-1.5 rounded-md transition-all text-white bg-surface-700 shadow-sm flex items-center space-x-1.5 font-bold';
        } else {
          btn.className = 'px-3 py-1.5 rounded-md transition-all text-slate-400 hover:text-white flex items-center space-x-1.5 font-medium';
        }
      }
    });

    if (view === 'scan') {
      audioGuide.speak('Position your device upright and step back.');
    } else {
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
      const borderClass = isSelected ? 'border-brand-500 bg-brand-500/10 text-white' : 'border-surface-700/80 bg-surface-850 text-slate-300 hover:border-slate-500';
      return `
        <button onclick="app.setSport('${sport.id}')" class="p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 ${borderClass}">
          <div class="flex items-center justify-between w-full">
            <i data-lucide="${sport.icon}" class="w-5 h-5 ${isSelected ? 'text-brand-400' : 'text-slate-400'}"></i>
            ${isSelected ? '<span class="w-2 h-2 rounded-full bg-brand-400"></span>' : ''}
          </div>
          <div>
            <div class="font-display font-bold text-xs sm:text-sm text-white">${sport.name}</div>
            <div class="text-[10px] text-slate-400 line-clamp-1 mt-0.5">${sport.description}</div>
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
      // Re-evaluate results under new sport weighting
      this.currentScanResults = biomechanics.evaluateFullScan(poseEngine.milestones, this.selectedSport);
      this.renderResultsDashboard();
    }
  }

  setScanMode(mode) {
    this.scanMode = mode;
    const contBtn = document.getElementById('scan-mode-continuous');
    const stepBtn = document.getElementById('scan-mode-stepped');
    if (mode === 'continuous') {
      contBtn.className = 'px-2.5 py-1 rounded bg-brand-500/20 text-brand-400 font-bold';
      stepBtn.className = 'px-2.5 py-1 rounded text-slate-400 hover:text-white font-medium';
    } else {
      stepBtn.className = 'px-2.5 py-1 rounded bg-brand-500/20 text-brand-400 font-bold';
      contBtn.className = 'px-2.5 py-1 rounded text-slate-400 hover:text-white font-medium';
    }
  }

  async startScanFlow() {
    this.navigate('scan');
    await cameraManager.startCamera();
  }

  // Countdown & Trigger 360 Spin Recording
  initiateSpinCountdown() {
    if (this.isSpinning) return;

    audioGuide.init();
    const overlay = document.getElementById('countdown-overlay');
    const number = document.getElementById('countdown-number');
    const instr = document.getElementById('countdown-instruction');
    const triggerBtn = document.getElementById('trigger-scan-btn');

    if (triggerBtn) triggerBtn.disabled = true;
    if (overlay) overlay.classList.remove('hidden');
    if (overlay) overlay.style.display = 'flex';

    let count = 3;
    number.innerText = count;
    instr.innerText = 'GET READY';
    audioGuide.playCountdownBeep(count);

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        number.innerText = count;
        audioGuide.playCountdownBeep(count);
      } else {
        clearInterval(interval);
        if (overlay) overlay.classList.add('hidden');
        if (overlay) overlay.style.display = 'none';
        this.start360SpinExecution();
      }
    }, 1000);
  }

  start360SpinExecution() {
    this.isSpinning = true;
    poseEngine.resetMilestones();

    audioGuide.playStartSpinTone();
    audioGuide.speak('Start spinning slowly clockwise now.', true);

    const hud = document.getElementById('spin-progress-hud');
    const circle = document.getElementById('spin-progress-circle');
    const angleText = document.getElementById('spin-angle-text');
    const sectorText = document.getElementById('spin-current-sector');
    const statusText = document.getElementById('scanner-status-text');
    const statusDot = document.getElementById('status-indicator-dot');

    if (hud) hud.classList.remove('hidden');
    if (statusText) statusText.innerText = 'Scanning 360° Spin...';
    if (statusDot) statusDot.className = 'w-3 h-3 rounded-full bg-brand-400 animate-spin';

    const startTime = Date.now();
    const circumference = 2 * Math.PI * 24; // r = 24 => ~150.8

    // Frame hook
    cameraManager.onFrameCallback = (landmarks) => {
      if (!this.isSpinning) return;

      const result = poseEngine.processSpinFrame(landmarks);
      if (result) {
        if (angleText) angleText.innerText = `${result.yaw}°`;
        if (sectorText) sectorText.innerText = result.sector;

        // Update badge states
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

      // Radial circle progress
      if (circle) {
        const offset = circumference - (progress * circumference);
        circle.style.strokeDashoffset = offset;
      }

      // Voice coaching checkpoints
      if (elapsed > 4800 && elapsed < 5200) {
        audioGuide.speak('Halfway there, keep rotating.');
      } else if (elapsed > 8000 && elapsed < 8400) {
        audioGuide.speak('Almost done, finish the turn.');
      }

      if (progress >= 1) {
        clearInterval(this.spinTimer);
        this.finish360Spin();
      }
    }, 100);
  }

  finish360Spin() {
    this.isSpinning = false;
    cameraManager.onFrameCallback = null;

    const hud = document.getElementById('spin-progress-hud');
    if (hud) hud.classList.add('hidden');

    audioGuide.playCompleteChime();
    audioGuide.speak('Scan complete! Generating your kinetic report.', true);

    // If live camera didn't catch all milestones, fill with synthetic reference data
    const captured = poseEngine.milestones;
    const synthetic = poseEngine.generateSyntheticAthlete(this.selectedSport);

    [0, 90, 180, 270].forEach(deg => {
      if (!captured[deg]) {
        captured[deg] = synthetic[deg];
      }
    });

    // Evaluate full biomechanics
    this.currentScanResults = biomechanics.evaluateFullScan(captured, this.selectedSport);

    setTimeout(() => {
      this.navigate('results');
    }, 800);
  }

  cancelScan() {
    this.isSpinning = false;
    if (this.spinTimer) clearInterval(this.spinTimer);
    cameraManager.onFrameCallback = null;
    const hud = document.getElementById('spin-progress-hud');
    if (hud) hud.classList.add('hidden');
    const overlay = document.getElementById('countdown-overlay');
    if (overlay) overlay.style.display = 'none';
    this.navigate('home');
  }

  retakeScan() {
    this.startScanFlow();
  }

  // Load sample athlete for instant demo testing
  loadDemoAthlete(sport = 'runner') {
    this.selectedSport = sport;
    const synthetic = poseEngine.generateSyntheticAthlete(sport);
    poseEngine.milestones = synthetic;
    this.currentScanResults = biomechanics.evaluateFullScan(synthetic, sport);
    audioGuide.speak('Loaded sample athlete assessment.', true);
    this.navigate('results');
  }

  // Render the comprehensive athletic results report
  renderResultsDashboard() {
    const res = this.currentScanResults;
    if (!res) return;

    // Header Info
    const sportPill = document.getElementById('report-sport-pill');
    const dateSpan = document.getElementById('report-timestamp');
    if (sportPill) sportPill.innerText = res.sport.name;
    if (dateSpan) dateSpan.innerText = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    // Composite Score Card
    const scoreText = document.getElementById('composite-score-text');
    const ratingBadge = document.getElementById('composite-rating-badge');
    const scoreTransfer = document.getElementById('score-transfer');
    const barTransfer = document.getElementById('bar-transfer');
    const scoreBalance = document.getElementById('score-balance');
    const barBalance = document.getElementById('bar-balance');

    if (scoreText) scoreText.innerHTML = `${res.compositeScore}<span class="text-xl font-bold text-slate-400">/100</span>`;
    if (ratingBadge) {
      ratingBadge.innerText = res.rating;
      ratingBadge.className = `px-2.5 py-1 rounded-lg text-xs font-bold bg-${res.ratingColor}/10 text-${res.ratingColor} border border-${res.ratingColor}/20`;
    }
    if (scoreTransfer) scoreTransfer.innerText = `${res.metrics.forceTransferScore}%`;
    if (barTransfer) barTransfer.style.width = `${res.metrics.forceTransferScore}%`;
    if (scoreBalance) scoreBalance.innerText = `${res.metrics.bilateralBalanceScore}%`;
    if (barBalance) barBalance.style.width = `${res.metrics.bilateralBalanceScore}%`;

    // 3 Quick Highlights
    const badgeApt = document.getElementById('badge-pelvic-tilt');
    const descApt = document.getElementById('desc-pelvic-tilt');
    if (badgeApt) badgeApt.innerText = `Dev ${res.metrics.pelvicDev}°`;
    if (descApt && res.metrics.pelvicDev > 7) {
      descApt.innerText = 'Shortened hip flexors inhibit full glute drive during hip extension.';
    }

    const badgeValgus = document.getElementById('badge-knee-valgus');
    const descValgus = document.getElementById('desc-knee-valgus');
    if (badgeValgus) badgeValgus.innerText = `Valgus ${res.metrics.valgusAngle}°`;
    if (descValgus) {
      descValgus.innerText = res.metrics.valgusAngle > 5.5
        ? 'Medial deviation during load indicates weak gluteus medius stabilizers.'
        : 'Symmetric knee tracking aligned with mid-foot line.';
    }

    const badgeKyphosis = document.getElementById('badge-kyphosis');
    const descKyphosis = document.getElementById('desc-kyphosis');
    if (badgeKyphosis) badgeKyphosis.innerText = `Kyphotic ${res.metrics.thoracicTilt}°`;
    if (descKyphosis) {
      descKyphosis.innerText = res.metrics.thoracicTilt > 7.5
        ? 'Protracted scapulae limit overhead shoulder range and thoracic rotation.'
        : 'Neutral thoracic curvature with optimal ribcage stacking.';
    }

    // Render Milestone Canvas
    this.renderMilestoneInspection();

    // Render Prescribed Pre-Hab Drill Cards
    this.renderDrillCards(res.prescribedDrills);

    if (window.lucide) lucide.createIcons();
  }

  // Switch between 0, 90, 180, 270 angles in results
  selectMilestoneAngle(angle) {
    this.activeMilestoneAngle = angle;
    [0, 90, 180, 270].forEach(deg => {
      const tab = document.getElementById(`tab-angle-${deg}`);
      if (tab) {
        if (deg === angle) {
          tab.className = 'px-3 py-1.5 rounded-md bg-brand-500 text-white font-bold transition';
        } else {
          tab.className = 'px-3 py-1.5 rounded-md text-slate-400 hover:text-white font-medium transition';
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

    // Draw on canvas
    skeletonRenderer.drawMilestoneInspection(canvas, landmarkData, angle);

    // Update details sidebar
    const planeTitle = document.getElementById('active-plane-title');
    const vectorList = document.getElementById('vector-details-list');
    const insightText = document.getElementById('coach-insight-text');

    const m = this.currentScanResults.metrics;

    if (angle === 90 || angle === 270) {
      const sideName = angle === 90 ? 'Right' : 'Left';
      if (planeTitle) planeTitle.innerText = `Sagittal Profile Alignment (${sideName} Side - ${angle}°)`;
      if (vectorList) {
        vectorList.innerHTML = `
          <div class="flex items-center justify-between p-3 rounded-xl bg-surface-800 border border-surface-700/70">
            <div>
              <div class="text-xs font-bold text-white">Forward Head Angle (CVA)</div>
              <div class="text-[10px] text-slate-400">Tragus relative to C7 shoulder line</div>
            </div>
            <span class="text-xs font-bold px-2 py-0.5 rounded ${m.forwardHead > 12 ? 'bg-accent-warning/10 text-accent-warning' : 'bg-brand-500/10 text-brand-400'}">${m.forwardHead}°</span>
          </div>

          <div class="flex items-center justify-between p-3 rounded-xl bg-surface-800 border border-surface-700/70">
            <div>
              <div class="text-xs font-bold text-white">Thoracic Kyphosis Curvature</div>
              <div class="text-[10px] text-slate-400">Mid-back thoracic flexion index</div>
            </div>
            <span class="text-xs font-bold px-2 py-0.5 rounded ${m.thoracicTilt > 8 ? 'bg-accent-warning/10 text-accent-warning' : 'bg-brand-500/10 text-brand-400'}">${m.thoracicTilt}°</span>
          </div>

          <div class="flex items-center justify-between p-3 rounded-xl bg-surface-800 border border-surface-700/70">
            <div>
              <div class="text-xs font-bold text-white">Pelvic Girdle Tilt Vector</div>
              <div class="text-[10px] text-slate-400">Anterior / Posterior tilt deviation</div>
            </div>
            <span class="text-xs font-bold px-2 py-0.5 rounded ${m.pelvicDev > 8 ? 'bg-accent-warning/10 text-accent-warning' : 'bg-brand-500/10 text-brand-400'}">${m.pelvicDev}° APT</span>
          </div>
        `;
      }

      if (insightText) {
        insightText.innerText = m.pelvicDev > 7
          ? `Your ${sideName} profile displays an anterior pelvic tilt (${m.pelvicDev}°). In sprint extension, this cuts stride length short and forces the lumbar erectors to absorb shear stress.`
          : `Your ${sideName} sagittal plumb line demonstrates good joint stacking from ear to lateral ankle. Maintain this with posterior chain reinforcement.`;
      }
    } else {
      const planeName = angle === 0 ? 'Anterior (Front)' : 'Posterior (Back)';
      if (planeTitle) planeTitle.innerText = `Coronal Alignment (${planeName} - ${angle}°)`;
      if (vectorList) {
        vectorList.innerHTML = `
          <div class="flex items-center justify-between p-3 rounded-xl bg-surface-800 border border-surface-700/70">
            <div>
              <div class="text-xs font-bold text-white">Bilateral Shoulder Delta</div>
              <div class="text-[10px] text-slate-400">Horizontal tilt between clavicles</div>
            </div>
            <span class="text-xs font-bold px-2 py-0.5 rounded ${m.shoulderAsymmetry > 2.5 ? 'bg-accent-warning/10 text-accent-warning' : 'bg-brand-500/10 text-brand-400'}">${m.shoulderAsymmetry}°</span>
          </div>

          <div class="flex items-center justify-between p-3 rounded-xl bg-surface-800 border border-surface-700/70">
            <div>
              <div class="text-xs font-bold text-white">Pelvic Crest Symmetry</div>
              <div class="text-[10px] text-slate-400">Left vs right iliac crest elevation</div>
            </div>
            <span class="text-xs font-bold px-2 py-0.5 rounded ${m.pelvicAsymmetry > 2.5 ? 'bg-accent-warning/10 text-accent-warning' : 'bg-brand-500/10 text-brand-400'}">${m.pelvicAsymmetry}°</span>
          </div>

          <div class="flex items-center justify-between p-3 rounded-xl bg-surface-800 border border-surface-700/70">
            <div>
              <div class="text-xs font-bold text-white">Medial Knee Valgus (Q-Angle)</div>
              <div class="text-[10px] text-slate-400">Inward collapse angle relative to straight</div>
            </div>
            <span class="text-xs font-bold px-2 py-0.5 rounded ${m.valgusAngle > 5.5 ? 'bg-accent-danger/10 text-accent-danger' : 'bg-brand-500/10 text-brand-400'}">${m.valgusAngle}°</span>
          </div>
        `;
      }

      if (insightText) {
        insightText.innerText = m.valgusAngle > 5.5
          ? `Notice the ${m.valgusAngle}° medial knee deviation. When accelerating, changing direction, or landing from a jump, this vector increases tensile load on the ACL. Target the prescribed banded drills.`
          : `Frontal plane symmetry is solid with balanced shoulder levels and aligned knees.`;
      }
    }
  }

  // Render Prescribed Drill Cards
  renderDrillCards(drills) {
    const container = document.getElementById('drill-cards-container');
    if (!container || !drills) return;

    container.innerHTML = drills.map((drill, idx) => `
      <div class="bg-surface-850 rounded-2xl p-5 border border-surface-700 flex flex-col justify-between space-y-4 hover:border-brand-500/40 transition">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-500/10 text-brand-400 border border-brand-500/20">Drill 0${idx + 1}</span>
            <span class="text-[11px] text-slate-400 font-medium">${drill.frequency}</span>
          </div>
          <div>
            <h4 class="font-display font-bold text-white text-sm sm:text-base">${drill.name}</h4>
            <div class="text-[11px] text-accent-cyan font-semibold mt-0.5">Target: ${drill.target}</div>
          </div>
          <p class="text-xs text-slate-300 leading-relaxed">${drill.impact}</p>
        </div>

        <div class="space-y-2 pt-2 border-t border-surface-700/60">
          <div class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Key Execution Cue</div>
          <div class="text-xs text-slate-300 italic">"${drill.instructions[1] || drill.instructions[0]}"</div>
        </div>
      </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
  }
}

// Instantiate global app instance
const app = new AppController();

// Auto initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
