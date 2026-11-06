# KineticScan 360 — Athletic Posture & Biomechanics Scanner

KineticScan 360 is a zero-install, client-side web application designed for athletes, coaches, and trainers. It guides the user through a hands-free **10-second 360° spin video scan** using their mobile or desktop camera, detects 3D anatomical landmarks on-device with MediaPipe Pose, calculates key athletic biomechanical deviations (sagittal plumb lines, anterior pelvic tilt, medial knee valgus, and bilateral asymmetries), and generates a personalized **athletic pre-hab & corrective drill routine**.

---

## ⚡ Quick Start

Since this app runs pure modern ES modules with client-side computer vision:

1. Double-click `start.bat` or run:
   ```powershell
   .\start-server.ps1
   ```
2. Your browser will open to:
   ```
   http://localhost:8080
   ```
3. Alternatively, host with any static web server (Vercel, GitHub Pages, Netlify, or Nginx).

---

## 🔬 How the 360° Spin Video Scanner Works

1. **Athlete Framing Check:**
   - Real-time computer vision monitors head-to-ankle vertical framing.
   - The HUD guide box turns **Green** when you are at the optimal distance (7–8 feet) with full body visibility.

2. **Hands-Free Countdown:**
   - Visual 3-second countdown and synchronized audio synth beeps notify you when to begin.

3. **10-Second Continuous Rotation:**
   - The app monitors body rotation using 3D shoulder and hip coordinates:
     $$\theta = \operatorname{atan2}(z_{\text{left}} - z_{\text{right}},\, x_{\text{left}} - x_{\text{right}})$$
   - A radial HUD dial tracks your 360° rotation in real time while voice cues coach your pace.
   - Automatically buffers and isolates the best frame for each canonical plane:
     - **0° (Anterior / Front View)**
     - **90° (Right Sagittal Profile)**
     - **180° (Posterior / Back View)**
     - **270° (Left Sagittal Profile)**

4. **Instant Demo Mode:**
   - If testing without a live camera, click **"Load Sample Athlete Scan"** to immediately explore the biomechanical reporting engine, skeleton canvas visualizer, and drill prescriptions.

---

## 🏃 Evaluated Biomechanical Metrics

| Metric | Measured Angle / Vector | Athletic Consequence |
| :--- | :--- | :--- |
| **Anterior Pelvic Tilt (APT)** | ASIS-PSIS pelvic girdle deviation from horizontal | Glute max inhibition; lost sprint extension; lumbar shear under load. |
| **Knee Valgus (Q-Angle)** | Femur-tibia inward angle at vertex knee | Primary non-contact ACL strain mechanism during cutting & jump landing. |
| **Thoracic Kyphosis & Forward Head** | Tragus-to-C7 Craniovertebral Angle & thoracic spine curvature | Overhead shoulder impingement; loss of rotational throwing velocity. |
| **Bilateral Shoulder & Hip Asymmetry** | Delta between left and right clavicles and iliac crests | Unilateral kinetic chain leaks; asymmetric barbell path. |

---

## 🛠️ Project Structure

```
posture-scan-web/
├── index.html            # Main athletic HUD interface & layout
├── css/
│   └── app.css           # Custom radar glows, framing animations, print styles
├── js/
│   ├── app.js            # Master state manager & UI flow controller
│   ├── camera.js         # WebRTC stream, framing feedback & frame loop
│   ├── audioGuide.js     # Web Audio API beeps & SpeechSynthesis coaching
│   ├── poseEngine.js     # MediaPipe Pose wrapper & 360 yaw tracking
│   ├── biomechanics.js   # Angle calculations, plumb lines, & scoring
│   ├── exercises.js      # Sports pre-hab drills & discipline profiles
│   └── renderer.js       # High-DPI Canvas skeleton visualizer
├── start-server.ps1      # Native .NET HttpListener local server
├── start.bat             # 1-click Windows starter
└── README.md             # Documentation
```

---

## 🔒 Privacy & Performance
- **100% Client-Side:** Video streams are analyzed frame-by-frame in browser memory via WebAssembly/WebGL. No video data or frames are ever uploaded or transmitted to any remote server.
