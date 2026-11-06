/**
 * Canvas Skeleton & Biomechanical Overlay Visualizer
 * Renders anatomical landmarks, plumb lines, and kinetic vectors with high precision.
 */

class SkeletonRenderer {
  constructor() {
    this.CONNECTIONS = [
      // Head
      [7, 8], // ears
      // Upper Torso
      [11, 12], // shoulders
      [11, 23], // left shoulder to left hip
      [12, 24], // right shoulder to right hip
      [23, 24], // hips
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

  // Set up crisp canvas rendering with high-DPI support
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

  // Draw real-time framing feedback during active camera feed
  drawFramingGuide(canvas, landmarks, isFramedProperly) {
    const ctx = canvas.getContext('2d');
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    if (!landmarks || landmarks.length < 29) return;

    // Draw subtle translucent skeleton
    this.drawSkeleton(ctx, landmarks, w, h, {
      lineColor: isFramedProperly ? 'rgba(52, 211, 153, 0.65)' : 'rgba(245, 158, 11, 0.5)',
      jointColor: isFramedProperly ? '#10b981' : '#f59e0b',
      lineWidth: 2.5,
      jointRadius: 3.5
    });
  }

  // Draw detailed posture report skeleton with plumb lines and vectors
  drawMilestoneInspection(canvas, landmarkData, angle) {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const ctx = this.setupCanvas(canvas, w, h);

    // Dark athletic background with grid lines
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, w, h);

    // Subtle athletic grid
    ctx.strokeStyle = '#161d2d';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    if (!landmarkData || !landmarkData.landmarks) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px "Plus Jakarta Sans"';
      ctx.textAlign = 'center';
      ctx.fillText('No milestone capture available for this angle', w / 2, h / 2);
      return;
    }

    const lm = landmarkData.landmarks;

    // Scale landmarks to fit canvas bounding area centered
    const scaled = this.normalizeLandmarksToCanvas(lm, w, h);

    // 1. Draw Biomechanical Reference Lines
    if (angle === 90 || angle === 270) {
      // Sagittal View: Vertical Plumb Line through Ankle
      const isRight = angle === 90;
      const ankle = isRight ? scaled[28] : scaled[27];
      const ear = isRight ? scaled[8] : scaled[7];
      const shoulder = isRight ? scaled[12] : scaled[11];
      const hip = isRight ? scaled[24] : scaled[23];

      if (ankle) {
        // True Plumb Line (Cyan dashed)
        ctx.save();
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(ankle.x, 30);
        ctx.lineTo(ankle.x, h - 30);
        ctx.stroke();

        // Plumb line label
        ctx.fillStyle = '#06b6d4';
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText('GRAVITY PLUMB LINE', ankle.x + 8, 45);
        ctx.restore();

        // Kinetic Chain Deviations
        if (ear && shoulder) {
          this.drawDeviationOffset(ctx, shoulder.x, ear.x, ear.y, '#f59e0b', 'Head Protraction');
        }
        if (hip && shoulder) {
          this.drawDeviationOffset(ctx, hip.x, shoulder.x, shoulder.y, '#f59e0b', 'Thoracic Kyphosis');
        }
      }
    } else {
      // Coronal View (0° or 180°): Horizontal Shoulder & Hip Lines
      const ls = scaled[11];
      const rs = scaled[12];
      const lh = scaled[23];
      const rh = scaled[24];

      if (ls && rs) {
        // Shoulder line
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(rs.x - 20, rs.y);
        ctx.lineTo(ls.x + 20, ls.y);
        ctx.stroke();
        ctx.restore();
      }

      if (lh && rh) {
        // Hip line
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(rh.x - 20, rh.y);
        ctx.lineTo(lh.x + 20, lh.y);
        ctx.stroke();
        ctx.restore();
      }

      // Knee Valgus Inward Vector Guide
      const lk = scaled[25];
      const rk = scaled[26];
      if (lk && rk) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        // Marker circles at knees
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.beginPath();
        ctx.arc(lk.x, lk.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(rk.x, rk.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 2. Draw Anatomical Skeleton
    this.drawSkeleton(ctx, scaled, w, h, {
      lineColor: '#10b981',
      jointColor: '#34d399',
      lineWidth: 3,
      jointRadius: 4.5
    });

    // 3. Draw Watermark Badge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = '11px "Outfit"';
    ctx.textAlign = 'right';
    ctx.fillText(`KINETICSCAN 360 • ${angle}° INSPECTION`, w - 16, 24);
  }

  // Draw horizontal deviation arrow
  drawDeviationOffset(ctx, targetX, sourceX, y, color, label) {
    if (Math.abs(targetX - sourceX) < 4) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(targetX, y);
    ctx.lineTo(sourceX, y);
    ctx.stroke();

    // Small arrow tick
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

  // Normalize landmarks to fit canvas bounds nicely
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
    const bodyW = maxX - minX;

    // Target height ~80% of canvas height
    const targetH = canvasH * 0.82;
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
    const lineColor = style.lineColor || '#10b981';
    const jointColor = style.jointColor || '#34d399';
    const lineWidth = style.lineWidth || 2;
    const jointRadius = style.jointRadius || 3;

    // Draw bones
    ctx.save();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.CONNECTIONS.forEach(([i, j]) => {
      const p1 = landmarks[i];
      const p2 = landmarks[j];
      if (p1 && p2 && (p1.visibility === undefined || p1.visibility > 0.35) && (p2.visibility === undefined || p2.visibility > 0.35)) {
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

    // Draw joints
    ctx.save();
    ctx.fillStyle = jointColor;
    landmarks.forEach((p, idx) => {
      if (p && idx >= 7 && (p.visibility === undefined || p.visibility > 0.35)) {
        const x = p.x > 1 ? p.x : p.x * w;
        const y = p.y > 1 ? p.y : p.y * h;
        ctx.beginPath();
        ctx.arc(x, y, jointRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }
}

const skeletonRenderer = new SkeletonRenderer();
