import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Sparkles, AlertCircle } from "lucide-react";
import BriefiLoader from "@/components/shared/BriefiLoader";
import { useProjectGuard } from "@/hooks/useProjectGuard";
import BriefiStepper from "@/components/briefi/BriefiStepper";

// Remove leading number patterns like "57. " or "12. " and trailing dashes/spaces
function cleanConceptTitle(title) {
  if (!title) return title;
  return title
    .replace(/^\d+\.\s*/, "")   // remove leading "57. "
    .replace(/[-–—]+$/, "")      // remove trailing dashes
    .replace(/^[-–—]+/, "")      // remove leading dashes
    .trim();
}

export default function GrokConceptPicker() {
  const { projectId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { project, loading: guardLoading } = useProjectGuard(projectId);

  // Receive video style from VideoStylePicker
  const selectedVideoStyle = state?.selectedVideoStyle;
  const businessFromState = state?.business;
  const businessAnalysis = state?.businessAnalysis;

  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectingIdx, setSelectingIdx] = useState(null);
  const [resolvedAnalysis, setResolvedAnalysis] = useState(businessAnalysis);
  const initialLoadStartedRef = useRef(false);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    if (!selectedVideoStyle) {
      // No style selected — go back to style picker
      navigate(`/project/${projectId}/video-style`);
      return;
    }
    if ((project || businessFromState) && !initialLoadStartedRef.current) {
      initialLoadStartedRef.current = true;
      loadConcepts();
    }
  }, [project, selectedVideoStyle]);

  const loadConcepts = async () => {
    if (requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const proj = project;
      const business = businessFromState || {
        business_name: proj?.client_name || "",
        business_description: proj?.raw_notes || "",
        main_goal: proj?.main_goal || "",
      };

      // Classification is handled by the backend (OpenAI) — pass whatever we have,
      // backend will classify if industry_order is missing.
      const res = await base44.functions.invoke("grokBriefiFlow", {
        action: "generateConcepts",
        business,
        selectedVideoStyle,
        project_id: projectId,
        businessAnalysis: resolvedAnalysis,
      });

      if (res.data?.error) {
        setError(res.data.error);
        return;
      }

      setConcepts(res.data?.concepts || []);
    } catch (err) {
      console.error("Failed to load concepts:", err);
      setError("משהו נתקע בדרך. נסו שוב בעוד רגע.");
    } finally {
      requestInFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleSelectConcept = (concept, idx) => {
    setSelectingIdx(idx);

    const proj = project;
    const business = businessFromState || {
      business_name: proj?.client_name || "",
      business_description: proj?.raw_notes || "",
      main_goal: proj?.main_goal || "",
    };

    navigate(`/project/${projectId}/grok-opening`, {
      state: {
        selectedConcept: concept,
        selectedVideoStyle,
        business,
        businessAnalysis: resolvedAnalysis,
      },
    });
  };

  if (guardLoading || loading) {
    return (
      <div className="bg-background flex items-center justify-center" style={{ minHeight: "100dvh" }} dir="rtl">
        <BriefiLoader messages={["מסדרים רעיונות.", "בוחרים את אלה שיש להם סיכוי לעבוד באמת."]} />
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
            <p className="text-xs font-bold text-foreground">{project?.client_name || ""}</p>
            {selectedVideoStyle && (
              <p className="text-[10px] text-muted-foreground">{selectedVideoStyle}</p>
            )}
          </div>
        </div>
        <div className="mt-2">
          <BriefiStepper currentStep={1} />
        </div>
      </div>

      <div className="briefi-page-container space-y-3">
        <div>
          <h1 className="text-xl font-black text-foreground">בחרו קונספט לסרטון</h1>
          <p className="text-sm text-muted-foreground mt-0.5">4 כיוונים לסרטון "{selectedVideoStyle}". בחרו אחד כדי להמשיך.</p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700 font-medium">{error}</p>
              <button onClick={loadConcepts} className="text-xs text-red-600 underline mt-1">נסו שוב</button>
            </div>
          </div>
        )}

        {concepts.length === 0 && !error ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">לא הצלחנו לייצר קונספטים.</p>
            <button onClick={loadConcepts} className="briefi-btn-secondary mt-4 mx-auto">נסו שוב</button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {concepts.map((concept, idx) => {
              const rawName = concept.concept_title || concept.concept_name || `קונספט ${idx + 1}`;
              const name = cleanConceptTitle(rawName);
              const desc = concept.short_description || concept.core_situation || "";
              const tags = (concept.idea_tags || concept.tone_tags || []).filter(
                t => t && t !== concept.industry_name && t.length < 20
              );
              const isSelecting = selectingIdx === idx;

              return (
                <div key={idx} className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 space-y-2.5">
                  <h3 className="font-black text-foreground text-base leading-snug">{name}</h3>
                  {desc && <p className="text-sm text-foreground/80 leading-relaxed">{desc}</p>}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.slice(0, 3).map((tag, ti) => (
                        <span key={ti} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/15">{tag}</span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => handleSelectConcept(concept, idx)}
                    disabled={selectingIdx !== null}
                    className="briefi-btn-primary w-full"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isSelecting ? "ממשיכים..." : "בחרו קונספט זה"}
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