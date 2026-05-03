import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

export default function SpecialFocus() {
  const { projectId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [specialFocusText, setSpecialFocusText] = useState(state?.specialFocusText || "");

  const business = state?.business;
  const businessAnalysis = state?.businessAnalysis;
  const selectedVideoStyle = state?.selectedVideoStyle;

  const handleContinue = () => {
    const trimmed = specialFocusText.trim();
    navigate(`/project/${projectId}/grok-concepts`, {
      state: {
        selectedVideoStyle,
        business,
        businessAnalysis,
        specialFocusText: trimmed,
        specialFocusEnabled: Boolean(trimmed),
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
            <p className="text-xs font-bold text-foreground">יש משהו מיוחד שנכניס לסרטון?</p>
          </div>
        </div>
      </div>

      <div className="briefi-page-container space-y-4">
        <div>
          <h1 className="text-xl font-black text-foreground">יש משהו מיוחד שנכניס לסרטון?</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            מבצע, חג, מוצר חדש, אירוע, תאריך מיוחד או משהו שהלקוח ביקש להבליט.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 space-y-2">
          <label className="block text-sm font-bold text-foreground">מה חשוב להכניס?</label>
          <textarea
            value={specialFocusText}
            onChange={(e) => setSpecialFocusText(e.target.value)}
            placeholder='לדוגמה: מבצע 1+1, ל״ג בעומר, תפריט חדש, משלוחים עד 2 בלילה'
            rows={5}
            className="briefi-textarea"
            dir="rtl"
          />
        </div>

        <div className="space-y-2">
          <button onClick={handleContinue} className="briefi-btn-primary w-full">
            <Sparkles className="h-4 w-4" />
            להמשיך לקונספטים
          </button>
          <button
            onClick={() => {
              setSpecialFocusText("");
              navigate(`/project/${projectId}/grok-concepts`, {
                state: {
                  selectedVideoStyle,
                  business,
                  businessAnalysis,
                  specialFocusText: "",
                  specialFocusEnabled: false,
                },
              });
            }}
            className="briefi-btn-secondary w-full"
          >
            לא, להמשיך רגיל
          </button>
        </div>
      </div>
    </div>
  );
}
