# KineticScan 360 — Clinical & Athletic Posture Screening Web App

KineticScan 360 is a zero-install, on-device web application engineered for clinical posture screening and athletic movement assessment. It features a modern, editorial luxury interface inspired by Lawtrades, hands-free **automated 360° rotation capture** with directional voice coaching, and peer-reviewed biomechanical analysis including **Dr. Kenneth Hansraj's cervical spine load model** in dual units (`+lbs` and `kg`).

---

## ⚡ Quick Start

Runs entirely on modern web standards with client-side WebAssembly computer vision:

1. Double-click `start.bat` or run:
   ```powershell
   .\start-server.ps1
   ```
2. Your browser will open to:
   ```
   http://localhost:8080
   ```
3. Alternatively, deploy to any static host (Vercel, GitHub Pages, Netlify, Cloudflare Pages).

---

## 🎨 Editorial Landing Page Design (Lawtrades Aesthetic)

- **Canvas & Tone:** Warm luxury cream (`#faf8f5`) with an ambient radial mint aura glow (`rgba(167, 243, 208, 0.45)`).
- **Hero Display:** Bold display typography (*"Clinical posture screening, on demand."* with deep teal `#0d9488` highlights), solid black pill CTA (*"Start Free Scan"*), and white bordered secondary pill (*"Upload a Photo"*).
- **Overlapping Portrait Collage:** Real Unsplash stock photography of real people in solid 2px dark charcoal borders (`border-2 border-stone-900 rounded-3xl`) with curved organic dashed SVG connector lines and floating chips (Dr. Justin Higgs, Karen Frame, and Hansraj Spine Strain `-24 lbs / 11 kg Relieved`) protruding past photo frames.
- **Interactive Focus Area Carousel:** 4-tab clinical focus switcher (`Cervical Spine & CVA`, `Thoracic Kyphosis`, `Lumbopelvic APT`, `Knee Tracking Valgus`) with circular arrow carousel controls (`← 1/4 →`) and soft pastel badges.
- **The 4 Clinical Checkpoints Grid:** Dedicated light-mode showcase cards detailing exact mathematical formulas, normal ranges, and clinical interventions.
- **Zero AI Imagery:** 100% genuine Unsplash portrait photography and clean Lucide SVG icons.

---

## 🔬 Peer-Reviewed Clinical Biomechanics

| Clinical Checkpoint | Metric Formula | Benchmark | Clinical & Athletic Impact |
| :--- | :--- | :--- | :--- |
| **Craniovertebral Angle (CVA)** | $90^\circ - \operatorname{atan2}(|\Delta y|,\, |\Delta x|)$ | $\ge 50^\circ$ (Optimal) | Measures forward head posture. Translates head tilt into extra cervical disc compressive load via Dr. Kenneth Hansraj's model in **dual units** (e.g. `+24 lbs / 11 kg`). |
| **Thoracic Kyphosis (Cobb Proxy)** | $180^\circ - \angle(\text{Tragus}, \text{C7}, \text{Acromion})$ | $28^\circ \text{–} 40^\circ$ (Optimal) | Identifies "desk hunch", scapular protraction, and ribcage restriction limiting overhead arm elevation and breathing capacity. |
| **Lumbopelvic Rhythm & Pelvic Tilt** | $|\operatorname{atan2}(\Delta x,\, \Delta y)|$ (Hip-to-Knee) | $\le 5^\circ$ (Neutral) | Evaluates Anterior Pelvic Tilt (APT) caused by shortened psoas and hip flexors that inhibit glute lockout and induce lumbar shear. |
| **Dynamic Knee Tracking (Valgus Q-Angle)** | $|180^\circ - \angle(\text{Hip}, \text{Knee}, \text{Ankle})|$ | $< 3.5^\circ$ (Safe) | Frontal plane knee tracking relative to the second toe axis. Flags medial collapse (knock-knees) that drastically increases non-contact ACL strain. |

---

## 🔄 Automated 360° Camera & Upload Flow

1. **Adaptive Full-Body Framing Detection:**
   - Multi-point anatomical confidence check for Head, Torso, and Legs with natural stance tolerance (`y: 0.88 - 1.05`).
   - Visual HUD guide box transitions from yellow adjustment mode to locked **Green** with live body-part checklist badges (`Head [✓]`, `Torso [✓]`, `Legs [✓]`).
   - Manual override button available for rapid testing.
2. **3-2-1 Audio-Visual Countdown:**
   - On-screen visual countdown numbers with synchronized harmonic audio synthesize chimes (Web Audio API) giving you 3 seconds to balance.
3. **Continuous 360° Rotation Coaching:**
   - Real-time yaw tracking via 3D shoulder/hip vectors:
     $$\theta = \operatorname{atan2}(z_{\text{left}} - z_{\text{right}},\, x_{\text{left}} - x_{\text{right}})$$
   - Directional banner and voice coaching announce turn commands at 90° intervals (*"Slowly turn to your right now →"*) and capture milestone plane buffers (`0° Front`, `90° Profile`, `180° Back`, `270° Profile`).
4. **Instant Photo/Video Upload Support:**
   - Upload any full-body photo or video file to trigger instant on-device MediaPipe landmark extraction and generate a complete clinical report.

---

## 🛠️ Project Structure

```
posture-scan-web/
├── index.html            # Lawtrades-inspired editorial layout & clinical scan stage
├── css/
│   └── app.css           # Warm cream palette, mint aura, lawtrades cards, print CSS
├── js/
│   ├── app.js            # State management, focus carousel, navigation, and upload handling
│   ├── biomechanics.js   # CVA, Hansraj dual-unit load formulas, Cobb proxy, APT & Q-angle
│   ├── camera.js         # Adaptive framing detection, sliding confidence window, 3-2-1 countdown
│   ├── poseEngine.js     # MediaPipe Pose wrapper, 33 3D landmarks, 360° yaw estimation
│   ├── audioGuide.js     # Web Audio API harmonic countdown chimes & speech synthesis coaching
│   ├── exercises.js      # Evidence-based corrective pre-hab routines by kinetic segment
│   ├── renderer.js       # High-DPI Canvas skeleton overlay and plumb lines
│   ├── privacyManager.js # Zero-cookie local preference storage & compliance modals
│   └── policyContent.js  # Privacy, Terms of Service, and Biometric Storage policies
├── start-server.ps1      # Zero-dependency Windows .NET HttpListener local web server
├── start.bat             # 1-click Windows starter
└── README.md             # Complete project and architecture documentation
```

---

## 🔒 100% On-Device Privacy Guarantee

KineticScan 360 processes all camera feeds and uploaded photos strictly in browser memory using **client-side WebAssembly**. No images, video frames, or biometric coordinates are ever saved, stored on external servers, or transmitted across the internet.
