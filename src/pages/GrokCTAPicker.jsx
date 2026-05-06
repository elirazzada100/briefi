import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Sparkles, AlertCircle } from "lucide-react";
import BriefiLoader from "@/components/shared/BriefiLoader";
import BriefiStepper from "@/components/briefi/BriefiStepper";

const CTA_TYPE_COLORS = {
  "ישיר": "bg-primary/10 text-primary border-primary/20",
  "רך": "bg-green-50 text-green-700 border-green-200",
  "שמירה / שיתוף": "bg-amber-50 text-amber-700 border-amber-200",
  "פנייה / הודעה": "bg-blue-50 text-blue-700 border-blue-200",
};

export default function GrokCTAPicker() {
  const { projectId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const selectedConcept = state?.selectedConcept;
  const selectedOpening = state?.selectedOpening;
  // Legacy support: if selectedBody passed (old flow)
  const selectedBody = state?.selectedBody || state?.selectedOpening;
  const selectedVideoStyle = state?.selectedVideoStyle;
  const business = state?.business;
  const businessAnalysis = state?.businessAnalysis;

  const [ctaOptions, setCtaOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingBrief, setGeneratingBrief] = useState(false);
  const [error, setError] = useState(null);
  const [selectingIdx, setSelectingIdx] = useState(null);
  const initialLoadStartedRef = useRef(false);
  const requestInFlightRef = useRef(false);

  // Guard
  useEffect(() => {
    if (!selectedConcept || !business) {
      navigate(`/project/${projectId}/grok-concepts`);
      return;
    }
    if (!initialLoadStartedRef.current) {
      initialLoadStartedRef.current = true;
      loadCTAOptions();
    }
  }, []);

  const loadCTAOptions = async () => {
    if (requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("grokBriefiFlow", {
        action: "generateCTAOptions",
        business,
        selectedConcept,
        selectedOpening: selectedOpening || selectedBody,
      });

      if (res.data?.error) {
        setError(res.data.error);
        return;
      }

      setCtaOptions(res.data?.cta_options || []);
    } catch (err) {
      console.error("Failed to load CTA options:", err);
      setError("משהו נתקע בדרך. נסו שוב בעוד רגע.");
    } finally {
      requestInFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleSelectCTA = async (ctaOption, idx) => {
    if (generatingBrief) return;
    setSelectingIdx(idx);
    setGeneratingBrief(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("grokBriefiFlow", {
        action: "assembleFinalBrief",
        project_id: projectId,
        business,
        selectedConcept,
        selectedOpening: selectedOpening || selectedBody,
        selectedCTA: ctaOption,
        selectedVideoStyle,
      });

      if (res.data?.error) {
        setError(res.data.error);
        setSelectingIdx(null);
        return;
      }

      const briefId = res.data?.brief_id;
      const finalBrief = res.data?.final_brief;

      navigate(`/project/${projectId}/final-brief`, {
        state: {
          briefId,
          finalBrief,
          selectedConcept,
          selectedOpening: selectedOpening || selectedBody,
          selectedCTA: ctaOption,
          selectedVideoStyle,
        },
      });
    } catch (err) {
      console.error("Failed to assemble final brief:", err);
      setError("משהו נתקע בדרך. נסו שוב בעוד רגע.");
      setSelectingIdx(null);
    } finally {
      setGeneratingBrief(false);
    }
  };

  if (loading || generatingBrief) {
    return (
      <div className="bg-background flex items-center justify-center" style={{ minHeight: "100dvh" }} dir="rtl">
        <BriefiLoader
          messages={
            generatingBrief
              ? ["בונים את הסרטון.", "עוד רגע יש לך משהו שאפשר לצלם."]
              : ["מסדרים סיום.", "לא כל סרטון צריך לצעוק ‘תקנו עכשיו’."]
          }
        />
      </div>
    );
  }

  return (
    <div className="bg-background" style={{ minHeight: "100dvh" }} dir="rtl">
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center cursor-pointer">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <p className="text-xs font-bold text-foreground truncate">
              {selectedOpening?.opening_line ? `"${selectedOpening.opening_line.slice(0, 35)}..."` : "פתיחה נבחרה"}
            </p>
            <p className="text-[10px] text-muted-foreground">בחרו קריאה לפעולה</p>
          </div>
        </div>
        <div className="mt-2">
          <BriefiStepper currentStep={3} />
        </div>
      </div>

      <div className="briefi-page-container space-y-3">
        <div>
          <h1 className="text-xl font-black text-foreground">בחרו קריאה לפעולה</h1>
          <p className="text-sm text-muted-foreground mt-0.5">כל קריאה מותאמת לסרטון הזה ולעסק. בחרו אחת ונסיים.</p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700 font-medium">{error}</p>
              <button onClick={loadCTAOptions} className="text-xs text-red-600 underline mt-1">נסו שוב</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {ctaOptions.map((option, idx) => {
            const colorClass = CTA_TYPE_COLORS[option.cta_type] || "bg-muted text-muted-foreground border-border";
            const isSelecting = selectingIdx === idx;

            return (
              <div key={idx} className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${colorClass}`}>
                    {option.cta_type}
                  </span>
                </div>

                <p className="text-base font-black text-foreground leading-snug">"{option.cta_text}"</p>

                {option.why_it_fits && (
                  <p className="text-xs text-muted-foreground">{option.why_it_fits}</p>
                )}

                <button
                  onClick={() => handleSelectCTA(option, idx)}
                  disabled={selectingIdx !== null}
                  className="briefi-btn-primary w-full"
                >
                  <Sparkles className="w-4 h-4" />
                  {isSelecting ? "בונים סרטון..." : "בחרו קריאה זו"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
