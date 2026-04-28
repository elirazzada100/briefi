import { useState } from "react";
import { acceptAll, rejectNonEssential } from "@/lib/cookieConsent";
import CookiePreferencesModal from "./CookiePreferencesModal";

export default function CookieConsentBanner({ onConsented }) {
  const [showModal, setShowModal] = useState(false);

  const handleAcceptAll = () => {
    acceptAll();
    onConsented?.();
  };

  const handleReject = () => {
    rejectNonEssential();
    onConsented?.();
  };

  return (
    <>
      {/* Banner */}
      <div
        className="fixed bottom-0 right-0 left-0 z-40 bg-white border-t border-border/60 shadow-2xl rounded-t-3xl"
        dir="rtl"
      >
        <div className="max-w-lg mx-auto px-5 pt-5 pb-6 space-y-4">
          <div>
            <p className="text-sm font-black text-foreground mb-1">אנחנו משתמשים בקוקיז</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              קוקיז עוזרים לבריפי לעבוד טוב יותר, לשמור העדפות ולשפר את החוויה. אפשר לאשר הכל, לדחות מה שלא הכרחי, או לבחור ידנית.
            </p>
          </div>

          <div className="space-y-2">
            <button onClick={handleAcceptAll} className="briefi-btn-primary w-full">
              אישור הכל
            </button>
            <button onClick={handleReject} className="briefi-btn-secondary w-full">
              דחיית לא הכרחיים
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="briefi-btn-ghost w-full text-muted-foreground"
            >
              בחירה ידנית
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <CookiePreferencesModal
          onClose={() => setShowModal(false)}
          onSaved={() => onConsented?.()}
        />
      )}
    </>
  );
}