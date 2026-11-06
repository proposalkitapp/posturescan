/**
 * Kinetic Chain & Functional Pre-Hab Protocols
 * Grounded in kinesiology and physical therapy. No AI jargon.
 */

const PREHAB_DRILLS = {
  // 1. Anterior Pelvic Tilt & Hip Flexor Tightness
  anteriorPelvicTilt: [
    {
      id: 'half-kneeling-hip-flexor',
      name: 'Half-Kneeling Psoas Active Mobilization',
      category: 'Hip Mobility & Lengthening',
      target: 'Psoas Major, Rectus Femoris',
      frequency: '2 sets × 45s per side',
      icon: 'activity',
      impact: 'Restores neutral pelvic tilt, freeing hip extension for full stride drive.',
      instructions: [
        'Kneel on one knee with 90° angles at hip and knee joints.',
        'Squeeze the rear glute and tuck the pelvis underneath into posterior tilt.',
        'Glide forward gently without arching the lower back.'
      ]
    },
    {
      id: 'banded-glute-bridge',
      name: 'Banded Glute Bridges with Static Hold',
      category: 'Glute Activation',
      target: 'Gluteus Maximus, Hamstrings',
      frequency: '3 sets × 12 reps (3s top lockout)',
      icon: 'shield',
      impact: 'Activates primary hip extensors to counter excessive lumbar spine arching.',
      instructions: [
        'Place resistance band above knees while lying supine.',
        'Drive through heels, pressing knees outward against band tension.',
        'Lock out at peak by squeezing glutes with ribcage braced.'
      ]
    },
    {
      id: 'deadbug-core',
      name: 'Dead Bug Anti-Extension Core Brace',
      category: 'Core Stability',
      target: 'Transverse Abdominis, Deep Core',
      frequency: '3 sets × 10 reps alternating',
      icon: 'scale',
      impact: 'Teaches pelvic girdle stability against extension forces under load.',
      instructions: [
        'Lie on back with arms reaching upward and knees bent 90° at tabletop.',
        'Press lumbar spine flush against the floor with zero gap.',
        'Lower opposite arm and leg slowly while preserving total abdominal tension.'
      ]
    }
  ],

  // 2. Knee Valgus / Inward Medial Tracking
  kneeValgus: [
    {
      id: 'banded-monster-walk',
      name: 'Banded Lateral Stride Walks',
      category: 'Hip Abductor Conditioning',
      target: 'Gluteus Medius, Lateral Hip',
      frequency: '3 sets × 15 steps per direction',
      icon: 'arrow-right-left',
      impact: 'Strengthens external rotators to stabilize femur tracking during cutting and landing.',
      instructions: [
        'Position band around forefeet or ankles.',
        'Hinge slightly into an athletic ready position.',
        'Step laterally while preventing knees from caving inward.'
      ]
    },
    {
      id: 'single-leg-rdl',
      name: 'Single-Leg Romanian Deadlift (RDL)',
      category: 'Unilateral Balance',
      target: 'Glutes, Hamstrings, Foot Intrinsic Muscles',
      frequency: '3 sets × 8 reps per leg',
      icon: 'scale',
      impact: 'Coordinates foot-ankle-knee-hip alignment to reinforce joint resilience.',
      instructions: [
        'Balance on one leg with soft knee flexion.',
        'Hinge at hips, reaching non-weight-bearing leg straight behind.',
        'Ensure the standing knee points strictly over the second toe.'
      ]
    },
    {
      id: 'side-lying-clam',
      name: 'Tempo Hip Clamshells with Squeeze',
      category: 'Deep External Rotation',
      target: 'Gluteus Medius, Piriformis',
      frequency: '3 sets × 15 reps (2s hold)',
      icon: 'activity',
      impact: 'Isolates hip rotators responsible for maintaining frontal knee stability.',
      instructions: [
        'Lie on side with knees bent at 45° and heels pressed together.',
        'Rotate top knee up toward ceiling without rolling the pelvis backward.',
        'Hold contraction for two seconds at peak before lowering.'
      ]
    }
  ],

  // 3. Thoracic Kyphosis & Forward Head Angle
  thoracicKyphosis: [
    {
      id: 'foam-roller-thoracic-extension',
      name: 'Thoracic Extension Over Roller',
      category: 'Spinal Extension Mobility',
      target: 'Thoracic Spine, Anterior Chest',
      frequency: '2 sets × 10 gentle extensions',
      icon: 'maximize-2',
      impact: 'Releases mid-back flexion to enhance overhead arm reach and breathing mechanics.',
      instructions: [
        'Place foam roller across mid-back beneath shoulder blades.',
        'Cradle head with hands to keep neck neutral.',
        'Inhale tall, then exhale as you extend upper spine back over roller.'
      ]
    },
    {
      id: 'face-pulls-external-rotation',
      name: 'Cable / Band Face Pull with External Rotation',
      category: 'Scapular Retraction',
      target: 'Rhomboids, Rear Deltoids, Rotator Cuff',
      frequency: '3 sets × 15 reps',
      icon: 'shield',
      impact: 'Pulls forward shoulders back into alignment and reinforces lower trapezius.',
      instructions: [
        'Anchor band at eye height and grasp handles with neutral grip.',
        'Pull towards bridge of nose while flaring elbows high and back.',
        'Externally rotate forearms backward at peak contraction.'
      ]
    },
    {
      id: 'chin-tucks-isometric',
      name: 'Cervical Retraction (Wall Chin Tucks)',
      category: 'Neck Flexor Re-Education',
      target: 'Deep Cervical Flexors (Longus Colli)',
      frequency: '3 sets × 10 reps (5s hold)',
      icon: 'arrow-down',
      impact: 'Aligns the skull over cervical vertebrae, relieving upper trap strain.',
      instructions: [
        'Stand tall with back of head close to wall.',
        'Draw chin straight back as if creating a subtle double chin.',
        'Hold back of head gently against wall for 5 seconds.'
      ]
    }
  ],

  // 4. Bilateral Shoulder / Pelvic Asymmetry
  bilateralAsymmetry: [
    {
      id: 'single-arm-suitcase-carry',
      name: 'Single-Arm Suitcase Carry',
      category: 'Anti-Lateral Flexion Stability',
      target: 'Quadratus Lumborum, Obliques',
      frequency: '3 sets × 35 yards per side',
      icon: 'shield',
      impact: 'Corrects side-to-side torso tilt and promotes symmetric spinal loading.',
      instructions: [
        'Hold a kettlebell or dumbbell in one hand at your side.',
        'Walk slowly with upright posture, resisting any side lean or hip drop.',
        'Keep shoulders and hips perfectly level throughout the walk.'
      ]
    },
    {
      id: 'half-kneeling-lift',
      name: 'Half-Kneeling Diagonal Torso Chop',
      category: 'Cross-Body Rotational Balance',
      target: 'Anterior & Posterior Oblique Slings',
      frequency: '3 sets × 10 reps per side',
      icon: 'refresh-cw',
      impact: 'Builds balanced rotational force transmission from ground through upper body.',
      instructions: [
        'Assume half-kneeling position with front knee at 90°.',
        'Grasp band or cable diagonally above, pulling down and across body.',
        'Keep hips steady; movement originates from upper thoracic spine.'
      ]
    }
  ]
};

