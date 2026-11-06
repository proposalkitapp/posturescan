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
      lateralShiftPct: Math.round(lateralShift * 10) / 10,
      hasKneeValgus: maxValgusDev > 6.0,
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

    // 1. Forward Head Tilt (Craniovertebral Plumb Vector)
    // Line from Shoulder to Ear vs vertical plumb line
    const forwardHeadTilt = Math.abs(this.calculateVerticalTilt(shoulder, ear));

    // 2. Thoracic Kyphosis & Forward Shoulder Displacement
    // Line from Hip to Shoulder vs vertical
    const thoracicTilt = Math.abs(this.calculateVerticalTilt(hip, shoulder));

    // 3. Pelvic Tilt (Relative angle between Torso and Thigh)
    // Hip angle at vertex: Shoulder -> Hip -> Knee
    const hipAngle = this.calculateAngle2D(shoulder, hip, knee);
    // Neutral standing is ~175°-180°. Under 170° indicates anterior hip flexion tilt
    const pelvicTiltDev = Math.abs(180 - hipAngle);

    // 4. Kinetic Chain Plumb Line Horizontal Deviation
    // Deviation of Ear, Shoulder, and Hip relative to Ankle X-coordinate
    const earOffset = Math.abs(ear.x - ankle.x) * 100;
    const shoulderOffset = Math.abs(shoulder.x - ankle.x) * 100;
    const hipOffset = Math.abs(hip.x - ankle.x) * 100;

    return {
      side: isRightSide ? 'Right' : 'Left',
      forwardHeadDeg: Math.round(forwardHeadTilt * 10) / 10,
      thoracicTiltDeg: Math.round(thoracicTilt * 10) / 10,
      hipAngleDeg: Math.round(hipAngle * 10) / 10,
      pelvicTiltDevDeg: Math.round(pelvicTiltDev * 10) / 10,
      earOffsetPct: Math.round(earOffset * 10) / 10,
      shoulderOffsetPct: Math.round(shoulderOffset * 10) / 10,
      hipOffsetPct: Math.round(hipOffset * 10) / 10,
      isAnteriorPelvicTilt: hipAngle < 172,
      isForwardHead: forwardHeadTilt > 12.0,
      isThoracicKyphosis: thoracicTilt > 8.0
    };
  }

  // Comprehensive Evaluation across all 4 Milestone Views
  evaluateFullScan(milestones, sportId = 'general') {
    const sport = SPORT_PROFILES.find(s => s.id === sportId) || SPORT_PROFILES[0];
    const weights = sport.priorityWeights;

    const anterior = milestones[0] ? this.analyzeCoronalPlane(milestones[0].landmarks, false) : null;
    const rightSagittal = milestones[90] ? this.analyzeSagittalPlane(milestones[90].landmarks, true) : null;
    const posterior = milestones[180] ? this.analyzeCoronalPlane(milestones[180].landmarks, true) : null;
    const leftSagittal = milestones[270] ? this.analyzeSagittalPlane(milestones[270].landmarks, false) : null;

    // Sagittal consensus values
    const forwardHead = rightSagittal ? rightSagittal.forwardHeadDeg : (leftSagittal ? leftSagittal.forwardHeadDeg : 8);
    const thoracicTilt = rightSagittal ? rightSagittal.thoracicTiltDeg : (leftSagittal ? leftSagittal.thoracicTiltDeg : 6);
    const pelvicDev = rightSagittal ? rightSagittal.pelvicTiltDevDeg : (leftSagittal ? leftSagittal.pelvicTiltDevDeg : 8);

    // Coronal consensus values
    const shoulderAsymmetry = anterior ? anterior.shoulderTiltDeg : 1.5;
    const pelvicAsymmetry = anterior ? anterior.pelvicTiltDeg : 1.5;
    const valgusAngle = anterior ? anterior.maxValgusDev : 4.0;

    // Component Penalties
    let penaltyPlumb = Math.min(25, (forwardHead * 0.9 + thoracicTilt * 0.8) * weights.thoracic);
    let penaltyPelvis = Math.min(25, (pelvicDev * 1.5) * weights.pelvic);
    let penaltyValgus = Math.min(25, (valgusAngle * 2.2) * weights.valgus);
    let penaltySymmetry = Math.min(25, (shoulderAsymmetry * 2.5 + pelvicAsymmetry * 2.5) * weights.asymmetry);

    let rawScore = 100 - (penaltyPlumb + penaltyPelvis + penaltyValgus + penaltySymmetry);
    let compositeScore = Math.max(45, Math.min(98, Math.round(rawScore)));

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

    // Identify Top 3 Issues
    const issues = [];
    if (pelvicDev > 8) {
      issues.push({
        id: 'apt',
        title: 'Anterior Pelvic Tilt',
        badge: `APT (${Math.round(pelvicDev)}°)`,
        level: pelvicDev > 12 ? 'danger' : 'warning',
        desc: 'Inhibits terminal hip extension and gluteus maximus recruitment during sprints and heavy lifts.',
        powerLeak: 'Power leak in sprint cycle & jump propulsion',
        drillCategory: 'anteriorPelvicTilt'
      });
    }

    if (valgusAngle > 5.5) {
      issues.push({
        id: 'valgus',
        title: 'Medial Knee Collapse (Valgus)',
        badge: `Valgus (${Math.round(valgusAngle)}°)`,
        level: valgusAngle > 8 ? 'danger' : 'warning',
        desc: 'Inward femoral tracking under load indicates underactive gluteus medius and elevated non-contact ACL strain.',
        powerLeak: 'ACL and patellar tendon vulnerability on cutting',
        drillCategory: 'kneeValgus'
      });
    }

    if (thoracicTilt > 7.5 || forwardHead > 11) {
      issues.push({
        id: 'kyphosis',
        title: 'Thoracic Kyphosis & Head Protraction',
        badge: `Kyphotic (${Math.round(thoracicTilt)}°)`,
        level: thoracicTilt > 12 ? 'danger' : 'warning',
        desc: 'Restricts thoracic extension and scapular upward rotation, causing impingement in overhead positions.',
        powerLeak: 'Loss of rotational whip & overhead pressing force',
        drillCategory: 'thoracicKyphosis'
      });
    }

    if (shoulderAsymmetry > 2.8 || pelvicAsymmetry > 2.8) {
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

    // Default if clean
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

    // Ensure at least 4 drills
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
      anterior,
      rightSagittal,
      posterior,
      leftSagittal,
      metrics: {
        forwardHead,
        thoracicTilt,
        pelvicDev,
        shoulderAsymmetry,
        pelvicAsymmetry,
        valgusAngle,
        forceTransferScore: Math.round(100 - (pelvicDev * 1.8 + valgusAngle * 2.0)),
        bilateralBalanceScore: Math.round(100 - (shoulderAsymmetry * 4.0 + pelvicAsymmetry * 4.0))
      },
      issues,
      prescribedDrills: prescribedDrills.slice(0, 4)
    };
  }
}

const biomechanics = new BiomechanicsEngine();
