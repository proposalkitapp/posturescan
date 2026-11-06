/**
 * Legal & Ethical Compliance Policies
 * Full GDPR, CCPA, COPPA, and WCAG aligned documentation.
 */

const LEGAL_POLICIES = {
  privacy: {
    title: 'Privacy Policy',
    lastUpdated: 'November 2026',
    summary: 'KineticScan 360 is built on a strict Privacy-by-Design and Local-First computing architecture. Your camera video feed is processed entirely inside your device browser via WebAssembly. Zero video bytes or body images are ever transmitted to or stored on remote servers.',
    sections: [
      {
        heading: '1. On-Device Edge Processing (Zero Cloud Video)',
        content: 'When you initialize the 360° spin scan, video frames captured via your webcam or smartphone camera are processed locally in temporary browser memory by the MediaPipe computer vision model. Once landmark coordinates are extracted, video frames are immediately cleared from memory. No images, videos, or raw biometric data are ever sent over the internet or saved to our servers.'
      },
      {
        heading: '2. Data We Do NOT Collect',
        content: 'We adhere to data minimization principles. We do NOT collect: (a) Facial recognition templates; (b) Video recordings or static photos; (c) Exact geographic GPS locations; (d) Personal identifiers (name, home address, government ID); (e) Cross-site tracking identifiers.'
      },
      {
        heading: '3. Local Storage Usage',
        content: 'We store minimal functional data solely within your browser LocalStorage: (a) Your cookie consent preferences; (b) Your age verification status (to ensure COPPA/minor compliance); (c) Your selected sport discipline preference; (d) Cached landmark posture scores so you can review your report across sessions on the same device.'
      },
      {
        heading: '4. Children & Minor Protection (COPPA / GDPR-K)',
        content: 'We do not knowingly collect personal information from individuals under 16 years of age without verifiable parental consent. Users must pass an age confirmation gate before camera access is granted.'
      },
      {
        heading: '5. Your Rights & Data Deletion ("Right to be Forgotten")',
        content: 'You maintain absolute ownership of your movement data. You can permanently erase all locally stored data at any time using the "Purge All Data" button in the Privacy Settings, or submit a formal data deletion inquiry via our Data Rights modal.'
      }
    ]
  },

  terms: {
    title: 'Terms of Service',
    lastUpdated: 'November 2026',
    summary: 'By accessing or using KineticScan 360, you agree to these Terms. Please read them carefully.',
    sections: [
      {
        heading: '1. Non-Medical Disclaimer & Athletic screening',
        content: 'KineticScan 360 is designed strictly for educational, fitness screening, and athletic pre-hab informational purposes. It is NOT a medical diagnostic device, clinical tool, or medical treatment provider. Always consult a licensed physician, physical therapist, or orthopedic specialist before beginning any new exercise routine or if experiencing chronic pain or injury.'
      },
      {
        heading: '2. Safe Physical Environment',
        content: 'Before performing a 360° rotation scan or any prescribed physical drills, ensure your surroundings are flat, clean, and free from tripping hazards or obstacles. You assume full personal responsibility for your movement and environment.'
      },
      {
        heading: '3. Acceptable Use',
        content: 'You agree not to reverse engineer, disrupt, or introduce malicious payloads into the application. You agree to use the service only for lawful athletic and postural assessment purposes.'
      },
      {
        heading: '4. Limitation of Liability',
        content: 'To the fullest extent permitted by law, KineticScan 360 and its creators disclaim all liability for any indirect, incidental, or physical injury resulting from the use or inability to use the recommendations or drills provided.'
      }
    ]
  },

  cookies: {
    title: 'Cookie & Local Storage Policy',
    lastUpdated: 'November 2026',
    summary: 'We believe in a tracker-free web. KineticScan 360 uses zero third-party advertising cookies, zero pixel trackers, and zero behavioral telemetry.',
    sections: [
      {
        heading: '1. What Are Cookies and Local Storage?',
        content: 'Cookies and local storage are small text files stored locally on your device by your web browser to remember preferences and ensure essential web app features function reliably.'
      },
      {
        heading: '2. Strictly Essential Storage We Use',
        content: 'We only store essential operational flags: "ks_cookie_consent" (records your banner decision), "ks_age_verified" (records minor consent check), and "ks_recent_scores" (persists your score locally so you do not lose it when refreshing).'
      },
      {
        heading: '3. Zero Third-Party Advertising Trackers',
        content: 'We do NOT integrate Google Analytics advertising features, Meta Pixel, TikTok tracking, or data brokerage SDKs. No dark patterns are used to nudge you into tracking.'
      },
      {
        heading: '4. How to Clear or Disable',
        content: 'You can revoke your consent at any time using the "Cookie Settings" link in the footer, or clear your browser cache/cookies in your browser settings.'
      }
    ]
  }
};
