import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Shield, FileText, Info } from "lucide-react";

const settingsItems = [
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
    to: "/settings/about",
    icon: Info,
    label: "אודות",
    desc: "למה בריפי נוצרה",
    color: "#10B981",
  },
];

export default function Settings() {
  const navigate = useNavigate();

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

      <div className="briefi-page-container space-y-3 pt-6">
        {settingsItems.map((item) => (
          <Link to={item.to} key={item.to} className="block">
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
        ))}
      </div>
    </div>
  );
}