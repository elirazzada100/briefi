import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, RefreshCw, Sparkles } from "lucide-react";
import LoadingState from "@/components/briefi/LoadingState";
import ErrorState from "@/components/briefi/ErrorState";
import StepProgress from "@/components/shared/StepProgress";
import { useProjectGuard } from "@/hooks/useProjectGuard";

// risk removed — idea_tags used instead

const REWRITE_ACTIONS = ["יותר קצר", "יותר ישראלי", "פחות קרינג׳", "יותר מצחיק"];

export default function HookPicker() {
  const { projectId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [hooks, setHooks] = useState(state?.hooks || []);
  const [category] = useState(state?.category || "");
  const [selectedConcept] = useState(state?.selectedConcept || {});
  const [rewritingIdx, setRewritingIdx] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

  const { project: projectData } = useProjectGuard(projectId);

  const handleSelect = async (hook) => {
    setGenerating(true);
    setError(false);
    const proj = projectData;
    await base44.entities.UserChoice.create({
      project_id: projectId,
      choice_type: "hook",
      selected_value: hook,
      rejected_values: hooks.filter(h => h !== hook),
      selected_category: category,
    });
    const response = await base44.functions.invoke("briefiAI", {
      action: "generateBodyOptions",
      project_id: projectId,
      client_name: proj?.client_name || "",
      main_goal: proj?.main_goal || "",
      creative_dna: proj?.creative_dna || {},
      selected_category: category,
      selected_concept: selectedConcept,
      selected_hook: hook,
    });
    setGenerating(false);
    navigate(`/project/${projectId}/body`, {
      state: { bodyOptions: response.data?.body_options || [], category, selectedHook: hook, selectedConcept }
    });
  };

  const handleRewrite = async (idx, action) => {
    setRewritingIdx(idx);
    const proj = projectData;
    const hook = hooks[idx];
    const response = await base44.functions.invoke("briefiAI", {
      action: "rewriteOption",
      project_id: projectId,
      original_text: hook.hook_text,
      rewrite_action: action,
      business_context: proj?.raw_notes || "",
      selected_category: category,
    });
    const newHooks = [...hooks];
    newHooks[idx] = { ...hook, hook_text: response.data?.rewritten_text || hook.hook_text };
    setHooks(newHooks);
    setRewritingIdx(null);
  };

  if (generating) return <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl"><LoadingState message="עוד רגע זה מוכן" /></div>;
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
          <StepProgress currentStep={2} />
        </div>
      </div>

      <div className="briefi-page-container space-y-4">
        <div>
          <h1 className="text-xl font-black text-foreground">בחרו הוק לפתיחה</h1>
          <p className="text-sm text-muted-foreground mt-0.5">המשפט הראשון שגורם לאנשים לעצור.</p>
        </div>

        <div className="space-y-3">
          {hooks.map((hook, idx) => {
            const isRewriting = rewritingIdx === idx;
            const whyText = hook.why_it_works_short || hook.why_it_works || "";

            return (
              <div key={idx} className="bg-white rounded-2xl border border-border/60 overflow-hidden shadow-sm transition-all hover:shadow-md">
                <div className="p-4 space-y-2.5">
                  {/* Hook title (no risk badge) */}
                  {hook.hook_title && (
                    <p className="text-[11px] text-muted-foreground font-semibold">{hook.hook_title}</p>
                  )}

                  {/* Hook text — large and readable */}
                  <p className="text-lg font-black text-foreground leading-snug">"{hook.hook_text}"</p>

                  {/* One-liner reason */}
                  {whyText && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{whyText}</p>
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
                    onClick={() => handleSelect(hook)}
                    disabled={isRewriting}
                    className="briefi-btn-primary w-full"
                  >
                    <Sparkles className="w-4 h-4" />
                    בחרו את ההוק הזה
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
