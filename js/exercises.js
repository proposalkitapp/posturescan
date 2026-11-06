/**
 * Athletic Pre-Hab & Corrective Drills Database
 * Mapped directly to kinetic chain power leaks and postural compensations.
 */

const PREHAB_DRILLS = {
  // 1. Anterior Pelvic Tilt & Hip Flexor Overactivity
  anteriorPelvicTilt: [
    {
      id: 'half-kneeling-hip-flexor',
      name: 'Half-Kneeling Psoas Active Stretch',
      category: 'Mobility & Lengthening',
      target: 'Psoas, Rectus Femoris',
      frequency: '2 sets × 45s per side',
      icon: 'zap',
      impact: 'Restores neutral hip extension for explosive sprint drive & glute max recruitment.',
      instructions: [
        'Kneel on one knee with a 90° angle at both knees.',
        'Squeeze the trailing glute and tuck your pelvis underneath (posterior tilt).',
        'Shift forward slightly while keeping the spine tall. Do NOT arch lower back.'
      ]
    },
    {
      id: 'banded-glute-bridge',
      name: 'Banded Glute Bridges with Pause',
      category: 'Activation & Motor Control',
      target: 'Gluteus Maximus, Hamstrings',
      frequency: '3 sets × 12 reps (3s hold at top)',
      icon: 'activity',
      impact: 'Reprograms glute firing sequence during hip extension without lumbar hyperextension.',
      instructions: [
        'Place a mini-band right above your knees, lying on your back.',
        'Drive through your heels, pushing knees outward against the band.',
        'Lock out at top by squeezing glutes, keeping ribs pinned down.'
      ]
    },
    {
      id: 'deadbug-core',
      name: 'Dead Bug Anti-Extension Core Hold',
      category: 'Core Stability',
      target: 'Transverse Abdominis, Obliques',
      frequency: '3 sets × 10 reps alternating',
      icon: 'shield',
      impact: 'Prevents anterior pelvic dump and lumbar hyperextension under heavy athletic loads.',
      instructions: [
        'Lie on back with arms pointing to ceiling and knees at 90° tabletop.',
        'Press your lower back flat into the ground with zero arching.',
        'Extend opposite arm and leg slowly while maintaining full ground contact.'
      ]
    }
  ],

  // 2. Knee Valgus / Medial Collapse (ACL Risk Factor)
  kneeValgus: [
    {
      id: 'banded-monster-walk',
      name: 'Banded Lateral Monster Walks',
      category: 'Hip Stabilizer Activation',
      target: 'Gluteus Medius, Tensor Fasciae Latae',
      frequency: '3 sets × 15 steps each direction',
      icon: 'arrow-left-right',
      impact: 'Strengthens external rotators to prevent inward knee collapse during cutting and landing.',
      instructions: [
        'Place mini-band around forefeet or ankles.',
        'Hinge hips slightly into athletic quarter-squat position.',
        'Step laterally, maintaining constant tension without dragging back foot or caving knees.'
      ]
    },
    {
      id: 'single-leg-rdl',
      name: 'Single-Leg Romanian Deadlift (RDL)',
      category: 'Proprioception & Posterior Chain',
      target: 'Glutes, Hamstrings, Ankle Stabilizers',
      frequency: '3 sets × 8 reps per leg',
      icon: 'scale',
      impact: 'Builds unilateral knee tracking stability and ankle-knee-hip kinetic chain synchronization.',
      instructions: [
        'Stand tall on one leg with a soft knee bend.',
        'Hinge at hips, reaching rear leg straight back like a pendulum.',
        'Ensure the standing knee stays in line with second toe, avoiding medial collapse.'
      ]
    },
    {
      id: 'side-lying-clam',
      name: 'Elevated Clamshells with Tempo',
      category: 'Targeted Isolation',
      target: 'Gluteus Medius, Piriformis',
      frequency: '3 sets × 15 reps (2s contraction)',
      icon: 'target',
      impact: 'Isolates deep hip external rotators responsible for holding femur tracking under deceleration.',
      instructions: [
        'Lie on side with knees bent at 45° and heels glued together.',
        'Rotate top knee up toward ceiling without rolling the pelvis backward.',
        'Squeeze top glute for 2 seconds before descending slowly.'
      ]
    }
  ],

  // 3. Thoracic Kyphosis & Forward Head (Upper Crossed Syndrome)
  thoracicKyphosis: [
    {
      id: 'foam-roller-thoracic-extension',
      name: 'Foam Roller Thoracic Extension & Reach',
      category: 'Spinal Mobility',
      target: 'Thoracic Spine, Pectoralis Minor',
      frequency: '2 sets × 10 gentle extensions',
      icon: 'maximize-2',
      impact: 'Unlocks upper spine extension for overhead pressing, throwing velocity, and swim strokes.',
      instructions: [
        'Position foam roller horizontally across mid-upper back (below neck).',
        'Support head with hands, keep hips on ground.',
        'Gently extend upper spine back over the roller on an exhale without flaring ribcage.'
      ]
    },
    {
      id: 'face-pulls-external-rotation',
      name: 'Face Pulls with End-Range External Rotation',
      category: 'Scapular Retraction & Rotator Cuff',
      target: 'Rear Delts, Rhomboids, Infraspinatus',
      frequency: '3 sets × 15 reps',
      icon: 'dumbbell',
      impact: 'Re-centers humeral head in socket and strengthens lower traps to fix rounded shoulders.',
      instructions: [
        'Set cable or resistance band at eye height.',
        'Pull handles towards forehead while driving elbows high and wide.',
        'Externally rotate hands back at peak contraction, thumbs pointing behind you.'
      ]
    },
    {
      id: 'chin-tucks-isometric',
      name: 'Deep Neck Flexor Wall Retraction (Chin Tucks)',
      category: 'Cervical Spine Alignment',
      target: 'Longus Colli, Longus Capitis',
      frequency: '3 sets × 10 reps (5s hold)',
      icon: 'arrow-down',
      impact: 'Corrects forward head position ("text neck") that reduces cervical shock absorption.',
      instructions: [
        'Stand with back against a wall.',
        'Without tilting head up or down, retract chin straight back like making a double chin.',
        'Press base of skull gently into wall for 5 seconds.'
      ]
    }
  ],

  // 4. Bilateral Shoulder / Pelvic Asymmetry (Unilateral Imbalance)
  bilateralAsymmetry: [
    {
      id: 'single-arm-suitcase-carry',
      name: 'Heavy Single-Arm Suitcase Carry',
      category: 'Anti-Lateral Flexion',
      target: 'Quadratus Lumborum, Obliques, Forearm',
      frequency: '3 sets × 40 yards per side',
      icon: 'briefcase',
      impact: 'Levels lateral pelvic tilt and builds bulletproof trunk stiffness under asymmetric loads.',
      instructions: [
        'Hold a kettlebell or dumbbell in one hand by your side.',
        'Walk with tall posture, shoulders strictly level, resisting any side lean.',
        'Keep ribs locked down and hips squared straight ahead.'
      ]
    },
    {
      id: 'half-kneeling-lift',
      name: 'Half-Kneeling Diagonal Cable / Band Chop',
      category: 'Rotational Trunk Stability',
      target: 'Cross-Body Kinetic Chain',
      frequency: '3 sets × 10 reps per side',
      icon: 'refresh-cw',
      impact: 'Syncs contralateral hip-to-shoulder force transmission for batting, swinging, and throwing.',
      instructions: [
        'Kneel on inside knee with hands on cable or band.',
        'Pull and rotate diagonally across body down towards lead hip.',
        'Keep lower body rock steady; motion comes from the thoracic torso.'
      ]
    }
  ]
};

