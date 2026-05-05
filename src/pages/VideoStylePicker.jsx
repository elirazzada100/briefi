import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import BriefiStepper from "@/components/briefi/BriefiStepper";

// 7 user-facing styles. Order: מצחיק, תדמית, סרטון הכרות, מכירתי, לימודי, UGC / המלצה, טרנדי
// Removed from UI: סרטון אווירה, כאב / פתרון, חינוכי, השוואה, מיתוס / ניפוץ
// (those remain as internal AI routing mechanics only)
const VIDEO_STYLES = [
  {
    id: "מצחיק",
    emoji: "😂",
    label: "מצחיק",
    desc: "סיטואציה, פאנץ׳, רגע שאנשים שולחים לחברים.",
    color: "#F59E0B",
    bg: "#FEF3C7",
  },
  {
    id: "תדמית",
    emoji: "💎",
    label: "תדמית",
    desc: "לבנות לעסק אופי, עמדה ואמון בלי להישמע כמו מצגת.",
    color: "#7C3AED",
    bg: "#EDE9FE",
  },
  {
    id: "סרטון הכרות",
    emoji: "👋",
    label: "סרטון הכרות",
    desc: "מי עומד מאחורי העסק, בלי נאום ובלי 'נעים מאוד אני'.",
    color: "#3B82F6",
    bg: "#DBEAFE",
  },
  {
    id: "מכירתי",
    emoji: "🛒",
    label: "מכירתי",
    desc: "למכור בלי להישמע כמו פרסומת.",
    color: "#F97316",
    bg: "#FFEDD5",
  },
  {
    id: "לימודי",
    emoji: "🧠",
    label: "לימודי",
    desc: "טיפ, הסבר, טעות נפוצה או משהו שהלקוח לא ידע.",
    color: "#0EA5E9",
    bg: "#E0F2FE",
  },
  {
    id: "ugc",
    emoji: "💬",
    label: "UGC / המלצה",
    desc: "לא לשכוח קוד קופון!",
    color: "#EC4899",
    bg: "#FCE7F3",
  },
  {
    id: "טרנדי",
    emoji: "🔥",
    label: "טרנדי",
    desc: 'בריפי אוספת טרנדים חדשים מחו"ל בכל יום',
    color: "#14B8A6",
    bg: "#CCFBF1",
  },
];

export default function VideoStylePicker() {
  const { projectId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const business = state?.business;
  const businessAnalysis = state?.businessAnalysis;

  const handleContinue = () => {
    if (!selected) return;
    navigate(`/project/${projectId}/special-focus`, {
      state: {
        selectedVideoStyle: selected,
        business,
        businessAnalysis,
      },
    });
  };

  return (
    <div className="bg-background" style={{ minHeight: "100dvh" }} dir="rtl">
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center cursor-pointer">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <p className="text-xs font-bold text-foreground">בחרו סגנון סרטון</p>
          </div>
        </div>
        <div className="mt-2">
          <BriefiStepper currentStep={1} isTrendy={selected === "trendy" || selected === "טרנדי"} />
        </div>
      </div>

      <div className="briefi-page-container space-y-3">
        <div>
          <h1 className="text-xl font-black text-foreground">בחירת סגנון</h1>
          <p className="text-sm text-muted-foreground mt-0.5">בחרו סגנון ונייצר 4 קונספטים מותאמים לעסק.</p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {VIDEO_STYLES.map((style, index) => {
            const isSelected = selected === style.id;
            return (
              <motion.button
                key={style.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => setSelected(style.id)}
                className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 text-right transition-all duration-200 ${
                  isSelected
                    ? "border-transparent shadow-md"
                    : "border-border/60 bg-white hover:border-primary/25 hover:shadow-sm"
                }`}
                style={
                  isSelected
                    ? {
                        background: `linear-gradient(135deg, ${style.bg} 0%, white 100%)`,
                        borderColor: style.color,
                        boxShadow: `0 0 0 2px ${style.color}30, 0 4px 12px ${style.color}20`,
                      }
                    : {}
                }
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: style.bg }}
                >
                  {style.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm">{style.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{style.desc}</p>
                </div>
                {isSelected && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-black"
                    style={{ background: style.color }}
                  >
                    ✓
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="space-y-2 pt-1">
          <button
            onClick={handleContinue}
            disabled={!selected}
            className="briefi-btn-primary w-full"
          >
            <Sparkles className="h-4 w-4" />
            המשך
          </button>
          <button onClick={() => navigate(-1)} className="briefi-btn-ghost w-full">
            <ArrowRight className="h-4 w-4" />
            חזרה
          </button>
        </div>
      </div>
    </div>
  );
}
