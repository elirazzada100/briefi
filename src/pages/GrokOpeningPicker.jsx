import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Sparkles, AlertCircle } from "lucide-react";
import BriefiLoader from "@/components/shared/BriefiLoader";
import BriefiStepper from "@/components/briefi/BriefiStepper";

export default function GrokOpeningPicker() {
  const { projectId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const selectedConcept = state?.selectedConcept;
  const selectedVideoStyle = state?.selectedVideoStyle;
  const business = state?.business;
  const businessAnalysis = state?.businessAnalysis;

  const [openingOptions, setOpeningOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectingIdx, setSelectingIdx] = useState(null);
  const initialLoadStartedRef = useRef(false);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    if (!selectedConcept || !business) {
      navigate(`/project/${projectId}/grok-concepts`);
      return;
    }
    if (!initialLoadStartedRef.current) {
      initialLoadStartedRef.current = true;
      loadOpeningOptions();
    }
  }, []);

  const loadOpeningOptions = async () => {
    if (requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("grokBriefiFlow", {
        action: "generateOpeningOptions",
        business,
        selectedConcept,
        selectedVideoStyle,
        businessAnalysis,
      });

      if (res.data?.error) {
        setError(res.data.error);
        return;
      }

      setOpeningOptions(res.data?.opening_options || []);
    } catch (err) {
      console.error("Failed to load opening options:", err);
      setError("משהו נתקע בדרך. נסו שוב בעוד רגע.");
    } finally {
      requestInFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleSelectOpening = (option, idx) => {
    setSelectingIdx(idx);
    navigate(`/project/${projectId}/grok-cta`, {
      state: {
        selectedConcept,
        selectedOpening: option,
        selectedVideoStyle,
        business,
        businessAnalysis,
      },
    });
  };

  if (loading) {
    return (
      <div className="bg-background flex items-center justify-center" style={{ minHeight: "100dvh" }} dir="rtl">
        <BriefiLoader messages={["כותבים פתיחה.", "משפט ראשון טוב עושה חצי עבודה."]} />
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
              {selectedConcept?.concept_title || selectedConcept?.concept_name || "קונספט נבחר"}
            </p>
            <p className="text-[10px] text-muted-foreground">בחרו פתיחה לסרטון</p>
          </div>
        </div>
        <div className="mt-2">
          <BriefiStepper currentStep={2} />
        </div>
      </div>

      <div className="briefi-page-container space-y-3">
        <div>
          <h1 className="text-xl font-black text-foreground">בחרו פתיחה לסרטון</h1>
          <p className="text-sm text-muted-foreground mt-0.5">המשפט הראשון שמכניס את הצופה פנימה.</p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700 font-medium">{error}</p>
              <button onClick={loadOpeningOptions} className="text-xs text-red-600 underline mt-1">נסו שוב</button>
            </div>
          </div>
        )}

        {openingOptions.length === 0 && !error ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">לא הצלחנו לייצר פתיחות.</p>
            <button onClick={loadOpeningOptions} className="briefi-btn-secondary mt-4 mx-auto">נסו שוב</button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {openingOptions.map((option, idx) => {
              const isSelecting = selectingIdx === idx;
              return (
                <div key={idx} className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 space-y-2.5">
                  <p className="text-base font-black text-foreground leading-snug">
                    "{option.opening_line}"
                  </p>
                  {option.why_it_fits && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{option.why_it_fits}</p>
                  )}
                  {option.mechanic_tag && (
                    <span className="inline-block text-[10px] font-semibold px-2.5 py-1 rounded-full bg-primary/8 text-primary border border-primary/15">
                      {option.mechanic_tag}
                    </span>
                  )}
                  <button
                    onClick={() => handleSelectOpening(option, idx)}
                    disabled={selectingIdx !== null}
                    className="briefi-btn-primary w-full"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isSelecting ? "ממשיכים..." : "בחרו פתיחה זו"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
