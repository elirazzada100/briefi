import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, ChevronDown, ChevronUp, RefreshCw, Sparkles } from "lucide-react";
import LoadingState from "@/components/briefi/LoadingState";
import ErrorState from "@/components/briefi/ErrorState";
import StepProgress from "@/components/shared/StepProgress";

const riskStyle = {
  "נמוך": { bg: "#D1FAE5", color: "#059669" },
  "בינוני": { bg: "#FEF3C7", color: "#D97706" },
  "גבוה": { bg: "#FCE7F3", color: "#DB2777" },
};

const REWRITE_ACTIONS = ["יותר פשוט", "יותר מצחיק", "יותר תדמיתי", "יותר לקוח-מאשר"];

export default function ConceptPicker() {
  const { projectId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [concepts, setConcepts] = useState(state?.concepts || []);
  const [category] = useState(state?.category || "");
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [rewritingIdx, setRewritingIdx] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

  const handleSelect = async (concept) => {
    setGenerating(true);
    setError(false);
    const proj = await base44.entities.Project.filter({ id: projectId }).then(r => r[0]);
    await base44.entities.UserChoice.create({
      project_id: projectId,
      choice_type: "category",
      selected_value: concept,
      rejected_values: concepts.filter(c => c !== concept),
      selected_category: category,
    });
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
  };

  const handleRewrite = async (idx, action) => {
    setRewritingIdx(idx);
    const proj = await base44.entities.Project.filter({ id: projectId }).then(r => r[0]);
    const concept = concepts[idx];
    const response = await base44.functions.invoke("briefiAI", {
      action: "rewriteOption",
      project_id: projectId,
      original_text: concept.concept_summary,
      rewrite_action: action,
      business_context: proj?.raw_notes || "",
      selected_category: category,
    });
    const updated = [...concepts];
    updated[idx] = { ...concept, concept_summary: response.data?.rewritten_text || concept.concept_summary };
    setConcepts(updated);
    setRewritingIdx(null);
  };

  if (generating) return <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl"><LoadingState message="מייצרים הוקים לקונספט..." /></div>;
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
          <p className="text-sm text-muted-foreground mt-0.5">הרעיון הכללי של הסרטון. אחרי זה ניכנס לפרטים.</p>
        </div>

        <div className="space-y-3">
          {concepts.map((concept, idx) => {
            const risk = riskStyle[concept.risk_level] || riskStyle["בינוני"];
            const isExpanded = expandedIdx === idx;
            const isRewriting = rewritingIdx === idx;

            return (
              <div key={idx} className="bg-white rounded-2xl border border-border/60 overflow-hidden shadow-sm transition-all hover:shadow-md">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {concept.risk_level && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: risk.bg, color: risk.color }}>
                          {concept.risk_level}
                        </span>
                      )}
                      {concept.tone && (
                        <span className="text-[11px] text-muted-foreground font-medium">{concept.tone}</span>
                      )}
                    </div>
                    <button onClick={() => setExpandedIdx(isExpanded ? null : idx)} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  <div>
                    <h3 className="font-black text-foreground text-base leading-snug">{concept.concept_title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{concept.concept_summary}</p>
                  </div>

                  {isExpanded && (
                    <div className="space-y-2 pt-2 border-t border-muted animate-fade-in">
                      {concept.visual_direction && (
                        <div>
                          <p className="text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wide">כיוון ויזואלי</p>
                          <p className="text-sm text-muted-foreground">{concept.visual_direction}</p>
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
                    בחרו את הקונספט הזה
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