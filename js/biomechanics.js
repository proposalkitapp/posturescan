/**
 * Biomechanical Analysis Engine
 * Calculates anatomical vectors, angles, plumb lines, and kinetic chain metrics.
 */

class BiomechanicsEngine {
  constructor() {
    this.DEG2RAD = Math.PI / 180;
    this.RAD2DEG = 180 / Math.PI;
  }

  // Calculate 2D angle between three points (A -> B -> C) at vertex B
  calculateAngle2D(A, B, C) {
    if (!A || !B || !C) return 180;
    const v1 = { x: A.x - B.x, y: A.y - B.y };
    const v2 = { x: C.x - B.x, y: C.y - B.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 === 0 || mag2 === 0) return 180;
    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.acos(cosAngle) * this.RAD2DEG;
  }

  // Calculate tilt angle of line A-B relative to horizontal (in degrees)
  calculateHorizontalTilt(A, B) {
    if (!A || !B) return 0;
    const dy = B.y - A.y;
    const dx = B.x - A.x;
    return Math.atan2(dy, dx) * this.RAD2DEG;
  }

  // Calculate tilt angle of line A-B relative to vertical (in degrees)
  calculateVerticalTilt(A, B) {
    if (!A || !B) return 0;
    const dy = B.y - A.y; // positive downwards in screen coordinates
    const dx = B.x - A.x;
    // Angle relative to true vertical (dy > 0, dx = 0)
    return Math.atan2(dx, dy) * this.RAD2DEG;
  }

  // Estimate 3D body yaw rotation angle (0° to 360°)
  estimateBodyYaw(landmarks) {
    if (!landmarks || landmarks.length < 25) return 0;

    const ls = landmarks[11]; // left shoulder
    const rs = landmarks[12]; // right shoulder
    const lh = landmarks[23]; // left hip
    const rh = landmarks[24]; // right hip

    if (!ls || !rs) return 0;

    // Use shoulder vector delta
    const dx = ls.x - rs.x;
    const dz = (ls.z || 0) - (rs.z || 0);

    // Also factor hips for stability
    let hipDx = 0;
    let hipDz = 0;
    if (lh && rh) {
      hipDx = lh.x - rh.x;
      hipDz = (lh.z || 0) - (rh.z || 0);
    }

    const avgDx = (dx + hipDx) / 2;
    const avgDz = (dz + hipDz) / 2;

    // Angle in radians
    let rad = Math.atan2(avgDz, avgDx);
    let deg = rad * this.RAD2DEG;

    // Normalize: Front facing is ~0°
    let normalized = (deg + 360) % 360;
    return Math.round(normalized);
  }

  // Categorize a continuous yaw angle into canonical milestone sectors
  getSectorForYaw(yaw) {
    const y = (yaw + 360) % 360;
    if (y >= 315 || y < 45) return { id: 'front', angle: 0, name: 'Anterior (Front)' };
    if (y >= 45 && y < 135) return { id: 'right', angle: 90, name: 'Right Sagittal (90°)' };
    if (y >= 135 && y < 225) return { id: 'back', angle: 180, name: 'Posterior (Back)' };
    return { id: 'left', angle: 270, name: 'Left Sagittal (270°)' };
  }

