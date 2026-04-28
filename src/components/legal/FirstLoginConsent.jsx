import { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const LEGAL_VERSION = "1.0";
const STORAGE_KEY = "briefi_legal_accepted";

export function hasAcceptedLegal() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return false;
    const data = JSON.parse(stored);
    return data?.legal_version === LEGAL_VERSION;
  } catch {
    return false;
  }
}

function saveLegalAccepted() {
  const now = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    terms_accepted_at: now,
    privacy_accepted_at: now,
    legal_version: LEGAL_VERSION,
  }));
  // Also persist on user record
  base44.auth.updateMe({
    terms_accepted_at: now,
    privacy_accepted_at: now,
    legal_version: LEGAL_VERSION,
  }).catch(() => {}); // best-effort
}

export default function FirstLoginConsent({ onAccepted }) {
  const [accepted, setAccepted] = useState(false);

  const handleConfirm = () => {
    saveLegalAccepted();
    onAccepted();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm px-4 pb-6" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-3xl border border-border/60 shadow-2xl p-6 space-y-5 animate-slide-up">
        <div className="text-center">
          <div
            className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)" }}
          >
            <span className="text-white text-xl font-black">B</span>
          </div>
          <h2 className="text-lg font-black text-foreground">ברוכים הבאים לבריפי</h2>
          <p className="text-sm text-muted-foreground mt-1">לפני שמתחילים, כמה שניות</p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <div className="relative mt-0.5 flex-shrink-0">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                accepted ? "bg-primary border-primary" : "border-border bg-white"
              }`}
            >
              {accepted && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 12 10" fill="none">
                  <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            אני מאשר/ת שקראתי ואני מסכים/ה ל
            <Link to="/settings/terms" className="text-primary font-semibold underline-offset-2 underline" onClick={(e) => e.stopPropagation()}>
              תנאי השימוש
            </Link>
            {" "}ול
            <Link to="/settings/privacy" className="text-primary font-semibold underline-offset-2 underline" onClick={(e) => e.stopPropagation()}>
              מדיניות הפרטיות
            </Link>
            {" "}של בריפי.
          </p>
        </label>

        <button
          onClick={handleConfirm}
          disabled={!accepted}
          className="briefi-btn-primary w-full"
        >
          אני מסכים/ה, בואו נתחיל
        </button>

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          המשך שימוש בבריפי כפוף לתנאי השימוש ומדיניות הפרטיות.
        </p>
      </div>
    </div>
  );
}