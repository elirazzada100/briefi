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
  const location = useLocation();
  const { state } = location;
  const navigate = useNavigate();
  const { project, loading: guardLoading } = useProjectGuard(projectId);

  // Receive video style from VideoStylePicker
  const selectedVideoStyle = state?.selectedVideoStyle;
  const businessFromState = state?.business;
  const businessAnalysis = state?.businessAnalysis;
  const specialFocus = state?.specialFocus;

  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectingIdx, setSelectingIdx] = useState(null);
  const [resolvedAnalysis, setResolvedAnalysis] = useState(businessAnalysis);
  const [timingDebug, setTimingDebug] = useState(null);
  const initialLoadStartedRef = useRef(false);
  const requestInFlightRef = useRef(false);
  const debugTimingEnabled =
    new URLSearchParams(location.search).get("debugTiming") === "1" ||
    (typeof window !== "undefined" && window.localStorage?.getItem("briefiDebugTiming") === "true");

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
    const frontendConceptStart = performance.now();
    let frontendClassificationMs = 0;
    let frontendGenerateConceptsMs = 0;
    try {
      const proj = project;
      const business = businessFromState || {
        business_name: proj?.client_name || "",
        business_description: proj?.raw_notes || "",
        main_goal: proj?.main_goal || "",
      };

      // Ensure industry classification is available (required for strict ConceptBank retrieval)
      // classifyBusinessCategory now returns industry_order + industry_name directly
      let resolvedAnalysis = businessAnalysis;
      const classificationSkipped =
        selectedVideoStyle === "טרנדי" || (resolvedAnalysis?.industry_order && resolvedAnalysis?.industry_name);

      if (!classificationSkipped) {
        const frontendClassificationStart = performance.now();
        const classifyRes = await base44.functions.invoke("classifyBusinessCategory", {
          businessDescription: `${business.business_name}. ${business.business_description}. ${business.main_goal}`,
        });
        frontendClassificationMs = Math.round(performance.now() - frontendClassificationStart);
        const clf = classifyRes.data;
        resolvedAnalysis = {
          ...(resolvedAnalysis || {}),
          industry_order: clf?.industry_order || null,
          industry_name: clf?.industry_name || clf?.category_name_he || "",
          confidence: clf?.confidence || 0,
          category_id: clf?.category_id || "",
        };
        setResolvedAnalysis(resolvedAnalysis);
      }

      const frontendGenerateConceptsStart = performance.now();
      const res = await base44.functions.invoke("grokBriefiFlow", {
        action: "generateConcepts",
        business,
        selectedVideoStyle,
        project_id: projectId,
        businessAnalysis: resolvedAnalysis,
        specialFocus,
      });
      frontendGenerateConceptsMs = Math.round(performance.now() - frontendGenerateConceptsStart);

      if (res.data?.error) {
        setError(res.data.error);
        return;
      }

      const nextTimingDebug = {
        selected_style: selectedVideoStyle,
        is_ugc: selectedVideoStyle === "ugc",
        is_trendy: selectedVideoStyle === "טרנדי",
        classification_used: !classificationSkipped,
        classification_skipped: classificationSkipped,
        frontend_concept_total_ms: Math.round(performance.now() - frontendConceptStart),
        frontend_classification_ms: frontendClassificationMs,
        frontend_generate_concepts_ms: frontendGenerateConceptsMs,
        backend_total_ms: res.data?._debug?.total_ms ?? null,
        conceptbank_retrieval_ms: res.data?._debug?.conceptbank_retrieval_ms ?? null,
        openai_selection_ms: res.data?._debug?.openai_selection_ms ?? null,
        candidate_count: res.data?._debug?.candidate_count ?? null,
        source_batch: res.data?._debug?.source_batch ?? null,
      };
      setTimingDebug(nextTimingDebug);

      if (import.meta.env.DEV) {
        console.debug("[concept-timing]", {
          ...nextTimingDebug,
          backend_debug: {
            total_ms: nextTimingDebug.backend_total_ms,
            conceptbank_retrieval_ms: nextTimingDebug.conceptbank_retrieval_ms,
            openai_selection_ms: nextTimingDebug.openai_selection_ms,
            candidate_count: nextTimingDebug.candidate_count,
            source_batch: nextTimingDebug.source_batch,
            is_ugc: nextTimingDebug.is_ugc,
            is_trendy: nextTimingDebug.is_trendy,
          },
        });
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
        ...(state || {}),
        selectedConcept: concept,
        selectedVideoStyle,
        business,
        businessAnalysis: resolvedAnalysis,
        specialFocus,
      },
    });
  };

  const handleCopyTiming = async () => {
    if (!timingDebug || !navigator?.clipboard?.writeText) return;

    const timingReport = [
      `${timingDebug.is_ugc ? "UGC" : "Regular"} Timing Report`,
      `selected_style: ${timingDebug.selected_style || ""}`,
      `is_ugc: ${String(timingDebug.is_ugc)}`,
      `is_trendy: ${String(timingDebug.is_trendy)}`,
      `classification: ${timingDebug.classification_skipped ? "skipped" : "used"}`,
      `frontend_total: ${timingDebug.frontend_concept_total_ms ?? ""}`,
      `classification_ms: ${timingDebug.frontend_classification_ms ?? ""}`,
      `generate_concepts_ms: ${timingDebug.frontend_generate_concepts_ms ?? ""}`,
      `backend_total: ${timingDebug.backend_total_ms ?? ""}`,
      `conceptbank_retrieval: ${timingDebug.conceptbank_retrieval_ms ?? ""}`,
      `openai_selection: ${timingDebug.openai_selection_ms ?? ""}`,
      `candidate_count: ${timingDebug.candidate_count ?? ""}`,
      `source_batch: ${timingDebug.source_batch || ""}`,
    ].join("\n");

    await navigator.clipboard.writeText(timingReport);
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
          <BriefiStepper currentStep={2} />
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

        {debugTimingEnabled && timingDebug && (
          <div className="bg-muted/40 border border-border/60 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-foreground">תזמון קונספטים</h2>
              <button onClick={handleCopyTiming} className="briefi-btn-secondary !h-8 !px-3 text-xs">
                העתק תזמון
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-foreground/80">
              <span>selected_style</span>
              <span className="text-left">{timingDebug.selected_style}</span>
              <span>is_ugc</span>
              <span className="text-left">{String(timingDebug.is_ugc)}</span>
              <span>is_trendy</span>
              <span className="text-left">{String(timingDebug.is_trendy)}</span>
              <span>classification</span>
              <span className="text-left">{timingDebug.classification_skipped ? "skipped" : "used"}</span>
              <span>frontend_total_ms</span>
              <span className="text-left">{timingDebug.frontend_concept_total_ms}</span>
              <span>frontend_classification_ms</span>
              <span className="text-left">{timingDebug.frontend_classification_ms}</span>
              <span>frontend_generate_concepts_ms</span>
              <span className="text-left">{timingDebug.frontend_generate_concepts_ms}</span>
              <span>backend_total_ms</span>
              <span className="text-left">{timingDebug.backend_total_ms ?? ""}</span>
              <span>conceptbank_retrieval_ms</span>
              <span className="text-left">{timingDebug.conceptbank_retrieval_ms ?? ""}</span>
              <span>openai_selection_ms</span>
              <span className="text-left">{timingDebug.openai_selection_ms ?? ""}</span>
              <span>candidate_count</span>
              <span className="text-left">{timingDebug.candidate_count ?? ""}</span>
              <span>source_batch</span>
              <span className="text-left break-all">{timingDebug.source_batch || ""}</span>
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