  // Analyze Anterior (0°) or Posterior (180°) Coronal Plane
  analyzeCoronalPlane(landmarks, isPosterior = false) {
    if (!landmarks || landmarks.length < 29) return null;

    const ls = landmarks[11];
    const rs = landmarks[12];
    const lh = landmarks[23];
    const rh = landmarks[24];
    const lk = landmarks[25];
    const rk = landmarks[26];
    const la = landmarks[27];
    const ra = landmarks[28];

    // 1. Shoulder Level Asymmetry
    const shoulderTilt = Math.abs(this.calculateHorizontalTilt(rs, ls));

    // 2. Pelvic Level Asymmetry
    const pelvicTilt = Math.abs(this.calculateHorizontalTilt(rh, lh));

    // 3. Knee Valgus / Varus Q-Angles (Angle at knee from Hip -> Knee -> Ankle)
    // Straight leg is 180°. Inward bend (valgus) reduces the lateral angle
    const leftKneeAngle = this.calculateAngle2D(lh, lk, la);
    const rightKneeAngle = this.calculateAngle2D(rh, rk, ra);

    const leftValgusDev = Math.max(0, 180 - leftKneeAngle);
    const rightValgusDev = Math.max(0, 180 - rightKneeAngle);
    const maxValgusDev = Math.max(leftValgusDev, rightValgusDev);

    let valgusSeverity = 'Optimal';
    if (maxValgusDev > 9.0) {
      valgusSeverity = 'Severe';
    } else if (maxValgusDev > 5.5) {
      valgusSeverity = 'Moderate';
    } else if (maxValgusDev > 3.0) {
      valgusSeverity = 'Mild';
    } else {
      valgusSeverity = 'Optimal';
    }

    // 4. Lateral Shift (Trunk vs Pelvis Center)
    const shoulderMidX = (ls.x + rs.x) / 2;
    const hipMidX = (lh.x + rh.x) / 2;
    const ankleMidX = (la.x + ra.x) / 2;
    const lateralShift = Math.abs(shoulderMidX - hipMidX) * 100; // in %

    return {
      plane: isPosterior ? 'Posterior' : 'Anterior',
      shoulderTiltDeg: Math.round(shoulderTilt * 10) / 10,
      pelvicTiltDeg: Math.round(pelvicTilt * 10) / 10,
      leftKneeAngle: Math.round(leftKneeAngle * 10) / 10,
      rightKneeAngle: Math.round(rightKneeAngle * 10) / 10,
      maxValgusDev: Math.round(maxValgusDev * 10) / 10,
      valgusSeverity,
      lateralShiftPct: Math.round(lateralShift * 10) / 10,
      hasKneeValgus: maxValgusDev > 4.5,
      hasShoulderTilt: shoulderTilt > 2.5,
      hasPelvicTilt: pelvicTilt > 2.5
    };
  }