// Sports & Movement Screening Profiles
const SPORT_PROFILES = [
  {
    id: 'general',
    name: 'General Movement & Posture',
    icon: 'activity',
    description: 'Everyday functional alignment, upright spine, and balanced joint loading.',
    priorityWeights: { pelvic: 1.0, valgus: 1.0, thoracic: 1.0, asymmetry: 1.0 }
  },
  {
    id: 'runner',
    name: 'Running & Sprinting',
    icon: 'flame',
    description: 'Focus on neutral pelvic extension for stride length and knee tracking resilience.',
    priorityWeights: { pelvic: 1.4, valgus: 1.3, thoracic: 0.7, asymmetry: 1.1 }
  },
  {
    id: 'lifter',
    name: 'Strength & Resistance Training',
    icon: 'shield',
    description: 'Focus on thoracic stacking under bar loads and neutral lumbar spine integrity.',
    priorityWeights: { pelvic: 1.3, valgus: 1.2, thoracic: 1.3, asymmetry: 1.2 }
  },
  {
    id: 'throwing',
    name: 'Rotational & Overhead Sports',
    icon: 'refresh-cw',
    description: 'Tennis, golf, swimming: focus on scapular glide and thoracic rotation capacity.',
    priorityWeights: { pelvic: 1.0, valgus: 0.8, thoracic: 1.5, asymmetry: 1.4 }
  },
  {
    id: 'court',
    name: 'Agility & Field Sports',
    icon: 'scale',
    description: 'Basketball, soccer: intense focus on knee valgus prevention during jump landings.',
    priorityWeights: { pelvic: 1.1, valgus: 1.6, thoracic: 0.8, asymmetry: 1.2 }
  }
];