// Sports Discipline Profiles
const SPORT_PROFILES = [
  {
    id: 'general',
    name: 'General Athletics & Fitness',
    icon: 'activity',
    description: 'Balanced focus on functional joint stacking, mobility, and core power transfer.',
    priorityWeights: { pelvic: 1.0, valgus: 1.0, thoracic: 1.0, asymmetry: 1.0 }
  },
  {
    id: 'runner',
    name: 'Running & Sprinting',
    icon: 'flame',
    description: 'High sensitivity to pelvic tilt (sprint hip extension) and knee valgus (repetitive impact).',
    priorityWeights: { pelvic: 1.4, valgus: 1.3, thoracic: 0.7, asymmetry: 1.1 }
  },
  {
    id: 'lifter',
    name: 'Strength & Powerlifting',
    icon: 'dumbbell',
    description: 'High sensitivity to thoracic kyphosis under spinal compression and pelvic lumbar stability.',
    priorityWeights: { pelvic: 1.3, valgus: 1.2, thoracic: 1.3, asymmetry: 1.2 }
  },
  {
    id: 'throwing',
    name: 'Rotational & Overhead Sports',
    icon: 'baseball',
    description: 'Baseball, tennis, volleyball, golf: High focus on scapular winging and thoracic extension.',
    priorityWeights: { pelvic: 1.0, valgus: 0.8, thoracic: 1.5, asymmetry: 1.4 }
  },
  {
    id: 'court',
    name: 'Court & Field Agility',
    icon: 'shield',
    description: 'Soccer, basketball, rugby: Extreme focus on knee valgus mitigation (cutting/landing ACL safety).',
    priorityWeights: { pelvic: 1.1, valgus: 1.6, thoracic: 0.8, asymmetry: 1.2 }
  }
];
