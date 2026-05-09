import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import BriefiStepper from "@/components/briefi/BriefiStepper";

function normalizeSpecialFocus(rawValue) {
  const text = (rawValue || "").trim();
  return {
    enabled: text.length > 0,
    text,
  };
}

export default function SpecialFocus() {
  const { projectId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [focusText, setFocusText] = useState(state?.specialFocus?.text || "");

  const selectedVideoStyle = state?.selectedVideoStyle;
  const focusState = useMemo(() => normalizeSpecialFocus(focusText), [focusText]);

  const navigateToConcepts = (nextFocusState) => {
    if (!selectedVideoStyle) {
      navigate(`/project/${projectId}/video-style`);
      return;
    }

    navigate(`/project/${projectId}/grok-concepts`, {
      state: {
        ...(state || {}),
        specialFocus: nextFocusState,
      },
    });
  };

  const handleContinue = () => {
    navigateToConcepts(focusState);
  };

  return (
    <div className="bg-background" style={{ minHeight: "100dvh" }} dir="rtl">
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <p className="text-xs font-bold text-foreground">פוקוס לסרטון</p>
            {selectedVideoStyle && (
              <p className="text-[10px] text-muted-foreground">{selectedVideoStyle}</p>
            )}
          </div>
        </div>
        <div className="mt-2">
          <BriefiStepper currentStep={1} />
        </div>
      </div>

      <div className="briefi-page-container space-y-4">
        <div>
          <h1 className="text-xl font-black text-foreground">יש משהו מיוחד שצריך להיכנס לסרטון?</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            מבצע, חג, מוצר חדש, אירוע, או כל דבר שכדאי שהרעיון יתחשב בו.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-4">
          <textarea
            value={focusText}
            onChange={(e) => setFocusText(e.target.value)}
            rows={5}
            placeholder="למשל: מבצע סוף שבוע על התיק הכחול החדש"
            className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />
        </div>

        <div className="space-y-2">
          <button onClick={handleContinue} className="briefi-btn-primary w-full">
            <Sparkles className="h-4 w-4" />
            המשך לקונספטים
          </button>
          <button onClick={() => navigateToConcepts({ enabled: false, text: "" })} className="briefi-btn-ghost w-full">
            <ArrowRight className="h-4 w-4" />
            המשך בלי משהו מיוחד
          </button>
        </div>
      </div>
    </div>
  );
}