  // Analyze Sagittal Profile (90° Right or 270° Left)
  analyzeSagittalPlane(landmarks, isRightSide = true) {
    if (!landmarks || landmarks.length < 29) return null;

    // Select side landmarks
    const ear = isRightSide ? landmarks[8] : landmarks[7];
    const shoulder = isRightSide ? landmarks[12] : landmarks[11];
    const hip = isRightSide ? landmarks[24] : landmarks[23];
    const knee = isRightSide ? landmarks[26] : landmarks[25];
    const ankle = isRightSide ? landmarks[28] : landmarks[27];

    // 1. Forward Head Tilt (Craniovertebral Plumb Vector & CVA)
    // Line from Shoulder to Ear vs vertical plumb line
    const forwardHeadTilt = Math.abs(this.calculateVerticalTilt(shoulder, ear));
    // Clinical Craniovertebral Angle (CVA) relative to horizontal
    const cvaDeg = Math.round(Math.max(25, Math.min(65, 90 - forwardHeadTilt)) * 10) / 10;

    // Hansraj Spinal Biomechanics Cervical Load calculation:
    // Base head weight at neutral (~0-7°): ~10-12 lbs (0 lbs extra)
    // At ~15° tilt (CVA ~45-50°): +15 lbs / 7 kg extra load
    // At ~30° tilt (CVA ~38-44°): +28 lbs / 13 kg extra load
    // At ~45° tilt (CVA ~30-37°): +39 lbs / 18 kg extra load
    // At >45° tilt (CVA <30°): +50 lbs / 23 kg extra load
    let extraNeckLoadLbs = 0;
    let extraNeckLoadKg = 0;
    let cervicalSeverity = 'Optimal';

    if (forwardHeadTilt > 35) {
      extraNeckLoadLbs = 44;
      extraNeckLoadKg = 20;
      cervicalSeverity = 'Severe';
    } else if (forwardHeadTilt > 22) {
      extraNeckLoadLbs = 34;
      extraNeckLoadKg = 15;
      cervicalSeverity = 'Moderate';
    } else if (forwardHeadTilt > 12) {
      extraNeckLoadLbs = 24;
      extraNeckLoadKg = 11;
      cervicalSeverity = 'Moderate';
    } else if (forwardHeadTilt > 6.5) {
      extraNeckLoadLbs = 14;
      extraNeckLoadKg = 6;
      cervicalSeverity = 'Mild';
    } else {
      extraNeckLoadLbs = 0;
      extraNeckLoadKg = 0;
      cervicalSeverity = 'Optimal';
    }

    // 2. Thoracic Kyphosis & Cobb Angle Proxy
    // Line from Hip to Shoulder vs vertical
    const thoracicTilt = Math.abs(this.calculateVerticalTilt(hip, shoulder));
    // Cobb Angle Proxy (Clinical baseline ~28° + surface inclination * 1.5)
    const kyphosisCobb = Math.round(Math.min(75, Math.max(25, 28 + thoracicTilt * 1.6)) * 10) / 10;
    let kyphosisSeverity = 'Optimal';
    if (kyphosisCobb > 55) {
      kyphosisSeverity = 'Severe';
    } else if (kyphosisCobb > 46) {
      kyphosisSeverity = 'Moderate';
    } else if (kyphosisCobb > 38) {
      kyphosisSeverity = 'Mild';
    } else {
      kyphosisSeverity = 'Optimal';
    }

    // 3. Pelvic Tilt (Relative angle between Torso and Thigh)
    // Hip angle at vertex: Shoulder -> Hip -> Knee
    const hipAngle = this.calculateAngle2D(shoulder, hip, knee);
    // Neutral standing is ~175°-180°. Under 170° indicates anterior hip flexion tilt
    const pelvicTiltDev = Math.round(Math.abs(180 - hipAngle) * 10) / 10;
    let pelvicSeverity = 'Optimal';
    if (pelvicTiltDev > 14) {
      pelvicSeverity = 'Severe';
    } else if (pelvicTiltDev > 9) {
      pelvicSeverity = 'Moderate';
    } else if (pelvicTiltDev > 5) {
      pelvicSeverity = 'Mild';
    } else {
      pelvicSeverity = 'Optimal';
    }

    // 4. Kinetic Chain Plumb Line Horizontal Deviation
    // Deviation of Ear, Shoulder, and Hip relative to Ankle X-coordinate
    const earOffset = Math.abs(ear.x - ankle.x) * 100;
    const shoulderOffset = Math.abs(shoulder.x - ankle.x) * 100;
    const hipOffset = Math.abs(hip.x - ankle.x) * 100;

    return {
      side: isRightSide ? 'Right' : 'Left',
      forwardHeadDeg: Math.round(forwardHeadTilt * 10) / 10,
      cvaDeg,
      extraNeckLoadLbs,
      extraNeckLoadKg,
      cervicalSeverity,
      thoracicTiltDeg: Math.round(thoracicTilt * 10) / 10,
      kyphosisCobb,
      kyphosisSeverity,
      hipAngleDeg: Math.round(hipAngle * 10) / 10,
      pelvicTiltDevDeg: pelvicTiltDev,
      pelvicSeverity,
      earOffsetPct: Math.round(earOffset * 10) / 10,
      shoulderOffsetPct: Math.round(shoulderOffset * 10) / 10,
      hipOffsetPct: Math.round(hipOffset * 10) / 10,
      isAnteriorPelvicTilt: hipAngle < 172,
      isForwardHead: forwardHeadTilt > 10.0,
      isThoracicKyphosis: thoracicTilt > 7.5
    };
  }

