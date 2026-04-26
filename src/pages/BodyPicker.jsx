import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, ChevronDown, ChevronUp, RefreshCw, Sparkles } from "lucide-react";
import LoadingState from "@/components/briefi/LoadingState";
import ErrorState from "@/components/briefi/ErrorState";
import StepProgress from "@/components/shared/StepProgress";

const REWRITE_ACTIONS = ["פשוט יותר", "מצחיק יותר", "יותר לקוח-מאשר", "יותר טרנדי"];

const formatLabels = {
  "voiceover": "ווייסאובר",
  "person_to_camera": "דיבור למצלמה",
  "dialogue": "דיאלוג",
  "text_only": "טקסט בלבד",
};

export default function BodyPicker() {
  const { projectId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [bodyOptions, setBodyOptions] = useState(state?.bodyOptions || []);
  const [category] = useState(state?.category || "");
  const [selectedHook] = useState(state?.selectedHook || {});
  const [selectedConcept] = useState(state?.selectedConcept || {});
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [rewritingIdx, setRewritingIdx] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

  const handleSelect = async (body) => {
    setGenerating(true);
    setError(false);
    const proj = await base44.entities.Project.filter({ id: projectId }).then(r => r[0]);
    await base44.entities.UserChoice.create({
      project_id: projectId,
      choice_type: "body",
      selected_value: body,
      rejected_values: bodyOptions.filter(b => b !== body),
      selected_category: category,
    });
    const response = await base44.functions.invoke("briefiAI", {
      action: "generateCTAOptions",
      project_id: projectId,
      client_name: proj?.client_name || "",
      main_goal: proj?.main_goal || "",
      creative_dna: proj?.creative_dna || {},
      selected_category: category,
      selected_hook: selectedHook,
      selected_body: body,
    });
    setGenerating(false);
    navigate(`/project/${projectId}/cta`, {
      state: { ctas: response.data?.ctas || [], category, selectedHook, selectedBody: body, selectedConcept }
    });
  };

  const handleRewrite = async (idx, action) => {
    setRewritingIdx(idx);
    const proj = await base44.entities.Project.filter({ id: projectId }).then(r => r[0]);
    const body = bodyOptions[idx];
    const response = await base44.functions.invoke("briefiAI", {
      action: "rewriteOption",
      project_id: projectId,
      original_text: body.concept_summary,
      rewrite_action: action,
      business_context: proj?.raw_notes || "",
      selected_category: category,
    });
    const updated = [...bodyOptions];
    updated[idx] = { ...body, concept_summary: response.data?.rewritten_text || body.concept_summary };
    setBodyOptions(updated);
    setRewritingIdx(null);
  };

  if (generating) return <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl"><LoadingState message="מייצרים CTA מתאים..." /></div>;
  if (error) return <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl"><ErrorState onRetry={() => setError(false)} /></div>;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
            {category}
          </span>
        </div>
        <div className="mt-1">
          <StepProgress currentStep={4} />
        </div>
      </div>

      <div className="briefi-page-container space-y-4">
        <div>
          <h1 className="text-xl font-black text-foreground">בחרו מבנה לסרטון</h1>
          <p className="text-sm text-muted-foreground mt-0.5">בחרו מבנה שיתאים להוק וללקוח.</p>
        </div>

        {/* Hook preview */}
        <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}>
          <p className="text-[11px] font-bold text-primary mb-1">ההוק שבחרתם</p>
          <p className="text-sm font-bold text-foreground">"{selectedHook?.hook_text}"</p>
        </div>

        <div className="space-y-3">
          {bodyOptions.map((body, idx) => {
            const isExpanded = expandedIdx === idx;
            const isRewriting = rewritingIdx === idx;
            const fmtLabel = formatLabels[body.script_format];

            return (
              <div key={idx} className="bg-white rounded-2xl border border-border/60 overflow-hidden shadow-sm transition-all hover:shadow-md">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-foreground text-sm">{body.body_title}</h3>
                      {fmtLabel && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {fmtLabel}
                        </span>
                      )}
                    </div>
                    <button onClick={() => setExpandedIdx(isExpanded ? null : idx)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">{body.concept_summary}</p>

                  {isExpanded && (
                    <div className="space-y-3 pt-2 border-t border-muted animate-fade-in">
                      {body.shot_flow?.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold text-muted-foreground mb-2 uppercase tracking-wide">זרימת הצילומים</p>
                          <div className="space-y-1.5">
                            {body.shot_flow.map((shot, i) => (
                              <div key={i} className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                                <p className="text-sm text-muted-foreground">{shot}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {body.text_overlays?.length > 0 && (
                        <div>
                          <p className="text-[11px] font-bold text-muted-foreground mb-1.5 uppercase tracking-wide">טקסטים למסך</p>
                          <div className="space-y-1">
                            {body.text_overlays.map((text, i) => (
                              <p key={i} className="text-sm text-foreground font-medium bg-muted/50 rounded-xl px-3 py-1.5">"{text}"</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {body.production_notes && (
                        <div>
                          <p className="text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wide">הערות צילום</p>
                          <p className="text-sm text-muted-foreground">{body.production_notes}</p>
                        </div>
                      )}
                      {body.why_this_structure_works && (
                        <div>
                          <p className="text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wide">למה המבנה הזה עובד</p>
                          <p className="text-sm text-muted-foreground">{body.why_this_structure_works}</p>
                        </div>
                      )}
                    </div>
                  )}

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
                    onClick={() => handleSelect(body)}
                    disabled={isRewriting}
                    className="briefi-btn-primary w-full"
                  >
                    <Sparkles className="w-4 h-4" />
                    בחרו את המבנה הזה
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