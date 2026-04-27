import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight } from "lucide-react";
import LoadingState from "@/components/briefi/LoadingState";
import ErrorState from "@/components/briefi/ErrorState";
import StepProgress from "@/components/shared/StepProgress";
import { useProjectGuard } from "@/hooks/useProjectGuard";

const ctaTypeColors = {
  "ישיר": { bg: "rgba(255,122,47,0.08)", border: "rgba(255,122,47,0.3)", text: "#FF7A2F" },
  "רך": { bg: "rgba(35,201,139,0.08)", border: "rgba(35,201,139,0.3)", text: "#23C98B" },
  "שמירה / שיתוף": { bg: "rgba(36,155,255,0.08)", border: "rgba(36,155,255,0.3)", text: "#249BFF" },
  "פנייה / הודעה": { bg: "rgba(242,81,157,0.08)", border: "rgba(242,81,157,0.3)", text: "#F2519D" },
};

const LOADING_MESSAGES = [
  "מרכיבים את הבריף...",
  "בודקים שניתן לצלם מחר...",
  "בודקים שהסקריפט נשמע טבעי...",
  "משפרים אם צריך...",
];

export default function CTAPicker() {
  const { projectId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [ctas] = useState(state?.ctas || []);
  const [category] = useState(state?.category || "");
  const [selectedHook] = useState(state?.selectedHook || {});
  const [selectedBody] = useState(state?.selectedBody || {});
  const [selectedConcept] = useState(state?.selectedConcept || {});
  const [generating, setGenerating] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [error, setError] = useState(false);

  const { project: guardProject } = useProjectGuard(projectId);

  const handleSelect = async (cta) => {
    setGenerating(true);
    setError(false);

    const proj = guardProject;

    // Track user choice
    await base44.entities.UserChoice.create({
      project_id: projectId,
      choice_type: "cta",
      selected_value: cta,
      rejected_values: ctas.filter(c => c !== cta),
      selected_category: category,
    });

    // Step 1: Assemble final brief
    setLoadingMsg(LOADING_MESSAGES[0]);
    const existingBriefsForCtx = await base44.entities.VideoBrief.filter({ project_id: projectId });
    const existingCategories = existingBriefsForCtx.map(b => b.category).filter(Boolean);
    const videoNumber = (existingBriefsForCtx.length || 0) + 1;
    const briefResponse = await base44.functions.invoke("briefiAI", {
      action: "assembleFinalBrief",
      project_id: projectId,
      client_name: proj?.client_name || "",
      main_goal: proj?.main_goal || "",
      creative_dna: proj?.creative_dna || {},
      selected_category: category,
      selected_concept: selectedConcept,
      selected_hook: selectedHook,
      selected_body: selectedBody,
      selected_cta: cta,
      brief_video_count: proj?.brief_video_count || 8,
      current_video_number: videoNumber,
      existing_categories: existingCategories,
    });

    let finalBrief = briefResponse.data?.final_brief;

    // Step 2: Save initial brief to get an ID

    const savedBrief = await base44.entities.VideoBrief.create({
      project_id: projectId,
      video_number: videoNumber,
      category,
      selected_hook: selectedHook,
      selected_body: selectedBody,
      selected_cta: cta,
      final_brief: finalBrief,
      status: "draft"
    });

    // Step 3: Quality check
    setLoadingMsg(LOADING_MESSAGES[1]);
    const qcResponse = await base44.functions.invoke("briefiAI", {
      action: "checkBriefQuality",
      project_id: projectId,
      video_brief_id: savedBrief.id,
      client_name: proj?.client_name || "",
      main_goal: proj?.main_goal || "",
      selected_category: category,
      selected_concept: selectedConcept,
      final_brief: finalBrief,
    });

    const qualityCheck = qcResponse.data || {};

    // Step 4: Auto-improve if needed
    if (qualityCheck.needs_rewrite) {
      setLoadingMsg(LOADING_MESSAGES[3]);
      const improveResponse = await base44.functions.invoke("briefiAI", {
        action: "improveFinalBrief",
        project_id: projectId,
        video_brief_id: savedBrief.id,
        original_brief: finalBrief,
        quality_check: qualityCheck,
        client_name: proj?.client_name || "",
        main_goal: proj?.main_goal || "",
        selected_category: category,
        selected_concept: selectedConcept,
        creative_dna: proj?.creative_dna || {},
      });
      finalBrief = improveResponse.data?.final_brief || finalBrief;
    }

    // Step 5: Update saved brief with final version
    await base44.entities.VideoBrief.update(savedBrief.id, {
      final_brief: finalBrief,
      status: "ready"
    });

    await base44.entities.BriefQualityCheck.update
      ? null // entity has no standalone update from client, handled in backend
      : null;

    await base44.entities.Project.update(projectId, {
      completed_briefs_count: videoNumber,
      status: videoNumber >= 8 ? "ready_to_export" : "in_progress"
    });

    setGenerating(false);
    navigate(`/project/${projectId}/final-brief`, {
      state: { briefId: savedBrief.id, wasImproved: qualityCheck.needs_rewrite }
    });
  };

  if (generating) return (
    <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
      <LoadingState message={loadingMsg} />
    </div>
  );
  if (error) return (
    <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
      <ErrorState onRetry={() => setError(false)} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-base font-black text-foreground">איך הסרטון נגמר?</h1>
            <p className="text-xs text-muted-foreground">בחרו קריאה לפעולה שמתאימה למטרה.</p>
          </div>
        </div>
        <div className="mt-1">
          <StepProgress currentStep={4} />
        </div>
      </div>

      <div className="briefi-page-container space-y-4">
        <div className="rounded-2xl px-4 py-3 space-y-0.5" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}>
          <p className="text-[11px] font-bold text-primary">הקונספט שבחרתם</p>
          <p className="text-sm font-bold text-foreground">{selectedConcept?.concept_title || selectedHook?.hook_text || ""}</p>
          {selectedBody?.body_title && <p className="text-xs text-muted-foreground">{selectedBody.body_title}</p>}
        </div>

        <div className="space-y-3">
          {ctas.map((cta, idx) => {
            const style = ctaTypeColors[cta.cta_type] || ctaTypeColors["ישיר"];
            return (
              <div
              key={idx}
              className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: style.bg, color: style.text, border: `1px solid ${style.border}` }}
                    >
                      {cta.cta_type}
                    </span>
                  </div>

                  <p className="font-black text-base leading-snug text-foreground" style={{ overflowWrap: "break-word" }}>"{cta.cta_text}"</p>
                  {cta.why_it_fits && (
                    <p className="text-sm text-muted-foreground" style={{ overflowWrap: "break-word" }}>{cta.why_it_fits}</p>
                  )}

                  <button
                    onClick={() => handleSelect(cta)}
                    className="briefi-btn-primary w-full"
                  >
                    בחרו את ה-CTA הזה
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}