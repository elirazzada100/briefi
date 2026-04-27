import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, ChevronDown, ChevronUp, RefreshCw, Sparkles } from "lucide-react";
import LoadingState from "@/components/briefi/LoadingState";
import ErrorState from "@/components/briefi/ErrorState";
import StepProgress from "@/components/shared/StepProgress";
import { useProjectGuard } from "@/hooks/useProjectGuard";

// risk removed — idea_tags used instead

const sceneTypeLabels = {
  acted_scene: "סצנה מיוצגת",
  talking_head: "דיבור למצלמה",
  voiceover: "ווייסאובר",
  text_only: "טקסט בלבד",
  bts: "מאחורי הקלעים",
};

const REWRITE_ACTIONS = ["יותר פשוט", "יותר מצחיק", "יותר תדמיתי", "יותר לקוח-מאשר"];

export default function ConceptPicker() {
  const { projectId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [concepts, setConcepts] = useState(state?.concepts || []);
  const [category] = useState(state?.category || "");
  const [hookBankMode] = useState(state?.hookBankMode || false);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [rewritingIdx, setRewritingIdx] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

  const { project: guardProject } = useProjectGuard(projectId);

  const handleSelect = async (concept) => {
    setGenerating(true);
    setError(false);
    const proj = guardProject;
    await base44.entities.UserChoice.create({
      project_id: projectId,
      choice_type: "category",
      selected_value: concept,
      rejected_values: concepts.filter(c => c !== concept),
      selected_category: category,
    });

    if (hookBankMode) {
      // Hook already embedded — go directly to body generation
      const selectedHook = { hook_title: "הוק", hook_text: concept.hook_preview || "", why_it_works_short: "" };
      const response = await base44.functions.invoke("briefiAI", {
        action: "generateBodyOptions",
        project_id: projectId,
        client_name: proj?.client_name || "",
        main_goal: proj?.main_goal || "",
        creative_dna: proj?.creative_dna || {},
        selected_category: category,
        selected_concept: concept,
        selected_hook: selectedHook,
      });
      setGenerating(false);
      navigate(`/project/${projectId}/body`, {
        state: { bodyOptions: response.data?.body_options || [], category, selectedConcept: concept, selectedHook }
      });
    } else {
      // Classic mode — go to hook selection
      const response = await base44.functions.invoke("briefiAI", {
        action: "generateHooks",
        project_id: projectId,
        client_name: proj?.client_name || "",
        main_goal: proj?.main_goal || "",
        raw_notes: proj?.raw_notes || "",
        creative_dna: proj?.creative_dna || {},
        selected_category: category,
        selected_concept: concept,
      });
      setGenerating(false);
      navigate(`/project/${projectId}/hooks`, {
        state: { hooks: response.data?.hooks || [], category, selectedConcept: concept }
      });
    }
  };

  const handleRewrite = async (idx, action) => {
    setRewritingIdx(idx);
    const proj = guardProject;
    const concept = concepts[idx];
    const response = await base44.functions.invoke("briefiAI", {
      action: "rewriteOption",
      project_id: projectId,
      original_text: concept.short_description || concept.concept_summary || "",
      rewrite_action: action,
      business_context: proj?.raw_notes || "",
      selected_category: category,
    });
    const updated = [...concepts];
    updated[idx] = { ...concept, short_description: response.data?.rewritten_text || concept.short_description };
    setConcepts(updated);
    setRewritingIdx(null);
  };

  if (generating) return <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl"><LoadingState message="רגע, בונים לך כיוונים טובים..." /></div>;
  if (error) return <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl"><ErrorState onRetry={() => setError(false)} /></div>;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
              {category}
            </span>
          </div>
        </div>
        <div className="mt-1">
          <StepProgress currentStep={2} />
        </div>
      </div>

      <div className="briefi-page-container space-y-4">
        <div>
          <h1 className="text-xl font-black text-foreground">בחרו קונספט לסרטון</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {hookBankMode
              ? "כל קונספט כולל הוק מוכן. בחרו ונמשיך ישירות למבנה הסרטון."
              : "מה קורה בסרטון? בחרו רעיון ונמשיך לפרטים."
            }
          </p>
        </div>

        <div className="space-y-3">
          {concepts.map((concept, idx) => {
            const isExpanded = expandedIdx === idx;
            const isRewriting = rewritingIdx === idx;
            const displayText = concept.short_description || concept.concept_summary || "";
            const sceneLabel = sceneTypeLabels[concept.scene_type];
            const ideaTags = concept.idea_tags || concept.tags || [];
            const hasFullData = concept.full_scene_data && (concept.full_scene_data.what_happens || concept.full_scene_data.payoff);

            return (
              <div key={idx} className="bg-white rounded-2xl border border-border/60 overflow-hidden shadow-sm transition-all hover:shadow-md">
                <div className="p-4 space-y-2.5">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-black text-foreground text-base leading-snug flex-1">{concept.concept_title}</h3>
                    {hasFullData && (
                      <button onClick={() => setExpandedIdx(isExpanded ? null : idx)} className="text-muted-foreground hover:text-foreground transition-colors p-1 flex-shrink-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>

                  {/* Scene description */}
                  <p className="text-sm text-foreground/80 leading-relaxed">{displayText}</p>

                  {/* Hook preview */}
                  {concept.hook_preview && (
                    <div className="px-3 py-2 rounded-xl text-sm font-medium text-primary" style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.15)" }}>
                      <span className="text-[10px] font-bold text-primary/60 block mb-0.5">הוק</span>
                      "{concept.hook_preview}"
                    </div>
                  )}

                  {/* Idea tags */}
                  {(ideaTags.length > 0 || sceneLabel) && (
                    <div className="flex flex-wrap gap-1.5">
                      {sceneLabel && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{sceneLabel}</span>
                      )}
                      {ideaTags.map((tag, ti) => (
                        <span key={ti} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/15">{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* Expanded full scene data */}
                  {isExpanded && hasFullData && (
                    <div className="space-y-2 pt-2 border-t border-muted animate-fade-in">
                      {concept.full_scene_data.what_happens && (
                        <div>
                          <p className="text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wide">מה קורה בפועל</p>
                          <p className="text-sm text-muted-foreground leading-relaxed">{concept.full_scene_data.what_happens}</p>
                        </div>
                      )}
                      {concept.full_scene_data.visual_tension && (
                        <div>
                          <p className="text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wide">המתח הויזואלי</p>
                          <p className="text-sm text-muted-foreground">{concept.full_scene_data.visual_tension}</p>
                        </div>
                      )}
                      {concept.full_scene_data.payoff && (
                        <div>
                          <p className="text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wide">הפאנץ׳</p>
                          <p className="text-sm text-muted-foreground">{concept.full_scene_data.payoff}</p>
                        </div>
                      )}
                      {concept.why_it_works && (
                        <div>
                          <p className="text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wide">למה זה עובד</p>
                          <p className="text-sm text-muted-foreground">{concept.why_it_works}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rewrite actions */}
                  {isRewriting ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      כותבים מחדש...
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {REWRITE_ACTIONS.map(action => (
                        <button
                          key={action}
                          onClick={() => handleRewrite(idx, action)}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors font-medium"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => handleSelect(concept)}
                    disabled={isRewriting}
                    className="briefi-btn-primary w-full"
                  >
                    <Sparkles className="w-4 h-4" />
                    {hookBankMode ? "בחרו את הרעיון הזה" : "בחרו את הקונספט הזה"}
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