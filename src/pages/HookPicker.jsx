import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import ProgressSteps from "@/components/briefi/ProgressSteps";
import LoadingState from "@/components/briefi/LoadingState";
import ErrorState from "@/components/briefi/ErrorState";

const riskColors = {
  "בטוח ללקוח": { bg: "rgba(35,201,139,0.1)", text: "#23C98B", border: "rgba(35,201,139,0.3)" },
  "סושיאלי": { bg: "rgba(36,155,255,0.1)", text: "#249BFF", border: "rgba(36,155,255,0.3)" },
  "מצחיק / אנושי": { bg: "rgba(248,185,0,0.1)", text: "#C48E00", border: "rgba(248,185,0,0.3)" },
  "חד יותר": { bg: "rgba(242,81,157,0.1)", text: "#F2519D", border: "rgba(242,81,157,0.3)" },
};

const REWRITE_ACTIONS = ["יותר קצר", "יותר ישראלי", "פחות קרינג׳", "יותר מצחיק"];


export default function HookPicker() {
  const { projectId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [hooks, setHooks] = useState(state?.hooks || []);
  const [category, setCategory] = useState(state?.category || "");
  const [project] = useState(null);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [rewritingIdx, setRewritingIdx] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

  const [projectData, setProjectData] = useState(null);

  useState(() => {
    base44.entities.Project.filter({ id: projectId }).then(r => setProjectData(r[0]));
  }, [projectId]);

  const handleSelect = async (hook) => {
    setGenerating(true);
    setError(false);

    const proj = projectData || await base44.entities.Project.filter({ id: projectId }).then(r => r[0]);

    // Track user choice
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
      selected_hook: hook,
    });

    setGenerating(false);
    navigate(`/project/${projectId}/body`, {
      state: { bodyOptions: response.data?.body_options || [], category, selectedHook: hook }
    });
  };

  const handleRewrite = async (idx, action) => {
    setRewritingIdx(idx);
    const proj = projectData || await base44.entities.Project.filter({ id: projectId }).then(r => r[0]);
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

  if (generating) return <div className="min-h-screen bg-briefi-bg flex items-center justify-center" dir="rtl"><LoadingState message="בונים את מבנה הסרטון..." /></div>;
  if (error) return <div className="min-h-screen bg-briefi-bg flex items-center justify-center" dir="rtl"><ErrorState onRetry={() => setError(false)} /></div>;

  return (
    <div className="min-h-screen bg-briefi-bg" dir="rtl">
      <div className="bg-white border-b border-border px-5 pt-safe pt-4 pb-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button onClick={() => navigate(`/project/${projectId}/category`)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-briefi-secondary" />
          </button>
          <ProgressSteps currentStep={3} />
          <div className="w-9 h-9" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-5 space-y-5">
        <div>
          <h1 className="text-2xl font-black text-briefi-navy">בחרו הוק לפתיחה</h1>
          <p className="text-briefi-secondary text-sm mt-1">ההוק הוא המשפט הראשון שגורם לאנשים לעצור.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-white border border-border rounded-full text-xs font-medium text-briefi-secondary">
            קטגוריה: <span className="text-briefi-navy font-bold">{category}</span>
          </div>
        </div>

        <div className="space-y-4">
          {hooks.map((hook, idx) => {
            const riskStyle = riskColors[hook.risk_level] || riskColors["סושיאלי"];
            const isExpanded = expandedIdx === idx;
            const isRewriting = rewritingIdx === idx;

            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-border overflow-hidden transition-all"
              >
                <div className="p-4 space-y-3">
                  {/* Risk Badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ background: riskStyle.bg, color: riskStyle.text, border: `1px solid ${riskStyle.border}` }}
                    >
                      {hook.risk_level}
                    </span>
                    <button
                      onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                      className="text-briefi-muted hover:text-briefi-navy transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Hook Title & Text */}
                  <div>
                    <h3 className="font-bold text-briefi-navy text-base">{hook.hook_title}</h3>
                    <p className="text-briefi-navy text-lg font-black mt-1 leading-snug">"{hook.hook_text}"</p>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="space-y-2 pt-2 border-t border-muted animate-fade-in">
                      <div>
                        <p className="text-xs font-bold text-briefi-muted mb-1">למה זה עובד</p>
                        <p className="text-sm text-briefi-secondary">{hook.why_it_works}</p>
                      </div>
                      {hook.best_for && (
                        <div>
                          <p className="text-xs font-bold text-briefi-muted mb-1">הכי מתאים ל</p>
                          <p className="text-sm text-briefi-secondary">{hook.best_for}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rewrite Actions */}
                  {!isRewriting && (
                    <div className="flex flex-wrap gap-1.5">
                      {REWRITE_ACTIONS.map(action => (
                        <button
                          key={action}
                          onClick={() => handleRewrite(idx, action)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-muted text-briefi-secondary hover:bg-primary/10 hover:text-primary transition-colors font-medium"
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}

                  {isRewriting && (
                    <div className="flex items-center gap-2 text-xs text-briefi-muted">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      כותבים מחדש...
                    </div>
                  )}

                  {/* Select Button */}
                  <button
                    onClick={() => handleSelect(hook)}
                    disabled={isRewriting}
                    className="w-full h-12 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #1E8BFF 0%, #8B3DFF 100%)" }}
                  >
                    בחרו את זה ✓
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