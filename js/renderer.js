/**
 * Minimalist Canvas Skeleton & Biomechanical Overlay Visualizer
 * Inspired by Orbix Studio / Aivo warm-glow minimalist aesthetic.
 */

class SkeletonRenderer {
  constructor() {
    this.CONNECTIONS = [
      // Head
      [7, 8],
      // Upper Torso
      [11, 12],
      [11, 23],
      [12, 24],
      [23, 24],
      // Left Arm
      [11, 13], [13, 15],
      // Right Arm
      [12, 14], [14, 16],
      // Left Leg
      [23, 25], [25, 27], [27, 29], [29, 31],
      // Right Leg
      [24, 26], [26, 28], [28, 30], [30, 32]
    ];
  }

  setupCanvas(canvas, width, height) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return ctx;
  }

  // Real-time camera framing skeleton with high-visibility green & yellow lines
  drawFramingGuide(canvas, landmarks, isFramedProperly, videoElement) {
    if (!canvas) return;

    // Synchronize canvas internal bitmap dimensions to match the live video resolution or client dimensions
    const targetW = (videoElement && videoElement.videoWidth > 0) ? videoElement.videoWidth : (canvas.clientWidth || 640);
    const targetH = (videoElement && videoElement.videoHeight > 0) ? videoElement.videoHeight : (canvas.clientHeight || 480);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarks || landmarks.length < 29) return;

    // High-visibility Green & Yellow line feedback:
    // Green (#22c55e) when full-body alignment is locked
    // Bright Yellow (#fbbf24) when adjusting distance and posture
    const lineColor = isFramedProperly ? 'rgba(34, 197, 94, 0.92)' : 'rgba(251, 191, 36, 0.92)';
    const jointColor = isFramedProperly ? '#22c55e' : '#fbbf24';

    this.drawSkeleton(ctx, landmarks, canvas.width, canvas.height, {
      lineColor,
      jointColor,
      lineWidth: 3.5,
      jointRadius: 5.0,
      glow: true
    });
  }

  // Draw milestone posture view with warm atmospheric aesthetic
  drawMilestoneInspection(canvas, landmarkData, angle) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const ctx = this.setupCanvas(canvas, w, h);

    // Deep obsidian background
    ctx.fillStyle = '#0e0d0c';
    ctx.fillRect(0, 0, w, h);

    // Subtle warm radial ambient glow in center
    const radial = ctx.createRadialGradient(w / 2, h * 0.42, 10, w / 2, h * 0.42, w * 0.55);
    radial.addColorStop(0, 'rgba(234, 88, 12, 0.12)');
    radial.addColorStop(0.6, 'rgba(234, 88, 12, 0.03)');
    radial.addColorStop(1, 'rgba(14, 13, 12, 0)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, w, h);

    if (!landmarkData || !landmarkData.landmarks) {
      ctx.fillStyle = '#78716c';
      ctx.font = '13px "Plus Jakarta Sans"';
      ctx.textAlign = 'center';
      ctx.fillText('Capturing landmark view...', w / 2, h / 2);
      return;
    }

    const lm = landmarkData.landmarks;
    const scaled = this.normalizeLandmarksToCanvas(lm, w, h);

    // Draw ethereal translucent silhouette body backdrop
    this.drawEtherealBodySilhoutte(ctx, scaled, w, h);

    // 1. Reference Vectors & Plumb Lines
    if (angle === 90 || angle === 270) {
      // Sagittal View: Vertical Plumb Line through Ankle
      const isRight = angle === 90;
      const ankle = isRight ? scaled[28] : scaled[27];
      const ear = isRight ? scaled[8] : scaled[7];
      const shoulder = isRight ? scaled[12] : scaled[11];
      const hip = isRight ? scaled[24] : scaled[23];

      if (ankle) {
        // Warm Gravity Plumb Line
        ctx.save();
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.65)';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(ankle.x, 35);
        ctx.lineTo(ankle.x, h - 35);
        ctx.stroke();

        ctx.fillStyle = 'rgba(251, 146, 60, 0.9)';
        ctx.font = '10px "Plus Jakarta Sans"';
        ctx.textAlign = 'left';
        ctx.fillText('VERTICAL GRAVITY AXIS', ankle.x + 8, 48);
        ctx.restore();

        if (ear && shoulder) {
          this.drawDeviationOffset(ctx, shoulder.x, ear.x, ear.y, '#f59e0b', 'Head CVA');
        }
        if (hip && shoulder) {
          this.drawDeviationOffset(ctx, hip.x, shoulder.x, shoulder.y, '#f59e0b', 'Thoracic Stack');
        }
      }
    } else {
      // Coronal Front / Back
      const ls = scaled[11];
      const rs = scaled[12];
      const lh = scaled[23];
      const rh = scaled[24];

      if (ls && rs) {
        ctx.save();
        ctx.strokeStyle = 'rgba(214, 211, 209, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(rs.x - 25, rs.y);
        ctx.lineTo(ls.x + 25, ls.y);
        ctx.stroke();
        ctx.restore();
      }

      if (lh && rh) {
        ctx.save();
        ctx.strokeStyle = 'rgba(214, 211, 209, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(rh.x - 25, rh.y);
        ctx.lineTo(lh.x + 25, lh.y);
        ctx.stroke();
        ctx.restore();
      }

      // Knee tracking indicators
      const lk = scaled[25];
      const rk = scaled[26];
      if (lk && rk) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
        ctx.beginPath();
        ctx.arc(lk.x, lk.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rk.x, rk.y, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Draw Skeleton with warm tones
    this.drawSkeleton(ctx, scaled, w, h, {
      lineColor: 'rgba(255, 237, 213, 0.75)',
      jointColor: '#ea580c',
      lineWidth: 2.5,
      jointRadius: 4.5,
      glow: true
    });

    // 3. Floating Anatomical Callouts (Aivo style)
    this.drawAnatomicalCalloutNodes(ctx, scaled, angle);
  }

  // Draw ethereal human silhouette with soft glow
  drawEtherealBodySilhoutte(ctx, scaled, w, h) {
    if (!scaled || scaled.length < 29) return;
    const nose = scaled[0];
    const ls = scaled[11];
    const rs = scaled[12];
    const lh = scaled[23];
    const rh = scaled[24];
    const la = scaled[27];
    const ra = scaled[28];

    if (!nose || !ls || !rs || !lh || !rh) return;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 247, 237, 0.04)';
    ctx.strokeStyle = 'rgba(255, 247, 237, 0.1)';
    ctx.lineWidth = 1.5;

    // Torso contour
    ctx.beginPath();
    ctx.moveTo(ls.x, ls.y);
    ctx.lineTo(rs.x, rs.y);
    ctx.lineTo(rh.x + 6, rh.y);
    ctx.lineTo(lh.x - 6, lh.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Head glow oval
    ctx.beginPath();
    ctx.ellipse(nose.x, nose.y + 4, 16, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawAnatomicalCalloutNodes(ctx, scaled, angle) {
    const isProfile = angle === 90 || angle === 270;
    const isRight = angle === 90;

    const head = scaled[0];
    const shoulder = isProfile ? (isRight ? scaled[12] : scaled[11]) : scaled[12];
    const hip = isProfile ? (isRight ? scaled[24] : scaled[23]) : scaled[24];
    const knee = isProfile ? (isRight ? scaled[26] : scaled[25]) : scaled[26];

    const nodes = [
      { pt: head, label: 'Cervical' },
      { pt: shoulder, label: 'Thoracic' },
      { pt: hip, label: 'Pelvis' },
      { pt: knee, label: 'Knee' }
    ];

    nodes.forEach(({ pt, label }) => {
      if (!pt) return;
      ctx.save();
      // Glowing dot
      ctx.fillStyle = '#fdba74';
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // Frosted pill label
      const tagX = pt.x + 14;
      const tagY = pt.y - 4;
      ctx.fillStyle = 'rgba(23, 21, 19, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      this.drawRoundedRect(ctx, tagX - 4, tagY - 10, 52, 17, 5);
      ctx.fill();
      ctx.stroke();

      ctx.font = '10px "Plus Jakarta Sans"';
      ctx.fillStyle = '#f5f5f4';
      ctx.textAlign = 'left';
      ctx.fillText(label, tagX + 3, tagY + 2);
      ctx.restore();
    });
  }

  drawDeviationOffset(ctx, targetX, sourceX, y, color, label) {
    if (Math.abs(targetX - sourceX) < 4) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(targetX, y);
    ctx.lineTo(sourceX, y);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(sourceX, y, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '9px "Plus Jakarta Sans"';
    ctx.fillStyle = color;
    ctx.textAlign = sourceX > targetX ? 'left' : 'right';
    const textX = sourceX > targetX ? sourceX + 6 : sourceX - 6;
    ctx.fillText(label, textX, y - 2);
    ctx.restore();
  }

  normalizeLandmarksToCanvas(landmarks, canvasW, canvasH) {
    if (!landmarks || landmarks.length === 0) return [];

    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    landmarks.forEach(pt => {
      if (pt) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }
    });

    const bodyH = maxY - minY;
    const targetH = canvasH * 0.78;
    const scale = bodyH > 0 ? targetH / (bodyH * canvasH) : 1;

    const centerX = (minX + maxX) / 2 * canvasW;
    const centerY = (minY + maxY) / 2 * canvasH;

    const targetCenterX = canvasW / 2;
    const targetCenterY = canvasH / 2;

    return landmarks.map(pt => {
      if (!pt) return null;
      const px = pt.x * canvasW;
      const py = pt.y * canvasH;

      const normX = targetCenterX + (px - centerX) * scale;
      const normY = targetCenterY + (py - centerY) * scale;

      return { x: normX, y: normY, z: pt.z, visibility: pt.visibility };
    });
  }

  drawSkeleton(ctx, landmarks, w, h, style = {}) {
    const lineColor = style.lineColor || 'rgba(251, 191, 36, 0.90)';
    const jointColor = style.jointColor || '#fbbf24';
    const lineWidth = style.lineWidth || 3.5;
    const jointRadius = style.jointRadius || 5.0;

    ctx.save();
    if (style.glow) {
      ctx.shadowColor = jointColor;
      ctx.shadowBlur = 12;
    }
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.CONNECTIONS.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      if (p1 && p2 && (p1.visibility === undefined || p1.visibility > 0.25) && (p2.visibility === undefined || p2.visibility > 0.25)) {
        const x1 = p1.x > 1 ? p1.x : p1.x * w;
        const y1 = p1.y > 1 ? p1.y : p1.y * h;
        const x2 = p2.x > 1 ? p2.x : p2.x * w;
        const y2 = p2.y > 1 ? p2.y : p2.y * h;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    });
    ctx.restore();

    ctx.save();
    if (style.glow) {
      ctx.shadowColor = jointColor;
      ctx.shadowBlur = 10;
    }
    ctx.fillStyle = jointColor;
    landmarks.forEach((p, idx) => {
      if (p && idx >= 7 && (p.visibility === undefined || p.visibility > 0.25)) {
        const x = p.x > 1 ? p.x : p.x * w;
        const y = p.y > 1 ? p.y : p.y * h;
        ctx.beginPath();
        ctx.arc(x, y, jointRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

const skeletonRenderer = new SkeletonRenderer();
