import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, Shield, FileText, Info, Cookie, Mail, Trash2,
  Lock, Copyright, Cpu, UserCheck, User
} from "lucide-react";
import CookiePreferencesModal from "@/components/cookies/CookiePreferencesModal";

// ── Section: תמיכה ──────────────────────────────────────────────────────────
const supportItems = [
  {
    to: "/settings/contact",
    icon: Mail,
    label: "יצירת קשר ותמיכה",
    desc: "שאלות, תקלות, בקשות — כתבו לנו",
    color: "#0EA5E9",
  },
  {
    to: "/settings/about",
    icon: Info,
    label: "אודות בריפי",
    desc: "למה בריפי נוצרה",
    color: "#10B981",
  },
];

// ── Section: משפטי ופרטיות ──────────────────────────────────────────────────
const legalItems = [
  {
    to: "/settings/privacy",
    icon: Shield,
    label: "מדיניות פרטיות",
    desc: "איך אנחנו שומרים ומשתמשים במידע שלכם",
    color: "#7C3AED",
  },
  {
    to: "/settings/terms",
    icon: FileText,
    label: "תנאי שימוש",
    desc: "הכללים לשימוש בבריפי",
    color: "#3B82F6",
  },
  {
    to: "/settings/ai-use",
    icon: Cpu,
    label: "שימוש ב־AI",
    desc: "איך AI עובד בבריפי ומה חשוב לדעת",
    color: "#8B5CF6",
  },
  {
    to: "/settings/copyright",
    icon: Copyright,
    label: "זכויות יוצרים ושימוש מסחרי",
    desc: "מה מותר, מה אסור, ואיך להשתמש נכון",
    color: "#F97316",
  },
  {
    to: "/settings/privacy-request",
    icon: UserCheck,
    label: "בקשת פרטיות",
    desc: "עיון, תיקון או מחיקה של מידע",
    color: "#10B981",
  },
  {
    to: "/settings/security",
    icon: Lock,
    label: "אבטחה",
    desc: "איך אנחנו שומרים על המידע שלכם",
    color: "#64748B",
  },
];

// ── Section: חשבון ──────────────────────────────────────────────────────────
const accountItemsTop = [
  {
    to: "/profile",
    icon: User,
    label: "פרטי חשבון",
    desc: "פרופיל, מיתוג ולוגו",
    color: "#3B82F6",
  },
];

const deleteAccountItem = {
  to: "/settings/delete-account",
  icon: Trash2,
  label: "מחיקת חשבון",
  desc: "בקשה למחיקת החשבון והמידע שלכם",
  color: "#EF4444",
};

function SettingsItem({ item }) {
  return (
    <Link to={item.to} className="block">
      <div className="flex items-center gap-3.5 bg-white rounded-2xl border border-border/60 px-4 py-4 hover:border-primary/25 hover:shadow-sm transition-all">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${item.color}15` }}
        >
          <item.icon className="w-4 h-4" style={{ color: item.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{item.label}</p>
          <p className="text-xs text-muted-foreground">{item.desc}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground rotate-180 flex-shrink-0" />
      </div>
    </Link>
  );
}

function SectionTitle({ label }) {
  return (
    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 pb-1">{label}</p>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const [showCookieModal, setShowCookieModal] = useState(false);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"
          >
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <h1 className="text-base font-black text-foreground">הגדרות</h1>
        </div>
      </div>

      <div className="briefi-page-container space-y-6 pt-6">
        {/* 1. תמיכה */}
        <div className="space-y-2">
          <SectionTitle label="תמיכה" />
          {supportItems.map((item) => <SettingsItem key={item.to} item={item} />)}
        </div>

        {/* 2. משפטי ופרטיות */}
        <div className="space-y-2">
          <SectionTitle label="משפטי ופרטיות" />
          {legalItems.map((item) => <SettingsItem key={item.to} item={item} />)}
          {/* Cookie preferences — opens modal */}
          <button onClick={() => setShowCookieModal(true)} className="w-full block">
            <div className="flex items-center gap-3.5 bg-white rounded-2xl border border-border/60 px-4 py-4 hover:border-primary/25 hover:shadow-sm transition-all text-right">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#F59E0B15" }}>
                <Cookie className="w-4 h-4" style={{ color: "#F59E0B" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">הגדרות קוקיז</p>
                <p className="text-xs text-muted-foreground">שינוי בחירת הקוקיז שלכם</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground rotate-180 flex-shrink-0" />
            </div>
          </button>
        </div>

        {/* 3. חשבון — פרטי חשבון, then מחיקה last */}
        <div className="space-y-2">
          <SectionTitle label="חשבון" />
          {accountItemsTop.map((item) => <SettingsItem key={item.to} item={item} />)}
          {/* מחיקת חשבון — always last */}
          <SettingsItem item={deleteAccountItem} />
        </div>
      </div>

      {showCookieModal && (
        <CookiePreferencesModal
          onClose={() => setShowCookieModal(false)}
          onSaved={() => setShowCookieModal(false)}
        />
      )}
    </div>
  );
}