/**
 * Pose Detection & 360 Spin Processing Engine
 * Wraps MediaPipe Pose and provides milestone sector aggregation.
 */

class PoseEngine {
  constructor() {
    this.pose = null;
    this.isReady = false;
    this.isProcessing = false;
    this.milestones = {
      0: null,   // Anterior (Front)
      90: null,  // Right Sagittal
      180: null, // Posterior (Back)
      270: null  // Left Sagittal
    };
    this.spinProgress = 0; // 0 to 100%
    this.currentYaw = 0;
    this.currentSector = 'front';
  }

  async init() {
    if (this.isReady && this.pose) return true;

    // Retry loop to allow external CDN script to be parsed if loading
    for (let attempt = 0; attempt < 25; attempt++) {
      if (typeof window.Pose !== 'undefined') {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 80));
    }

    try {
      if (typeof window.Pose !== 'undefined') {
        this.pose = new window.Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });

        this.pose.setOptions({
          modelComplexity: 0, // Lite model: ultra fast initialization & smooth 60fps
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.45,
          minTrackingConfidence: 0.45
        });

        await this.pose.initialize();
        this.isReady = true;
        console.log('MediaPipe Pose initialized successfully');
        return true;
      }
    } catch (err) {
      console.warn('Could not initialize MediaPipe Pose, fallback active', err);
    }

    this.isReady = true;
    return false;
  }

  // Evaluate if athlete is well-positioned in frame with adaptive human tolerances
  checkAthleteFraming(landmarks) {
    if (!landmarks || landmarks.length < 25) {
      return {
        isFramed: false,
        distanceFeedback: 'SEARCHING FOR ATHLETE',
        confidenceBadge: 'SEARCHING',
        confidenceScore: 0,
        checklist: { head: false, torso: false, legs: false, centered: false }
      };
    }

    const nose = landmarks[0];
    const leftEye = landmarks[2];
    const rightEye = landmarks[5];
    const leftEar = landmarks[7];
    const rightEar = landmarks[8];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    const leftFoot = landmarks[31];
    const rightFoot = landmarks[32];

    const hasVis = (lm, minVis = 0.25) => lm && (lm.visibility === undefined || lm.visibility >= minVis);

    // 1. Head & Cranial Check
    const hasHead = hasVis(nose, 0.25) || hasVis(leftEye, 0.25) || hasVis(rightEye, 0.25) || hasVis(leftEar, 0.25) || hasVis(rightEar, 0.25);
    const headY = hasVis(nose, 0.2) ? nose.y : (hasVis(leftShoulder, 0.2) ? leftShoulder.y - 0.12 : 0.15);

    // 2. Torso & Core Check
    const hasShoulders = hasVis(leftShoulder, 0.25) || hasVis(rightShoulder, 0.25);
    const hasHips = hasVis(leftHip, 0.25) || hasVis(rightHip, 0.25);
    const hasTorso = hasShoulders && hasHips;

    // 3. Lower Body Check (Knees and/or Ankles)
    const hasKnees = hasVis(leftKnee, 0.20) || hasVis(rightKnee, 0.20);
    const hasAnkles = hasVis(leftAnkle, 0.20) || hasVis(rightAnkle, 0.20) || hasVis(leftFoot, 0.20) || hasVis(rightFoot, 0.20);
    const hasLegs = hasKnees || hasAnkles;

    // 4. Horizontal Centering
    const torsoX = (hasVis(leftShoulder) && hasVis(rightShoulder))
      ? (leftShoulder.x + rightShoulder.x) / 2
      : (hasVis(leftHip) && hasVis(rightHip) ? (leftHip.x + rightHip.x) / 2 : (nose ? nose.x : 0.5));
    const isCentered = torsoX >= 0.15 && torsoX <= 0.85;

    // Checklist object for UI badges
    const checklist = {
      head: Boolean(hasHead),
      torso: Boolean(hasTorso),
      legs: Boolean(hasLegs),
      centered: Boolean(isCentered)
    };

    // Calculate confidence score (0 to 100%)
    let score = 0;
    if (hasHead) score += 25;
    if (hasShoulders) score += 25;
    if (hasHips) score += 20;
    if (hasLegs) score += 20;
    if (isCentered) score += 10;

    // Calculate vertical span
    let bottomY = 0.85;
    if (hasVis(leftFoot, 0.2) || hasVis(rightFoot, 0.2)) {
      const ly = hasVis(leftFoot, 0.2) ? leftFoot.y : 0;
      const ry = hasVis(rightFoot, 0.2) ? rightFoot.y : 0;
      bottomY = Math.max(ly, ry);
    } else if (hasVis(leftAnkle, 0.2) || hasVis(rightAnkle, 0.2)) {
      const ly = hasVis(leftAnkle, 0.2) ? leftAnkle.y : 0;
      const ry = hasVis(rightAnkle, 0.2) ? rightAnkle.y : 0;
      bottomY = Math.max(ly, ry) + 0.04;
    } else if (hasKnees) {
      const lk = hasVis(leftKnee, 0.2) ? leftKnee.y : 0;
      const rk = hasVis(rightKnee, 0.2) ? rightKnee.y : 0;
      bottomY = Math.max(lk, rk) + 0.20; // Extrapolate lower leg
    }

    const bodyHeight = bottomY - headY;

    // Diagnostic guidance
    if (!hasHead || headY < 0.01) {
      return {
        isFramed: false,
        distanceFeedback: 'HEAD TOO HIGH (TILT CAMERA UP OR STEP BACK)',
        confidenceBadge: 'HEAD CUT OFF',
        confidenceScore: score,
        checklist
      };
    }

    if (!hasLegs) {
      return {
        isFramed: false,
        distanceFeedback: 'STEP BACK (SHOW KNEES & LEGS)',
        confidenceBadge: 'LEGS NEEDED',
        confidenceScore: score,
        checklist
      };
    }

    if (!isCentered) {
      return {
        isFramed: false,
        distanceFeedback: torsoX < 0.15 ? 'STEP TO YOUR RIGHT →' : '← STEP TO YOUR LEFT',
        confidenceBadge: 'OFF CENTER',
        confidenceScore: score,
        checklist
      };
    }

    if (bodyHeight < 0.28) {
      return {
        isFramed: false,
        distanceFeedback: 'TOO FAR (STEP A LITTLE CLOSER)',
        confidenceBadge: 'TOO FAR',
        confidenceScore: score,
        checklist
      };
    }

    if (bodyHeight > 0.98 && headY < 0.04) {
      return {
        isFramed: false,
        distanceFeedback: 'TOO CLOSE (STEP BACK 1 STEP)',
        confidenceBadge: 'TOO CLOSE',
        confidenceScore: score,
        checklist
      };
    }

    // Athlete satisfies full body criteria!
    return {
      isFramed: true,
      distanceFeedback: 'LOCKED & READY',
      confidenceBadge: 'LOCKED',
      confidenceScore: 100,
      checklist: { head: true, torso: true, legs: true, centered: true }
    };
  }

  // Record a frame during active 360 spin
  processSpinFrame(landmarks, rawVideoFrame) {
    if (!landmarks) return null;

    const yaw = biomechanics.estimateBodyYaw(landmarks);
    this.currentYaw = yaw;

    const sector = biomechanics.getSectorForYaw(yaw);
    this.currentSector = sector.id;

    // Target milestone angle (0, 90, 180, 270)
    const targetAngle = sector.angle;

    // Check if this frame is closer to the milestone target than previous
    const currentAngleDiff = Math.abs((yaw - targetAngle + 180) % 360 - 180);

    const existing = this.milestones[targetAngle];
    let shouldStore = false;

    if (!existing) {
      shouldStore = true;
    } else {
      const existingDiff = Math.abs((existing.yaw - targetAngle + 180) % 360 - 180);
      if (currentAngleDiff < existingDiff) {
        shouldStore = true;
      }
    }

    if (shouldStore) {
      this.milestones[targetAngle] = {
        landmarks: JSON.parse(JSON.stringify(landmarks)),
        yaw: yaw,
        sector: sector.name,
        timestamp: Date.now()
      };
      audioGuide.playMilestoneSector();
    }

    // Count captured milestones
    const capturedCount = Object.values(this.milestones).filter(Boolean).length;
    this.spinProgress = Math.round((capturedCount / 4) * 100);

    return {
      yaw,
      sector: sector.name,
      targetAngle,
      capturedCount,
      progress: this.spinProgress
    };
  }

  resetMilestones() {
    this.milestones = {
      0: null,
      90: null,
      180: null,
      270: null
    };
    this.spinProgress = 0;
  }

  // Generate realistic synthetic athletic posture landmarks for instant demo mode
  generateSyntheticAthlete(sportType = 'runner') {
    // Standard anatomical skeleton base
    // Scaled coordinates 0..1
    const basePose = (angle) => {
      const isProfile = angle === 90 || angle === 270;
      const isBack = angle === 180;
      const isRight = angle === 90;

      // Imbalance variations based on sport
      const aptShift = sportType === 'runner' ? 0.035 : 0.02; // Anterior pelvic tilt
      const valgusShift = sportType === 'runner' || sportType === 'court' ? 0.025 : 0.01;
      const kyphosisShift = sportType === 'lifter' || sportType === 'throwing' ? 0.035 : 0.02;

      const landmarks = [];
      for (let i = 0; i < 33; i++) landmarks.push({ x: 0.5, y: 0.5, z: 0, visibility: 0.95 });

      if (isProfile) {
        // Sagittal Profile
        const sign = isRight ? 1 : -1;
        // Plumb line reference X is ~0.50
        const ankleX = 0.50;
        const kneeX = 0.50 + 0.01 * sign;
        const hipX = 0.50 + aptShift * sign; // APT: pelvis pushed forward relative to thoracic
        const shoulderX = 0.50 - kyphosisShift * sign; // Kyphosis: shoulders rounded forward
        const earX = 0.50 + 0.04 * sign; // Forward head protraction

        landmarks[0] = { x: earX + 0.02 * sign, y: 0.16, z: 0 }; // nose
        landmarks[7] = { x: earX - 0.01, y: 0.17, z: 0 }; // left ear
        landmarks[8] = { x: earX + 0.01, y: 0.17, z: 0 }; // right ear
        landmarks[11] = { x: shoulderX - 0.01, y: 0.28, z: 0 }; // left shoulder
        landmarks[12] = { x: shoulderX + 0.01, y: 0.28, z: 0 }; // right shoulder
        landmarks[13] = { x: shoulderX, y: 0.40, z: 0 };
        landmarks[14] = { x: shoulderX, y: 0.40, z: 0 };
        landmarks[15] = { x: shoulderX, y: 0.52, z: 0 };
        landmarks[16] = { x: shoulderX, y: 0.52, z: 0 };
        landmarks[23] = { x: hipX - 0.01, y: 0.52, z: 0 };
        landmarks[24] = { x: hipX + 0.01, y: 0.52, z: 0 };
        landmarks[25] = { x: kneeX - 0.01, y: 0.68, z: 0 };
        landmarks[26] = { x: kneeX + 0.01, y: 0.68, z: 0 };
        landmarks[27] = { x: ankleX - 0.01, y: 0.85, z: 0 };
        landmarks[28] = { x: ankleX + 0.01, y: 0.85, z: 0 };
        landmarks[29] = { x: ankleX - 0.02, y: 0.87, z: 0 };
        landmarks[30] = { x: ankleX - 0.02, y: 0.87, z: 0 };
        landmarks[31] = { x: ankleX + 0.04 * sign, y: 0.88, z: 0 };
        landmarks[32] = { x: ankleX + 0.04 * sign, y: 0.88, z: 0 };
      } else {
        // Coronal (Front or Back)
        const leftSign = isBack ? 1 : -1;
        const shoulderTilt = 0.012; // Right shoulder slightly lower
        const pelvicTilt = 0.008;

        landmarks[0] = { x: 0.50, y: 0.16, z: isBack ? 0.08 : -0.08 }; // nose
        landmarks[7] = { x: 0.46, y: 0.17, z: 0 }; // left ear
        landmarks[8] = { x: 0.54, y: 0.17, z: 0 }; // right ear
        landmarks[11] = { x: 0.42, y: 0.28 - shoulderTilt, z: 0 }; // left shoulder
        landmarks[12] = { x: 0.58, y: 0.28 + shoulderTilt, z: 0 }; // right shoulder
        landmarks[13] = { x: 0.39, y: 0.40, z: 0 };
        landmarks[14] = { x: 0.61, y: 0.40, z: 0 };
        landmarks[15] = { x: 0.38, y: 0.52, z: 0 };
        landmarks[16] = { x: 0.62, y: 0.52, z: 0 };
        landmarks[23] = { x: 0.45, y: 0.52 - pelvicTilt, z: 0 }; // left hip
        landmarks[24] = { x: 0.55, y: 0.52 + pelvicTilt, z: 0 }; // right hip
        // Knees with valgus inward collapse
        landmarks[25] = { x: 0.45 + valgusShift, y: 0.68, z: 0 }; // left knee caves right
        landmarks[26] = { x: 0.55 - valgusShift, y: 0.68, z: 0 }; // right knee caves left
        landmarks[27] = { x: 0.44, y: 0.85, z: 0 }; // left ankle
        landmarks[28] = { x: 0.56, y: 0.85, z: 0 }; // right ankle
        landmarks[29] = { x: 0.43, y: 0.87, z: 0 };
        landmarks[30] = { x: 0.57, y: 0.87, z: 0 };
        landmarks[31] = { x: 0.42, y: 0.88, z: 0 };
        landmarks[32] = { x: 0.58, y: 0.88, z: 0 };
      }

      return landmarks;
    };

    return {
      0: { landmarks: basePose(0), yaw: 0, sector: 'Anterior (Front)' },
      90: { landmarks: basePose(90), yaw: 90, sector: 'Right Sagittal (90°)' },
      180: { landmarks: basePose(180), yaw: 180, sector: 'Posterior (Back)' },
      270: { landmarks: basePose(270), yaw: 270, sector: 'Left Sagittal (270°)' }
    };
  }
}

const poseEngine = new PoseEngine();
