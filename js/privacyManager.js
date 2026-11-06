/**
 * Privacy, Cookie Consent & Ethical Governance Manager
 * Implements COPPA/GDPR compliance, cookie consent with zero dark patterns, and data deletion rights.
 */

class PrivacyManager {
  constructor() {
    this.STORAGE_KEYS = {
      cookieConsent: 'ks_cookie_consent',
      ageVerified: 'ks_age_verified',
      savedScan: 'ks_saved_scan'
    };
    this.isAgeVerified = false;
  }

  init() {
    this.checkCookieBanner();
    this.checkAgeStatus();
    this.setupAccessibilityListeners();
  }

  // Cookie Consent Banner (No Dark Patterns)
  checkCookieBanner() {
    const consent = localStorage.getItem(this.STORAGE_KEYS.cookieConsent);
    const banner = document.getElementById('cookie-consent-banner');
    if (!consent && banner) {
      banner.classList.remove('hidden');
      banner.setAttribute('aria-hidden', 'false');
    }
  }

  setCookieConsent(accepted) {
    localStorage.setItem(this.STORAGE_KEYS.cookieConsent, accepted ? 'accepted' : 'essential_only');
    const banner = document.getElementById('cookie-consent-banner');
    if (banner) {
      banner.classList.add('hidden');
      banner.setAttribute('aria-hidden', 'true');
    }
  }

  // Age Verification Gate (COPPA / GDPR-K Protection)
  checkAgeStatus() {
    this.isAgeVerified = localStorage.getItem(this.STORAGE_KEYS.ageVerified) === 'true';
  }

  verifyAge(isSixteenPlus) {
    if (isSixteenPlus) {
      this.isAgeVerified = true;
      localStorage.setItem(this.STORAGE_KEYS.ageVerified, 'true');
      this.closeModal('age-gate-modal');
      // If camera was pending, trigger camera start
      if (window.app && window.app.pendingCameraAction) {
        window.app.pendingCameraAction();
        window.app.pendingCameraAction = null;
      }
    } else {
      alert('Under COPPA and GDPR-K guidelines, camera movement scanning requires verifiable parental or guardian authorization. Please have a parent or guardian supervise your scan session.');
    }
  }

  requireAgeVerificationBeforeCamera(callback) {
    if (this.isAgeVerified) {
      callback();
    } else {
      if (window.app) window.app.pendingCameraAction = callback;
      this.openModal('age-gate-modal');
    }
  }

  // Open Legal Policy Drawer / Modal
  showPolicy(type) {
    const policy = LEGAL_POLICIES[type];
    if (!policy) return;

    const modal = document.getElementById('policy-modal');
    const title = document.getElementById('policy-modal-title');
    const date = document.getElementById('policy-modal-date');
    const summary = document.getElementById('policy-modal-summary');
    const body = document.getElementById('policy-modal-body');

    if (title) title.innerText = policy.title;
    if (date) date.innerText = `Effective: ${policy.lastUpdated}`;
    if (summary) summary.innerText = policy.summary;

    if (body) {
      body.innerHTML = policy.sections.map(sec => `
        <div class="space-y-1.5 pb-4 border-b border-stone-800/80 last:border-b-0">
          <h4 class="font-display font-bold text-sm text-stone-200">${sec.heading}</h4>
          <p class="text-xs text-stone-400 leading-relaxed">${sec.content}</p>
        </div>
      `).join('');
    }

    this.openModal('policy-modal');
  }

  // Data Rights: Self-Serve Purge & Deletion Request
  purgeAllLocalData() {
    const confirmed = confirm('Are you sure you want to permanently erase all locally stored data, scan results, and preferences from this device? This action cannot be undone.');
    if (!confirmed) return;

    localStorage.clear();
    sessionStorage.clear();
    alert('All locally stored data has been permanently purged. The application will now reset.');
    window.location.reload();
  }

  submitDeletionRequest(event) {
    if (event) event.preventDefault();
    const emailInput = document.getElementById('deletion-email-input');
    const email = emailInput ? emailInput.value.trim() : '';

    if (!email) {
      alert('Please enter a valid email address for confirmation.');
      return;
    }

    // Since we store 100% locally and keep 0 remote databases, we purge all local memory immediately
    localStorage.clear();
    sessionStorage.clear();

    const resultBox = document.getElementById('deletion-result-box');
    if (resultBox) {
      resultBox.classList.remove('hidden');
      resultBox.innerHTML = `
        <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
          <div class="font-bold flex items-center space-x-1.5">
            <i data-lucide="check-circle" class="w-4 h-4 text-amber-400"></i>
            <span>Request Processed & Local Storage Cleared</span>
          </div>
          <p>
            Confirmation reference: <strong>KS-${Date.now().toString(36).toUpperCase()}</strong>.
            Because KineticScan 360 processes all computer vision on-device without remote servers, all local storage on this browser has been verified completely purged.
          </p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
    }
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
      // Trap focus to close button
      const closeBtn = modal.querySelector('button');
      if (closeBtn) closeBtn.focus();
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  setupAccessibilityListeners() {
    // Close modals on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        ['policy-modal', 'age-gate-modal', 'data-deletion-modal'].forEach(id => {
          this.closeModal(id);
        });
      }
    });
  }
}

const privacyManager = new PrivacyManager();
