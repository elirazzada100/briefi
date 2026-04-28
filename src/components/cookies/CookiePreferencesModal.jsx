import { useState } from "react";
import { X } from "lucide-react";
import { saveConsent, acceptAll, rejectNonEssential, getCookieConsent } from "@/lib/cookieConsent";

const CATEGORIES = [
  {
    key: "essential",
    name: "הכרחיים",
    desc: "קוקיז שחייבים כדי שהאתר יעבוד, למשל התחברות, אבטחה ושמירת סשן.",
    alwaysOn: true,
  },
  {
    key: "analytics",
    name: "אנליטיקה",
    desc: "עוזרים לנו להבין איך משתמשים בבריפי כדי לשפר את המוצר.",
    alwaysOn: false,
  },
  {
    key: "marketing",
    name: "שיווק",
    desc: "עשויים לשמש למדידה, פרסום ורימרקטינג.",
    alwaysOn: false,
  },
  {
    key: "preferences",
    name: "העדפות",
    desc: "שומרים בחירות כמו שפה, תצוגה והעדפות שימוש.",
    alwaysOn: false,
  },
];

export default function CookiePreferencesModal({ onClose, onSaved }) {
  const existing = getCookieConsent();
  const [values, setValues] = useState({
    analytics: existing?.analytics ?? false,
    marketing: existing?.marketing ?? false,
    preferences: existing?.preferences ?? false,
  });

  const toggle = (key) => setValues((v) => ({ ...v, [key]: !v[key] }));

  const handleSave = () => {
    saveConsent({ ...values });
    onSaved?.();
    onClose();
  };

  const handleAcceptAll = () => {
    acceptAll();
    onSaved?.();
    onClose();
  };

  const handleReject = () => {
    rejectNonEssential();
    onSaved?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl z-10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60">
          <h2 className="text-base font-black text-foreground">ניהול קוקיז</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Categories */}
        <div className="p-5 space-y-4">
          {CATEGORIES.map((cat) => {
            const isOn = cat.alwaysOn ? true : values[cat.key];
            return (
              <div key={cat.key} className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{cat.name}</p>
                    {cat.alwaysOn && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">תמיד פעיל</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{cat.desc}</p>
                </div>
                {/* Toggle */}
                <button
                  disabled={cat.alwaysOn}
                  onClick={() => !cat.alwaysOn && toggle(cat.key)}
                  className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 mt-0.5
                    ${isOn ? "bg-primary" : "bg-muted"}
                    ${cat.alwaysOn ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200
                      ${isOn ? "right-1" : "left-1"}`}
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="p-5 pt-0 space-y-2.5 border-t border-border/60">
          <button onClick={handleSave} className="briefi-btn-primary w-full">שמירת בחירה</button>
          <button onClick={handleAcceptAll} className="briefi-btn-secondary w-full">אישור הכל</button>
          <button onClick={handleReject} className="briefi-btn-ghost w-full text-muted-foreground">דחיית לא הכרחיים</button>
        </div>
      </div>
    </div>
  );
}