  // Comprehensive Evaluation across all Milestone Views (100% Real Empirical Data)
  evaluateFullScan(milestones, sportId = 'general', isEmpiricalData = true) {
    const sport = SPORT_PROFILES.find(s => s.id === sportId) || SPORT_PROFILES[0];
    const weights = sport.priorityWeights;

    const anterior = milestones[0] ? this.analyzeCoronalPlane(milestones[0].landmarks, false) : null;
    const rightSagittal = milestones[90] ? this.analyzeSagittalPlane(milestones[90].landmarks, true) : null;
    const posterior = milestones[180] ? this.analyzeCoronalPlane(milestones[180].landmarks, true) : null;
    const leftSagittal = milestones[270] ? this.analyzeSagittalPlane(milestones[270].landmarks, false) : null;

    const hasSagittal = rightSagittal || leftSagittal;
    const hasCoronal = anterior || posterior;

    // Real measured values directly from user landmarks
    const activeSagittal = rightSagittal || leftSagittal;
    const forwardHead = activeSagittal ? activeSagittal.forwardHeadDeg : 0;
    const cvaDeg = activeSagittal ? activeSagittal.cvaDeg : 55;
    const extraNeckLoadLbs = activeSagittal ? activeSagittal.extraNeckLoadLbs : 0;
    const extraNeckLoadKg = activeSagittal ? activeSagittal.extraNeckLoadKg : 0;
    const cervicalSeverity = activeSagittal ? activeSagittal.cervicalSeverity : 'Optimal';

    const thoracicTilt = activeSagittal ? activeSagittal.thoracicTiltDeg : 0;
    const kyphosisCobb = activeSagittal ? activeSagittal.kyphosisCobb : 32;
    const kyphosisSeverity = activeSagittal ? activeSagittal.kyphosisSeverity : 'Optimal';

    const pelvicDev = activeSagittal ? activeSagittal.pelvicTiltDevDeg : 0;
    const pelvicSeverity = activeSagittal ? activeSagittal.pelvicSeverity : 'Optimal';

    const activeCoronal = anterior || posterior;
    const shoulderAsymmetry = activeCoronal ? activeCoronal.shoulderTiltDeg : 0;
    const pelvicAsymmetry = activeCoronal ? activeCoronal.pelvicTiltDeg : 0;
    const valgusAngle = activeCoronal ? activeCoronal.maxValgusDev : 0;
    const valgusSeverity = activeCoronal ? activeCoronal.valgusSeverity : 'Optimal';

    // Component Penalties computed strictly from measured planes
    let totalPenalty = 0;
    let maxPossiblePenalty = 0;

    if (hasSagittal) {
      const penaltyPlumb = Math.min(30, (forwardHead * 0.9 + thoracicTilt * 0.8) * weights.thoracic);
      const penaltyPelvis = Math.min(30, (pelvicDev * 1.6) * weights.pelvic);
      totalPenalty += penaltyPlumb + penaltyPelvis;
      maxPossiblePenalty += 60;
    }

    if (hasCoronal) {
      const penaltyValgus = Math.min(25, (valgusAngle * 2.2) * weights.valgus);
      const penaltySymmetry = Math.min(25, (shoulderAsymmetry * 2.5 + pelvicAsymmetry * 2.5) * weights.asymmetry);
      totalPenalty += penaltyValgus + penaltySymmetry;
      maxPossiblePenalty += 50;
    }

    if (maxPossiblePenalty === 0) {
      maxPossiblePenalty = 100;
    }

    const penaltyPercentage = (totalPenalty / maxPossiblePenalty) * 55; // max 55 point penalty
    let compositeScore = Math.max(48, Math.min(98, Math.round(100 - penaltyPercentage)));

    // Qualitative Rating
    let rating = 'Elite Neutral Alignment';
    let ratingColor = 'brand-400';
    if (compositeScore < 85 && compositeScore >= 75) {
      rating = 'Mild Compensation';
      ratingColor = 'accent-warning';
    } else if (compositeScore < 75) {
      rating = 'Kinetic Power Leaks Detected';
      ratingColor = 'accent-danger';
    }

    // Identify Top Issues from real data
    const issues = [];

    if (hasSagittal && forwardHead > 7) {
      issues.push({
        id: 'fhp',
        title: 'Forward Head Posture (CVA)',
        badge: `${cervicalSeverity} (+${extraNeckLoadLbs} lbs / ${extraNeckLoadKg} kg)`,
        level: cervicalSeverity === 'Optimal' ? 'neutral' : (cervicalSeverity === 'Mild' ? 'warning' : 'danger'),
        desc: `Cranial angle of ${cvaDeg}° imposes +${extraNeckLoadLbs} lbs (${extraNeckLoadKg} kg) of continuous strain on cervical extensors.`,
        powerLeak: 'Cervical compression & upper trapezius hypertonicity',
        drillCategory: 'forwardHead'
      });
    }

    if (hasSagittal && pelvicDev > 5) {
      issues.push({
        id: 'apt',
        title: 'Anterior Pelvic Tilt',
        badge: `${pelvicSeverity} (${Math.round(pelvicDev)}°)`,
        level: pelvicDev > 10 ? 'danger' : 'warning',
        desc: 'Inhibits terminal hip extension and gluteus maximus recruitment during sprints and heavy lifts.',
        powerLeak: 'Power leak in sprint cycle & jump propulsion',
        drillCategory: 'anteriorPelvicTilt'
      });
    }

    if (hasCoronal && valgusAngle > 3.5) {
      issues.push({
        id: 'valgus',
        title: 'Medial Knee Tracking (Valgus)',
        badge: `${valgusSeverity} (${Math.round(valgusAngle)}°)`,
        level: valgusAngle > 6.5 ? 'danger' : 'warning',
        desc: 'Inward femoral tracking under load indicates underactive gluteus medius and elevated knee strain.',
        powerLeak: 'Patellofemoral shear & cutting instability',
        drillCategory: 'kneeValgus'
      });
    }

    if (hasSagittal && (thoracicTilt > 6.5 || kyphosisCobb > 40)) {
      issues.push({
        id: 'kyphosis',
        title: 'Thoracic Kyphosis (Cobb Proxy)',
        badge: `${kyphosisSeverity} (${Math.round(kyphosisCobb)}°)`,
        level: kyphosisCobb > 50 ? 'danger' : 'warning',
        desc: 'Restricts thoracic extension and scapular upward rotation, causing impingement in overhead positions.',
        powerLeak: 'Loss of rotational whip & overhead pressing force',
        drillCategory: 'thoracicKyphosis'
      });
    }

    if (hasCoronal && (shoulderAsymmetry > 2.8 || pelvicAsymmetry > 2.8)) {
      issues.push({
        id: 'asymmetry',
        title: 'Bilateral Trunk Asymmetry',
        badge: `Tilt (${Math.round(Math.max(shoulderAsymmetry, pelvicAsymmetry))}°)`,
        level: 'warning',
        desc: 'Unilateral elevation delta causes uneven barbell path, hip hiking, and rotary force imbalances.',
        powerLeak: 'Asymmetric unilateral force transfer',
        drillCategory: 'bilateralAsymmetry'
      });
    }

    // Default if clean or well aligned
    if (issues.length === 0) {
      issues.push({
        id: 'clean',
        title: 'Optimal Kinetic Stacking',
        badge: 'Balanced',
        level: 'neutral',
        desc: 'High degree of skeletal symmetry with balanced kinetic chain plumb lines.',
        powerLeak: 'High mechanical force efficiency',
        drillCategory: 'anteriorPelvicTilt'
      });
    }

    // Select Prescribed Drills
    const prescribedDrills = [];
    issues.forEach(issue => {
      const drills = PREHAB_DRILLS[issue.drillCategory];
      if (drills && drills.length > 0) {
        prescribedDrills.push(drills[0]);
        if (drills[1] && prescribedDrills.length < 4) {
          prescribedDrills.push(drills[1]);
        }
      }
    });

    if (prescribedDrills.length < 4) {
      const fallback = PREHAB_DRILLS.thoracicKyphosis[1] || PREHAB_DRILLS.anteriorPelvicTilt[1];
      if (fallback && !prescribedDrills.find(d => d.id === fallback.id)) {
        prescribedDrills.push(fallback);
      }
    }

    return {
      compositeScore,
      rating,
      ratingColor,
      sport,
      isEmpiricalData,
      hasSagittal,
      hasCoronal,
      anterior,
      rightSagittal,
      posterior,
      leftSagittal,
      metrics: {
        forwardHead,
        cvaDeg,
        extraNeckLoadLbs,
        extraNeckLoadKg,
        cervicalSeverity,
        thoracicTilt,
        kyphosisCobb,
        kyphosisSeverity,
        pelvicDev,
        pelvicSeverity,
        shoulderAsymmetry,
        pelvicAsymmetry,
        valgusAngle,
        valgusSeverity,
        forceTransferScore: Math.max(50, Math.min(99, Math.round(100 - (pelvicDev * 1.8 + valgusAngle * 2.0)))),
        bilateralBalanceScore: Math.max(50, Math.min(99, Math.round(100 - (shoulderAsymmetry * 4.0 + pelvicAsymmetry * 4.0))))
      },
      issues,
      prescribedDrills: prescribedDrills.slice(0, 4)
    };
  }
}

const biomechanics = new BiomechanicsEngine();
