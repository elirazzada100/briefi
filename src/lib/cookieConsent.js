export const COOKIE_CONSENT_VERSION = "1.0";
const CONSENT_KEY = "briefi_cookie_consent";
const CONSENT_SET_KEY = "briefi_cookie_consent_set";

export function getCookieConsent() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasConsentBeenSet() {
  const consent = getCookieConsent();
  if (!consent) return false;
  // Re-show banner if version changed
  if (consent.version !== COOKIE_CONSENT_VERSION) return false;
  return localStorage.getItem(CONSENT_SET_KEY) === "true";
}

export function hasAnalyticsConsent() {
  const c = getCookieConsent();
  return c?.analytics === true;
}

export function hasMarketingConsent() {
  const c = getCookieConsent();
  return c?.marketing === true;
}

export function hasPreferencesConsent() {
  const c = getCookieConsent();
  return c?.preferences === true;
}

export function saveConsent({ essential = true, analytics, marketing, preferences }) {
  const consent = {
    version: COOKIE_CONSENT_VERSION,
    essential: true, // always true
    analytics: !!analytics,
    marketing: !!marketing,
    preferences: !!preferences,
    updated_at: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
  localStorage.setItem(CONSENT_SET_KEY, "true");
  return consent;
}

export function acceptAll() {
  return saveConsent({ essential: true, analytics: true, marketing: true, preferences: true });
}

export function rejectNonEssential() {
  return saveConsent({ essential: true, analytics: false, marketing: false, preferences: false });
}

export function clearConsent() {
  localStorage.removeItem(CONSENT_KEY);
  localStorage.removeItem(CONSENT_SET_KEY);
}