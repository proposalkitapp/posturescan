/**
 * KineticScan 360 Master Controller
 * Implements Orbix Studio warm minimalist aesthetic, hands-free auto-recording, and WCAG AA accessibility.
 */

class AppController {
  constructor() {
    this.currentView = 'home';
    this.selectedSport = 'runner';
    this.isSpinning = false;
    this.currentScanResults = null;
    this.activeMilestoneAngle = 90; // Default to right profile in results
    this.spinTimer = null;
    this.spinDurationMs = 11000; // 11s smooth slow 360 spin
    this.pendingCameraAction = null;
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

    // Check if previous scan exists in local storage
    const cached = localStorage.getItem('ks_saved_scan');
    if (cached) {
      try {
        this.currentScanResults = JSON.parse(cached);
        const reportBtn = document.getElementById('nav-btn-results');
        if (reportBtn) reportBtn.classList.remove('opacity-40', 'cursor-not-allowed');
      } catch (e) {}
    }

    if (window.lucide) lucide.createIcons();
  }

  navigate(view) {
    this.currentView = view;
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.add('hidden'));

    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.remove('hidden');

    // Update bottom dock / header navigation states
    ['home', 'scan', 'results'].forEach(v => {
      const btn = document.getElementById(`dock-btn-${v}`);
      if (btn) {
        if (v === view) {
          btn.className = 'w-10 h-10 rounded-full flex items-center justify-center transition-all bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/30';
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
        ? 'border-amber-500/80 bg-gradient-to-b from-amber-500/15 to-transparent text-white shadow-lg shadow-amber-500/10'
        : 'border-white/5 bg-stone-900/60 text-stone-300 hover:border-stone-700 hover:bg-stone-900/90';
      return `
        <button onclick="app.setSport('${sport.id}')"
          class="p-4 rounded-2xl border text-left transition-all flex flex-col justify-between space-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${borderClass}"
          role="radio" aria-checked="${isSelected}">
          <div class="flex items-center justify-between w-full">
            <div class="w-8 h-8 rounded-full ${isSelected ? 'bg-amber-500/20 text-amber-400' : 'bg-stone-800 text-stone-400'} flex items-center justify-center">
              <i data-lucide="${sport.icon}" class="w-4 h-4"></i>
            </div>
            ${isSelected ? '<span class="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400"></span>' : ''}
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

  // Camera initialization with COPPA Age Gate check
  startScanFlow() {
    privacyManager.requireAgeVerificationBeforeCamera(async () => {
      this.navigate('scan');
      await cameraManager.startCamera();
    });
  }

  // ==========================================
  // HANDS-FREE AUTOMATIC RECORDING
  // ==========================================
  startAutomaticRecording() {
    if (this.isSpinning) return;
    this.isSpinning = true;
    poseEngine.resetMilestones();

    // Voice announcement immediately as requested:
    // "Recording Commenced" + instructions to turn 360 degrees slowly
    audioGuide.announceRecordingCommenced();

    const hud = document.getElementById('spin-progress-hud');
    const circle = document.getElementById('spin-progress-circle');
    const angleText = document.getElementById('spin-angle-text');
    const sectorText = document.getElementById('spin-current-sector');
    const statusText = document.getElementById('scanner-status-text');
    const statusDot = document.getElementById('status-indicator-dot');

    if (hud) hud.classList.remove('hidden');
    if (statusText) statusText.innerText = 'Recording Commenced — Rotate slowly 360°';
    if (statusDot) statusDot.className = 'w-2.5 h-2.5 rounded-full bg-amber-400 animate-spin';

    const startTime = Date.now();
    const circumference = 2 * Math.PI * 26; // r = 26 => ~163.36

    cameraManager.onFrameCallback = (landmarks) => {
      if (!this.isSpinning) return;

      const result = poseEngine.processSpinFrame(landmarks);
      if (result) {
        if (angleText) angleText.innerText = `${result.yaw}°`;
        if (sectorText) sectorText.innerText = result.sector;

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

      // Smooth spoken cues
      if (elapsed > 5200 && elapsed < 5700) {
        audioGuide.speak('Halfway through. Continue turning.');
      } else if (elapsed > 8800 && elapsed < 9300) {
        audioGuide.speak('Almost complete. Complete the full circle.');
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
    audioGuide.speak('Scan complete. Evaluating your kinetic alignment.', true);

    const captured = poseEngine.milestones;
    const synthetic = poseEngine.generateSyntheticAthlete(this.selectedSport);

    [0, 90, 180, 270].forEach(deg => {
      if (!captured[deg]) {
        captured[deg] = synthetic[deg];
      }
    });

    this.currentScanResults = biomechanics.evaluateFullScan(captured, this.selectedSport);

    // Save locally
    try {
      localStorage.setItem('ks_saved_scan', JSON.stringify(this.currentScanResults));
    } catch (e) {}

    setTimeout(() => {
      this.navigate('results');
    }, 800);
  }

  cancelScan() {
    this.isSpinning = false;
    if (this.spinTimer) clearInterval(this.spinTimer);
    cameraManager.onFrameCallback = null;
    cameraManager.hasAutoTriggered = false;
    const hud = document.getElementById('spin-progress-hud');
    if (hud) hud.classList.add('hidden');
    this.navigate('home');
  }

  retakeScan() {
    cameraManager.hasAutoTriggered = false;
    this.startScanFlow();
  }

  loadDemoAthlete(sport = 'runner') {
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

    // Render warm minimalist score arc (matching Aivo reference image)
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

    // Highlight metrics
    const badgeApt = document.getElementById('badge-pelvic-tilt');
    const descApt = document.getElementById('desc-pelvic-tilt');
    if (badgeApt) badgeApt.innerText = `Dev ${res.metrics.pelvicDev}°`;
    if (descApt && res.metrics.pelvicDev > 7) {
      descApt.innerText = 'Shortened hip flexors limit terminal hip extension in the drive phase.';
    }

    const badgeValgus = document.getElementById('badge-knee-valgus');
    const descValgus = document.getElementById('desc-knee-valgus');
    if (badgeValgus) badgeValgus.innerText = `Valgus ${res.metrics.valgusAngle}°`;
    if (descValgus) {
      descValgus.innerText = res.metrics.valgusAngle > 5.5
        ? 'Medial tracking points to underactive gluteus medius hip stabilizers.'
        : 'Neutral knee alignment tracked along the second toe axis.';
    }

    const badgeKyphosis = document.getElementById('badge-kyphosis');
    const descKyphosis = document.getElementById('desc-kyphosis');
    if (badgeKyphosis) badgeKyphosis.innerText = `Kyphotic ${res.metrics.thoracicTilt}°`;
    if (descKyphosis) {
      descKyphosis.innerText = res.metrics.thoracicTilt > 7.5
        ? 'Scapular protraction restricts overhead reach and thoracic rotation.'
        : 'Upright thoracic stacking supporting deep respiratory volume.';
    }

    this.renderMilestoneInspection();
    this.renderDrillCards(res.prescribedDrills);

    if (window.lucide) lucide.createIcons();
  }

  // Replicates the sleek glowing sunset arc from the reference image
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

    // Background track
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = '#292524';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // Active warm sunset gradient
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

    // Indicator pill / needle at end of arc
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

    // Score text in center
    const scoreVal = document.getElementById('composite-score-text');
    if (scoreVal) scoreVal.innerHTML = `${score}<span class="text-xl font-normal text-stone-400">/100</span>`;
  }

  selectMilestoneAngle(angle) {
    this.activeMilestoneAngle = angle;
    [0, 90, 180, 270].forEach(deg => {
      const tab = document.getElementById(`tab-angle-${deg}`);
      if (tab) {
        if (deg === angle) {
          tab.className = 'px-3.5 py-1.5 rounded-full bg-amber-500 text-stone-950 font-bold transition-all';
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
      <div class="bg-stone-900/70 rounded-3xl p-5 border border-white/5 flex flex-col justify-between space-y-4 hover:border-amber-500/30 transition-all">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/20">Protocol 0${idx + 1}</span>
            <span class="text-[11px] text-stone-400 font-medium">${drill.frequency}</span>
          </div>
          <div>
            <h4 class="font-display font-bold text-stone-100 text-sm sm:text-base">${drill.name}</h4>
            <div class="text-[11px] text-amber-400 font-semibold mt-0.5">${drill.target}</div>
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
}

const app = new AppController();

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
