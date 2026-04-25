import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import LoadingState from "@/components/briefi/LoadingState";
import ErrorState from "@/components/briefi/ErrorState";

const riskColors = {
  "נמוך": { bg: "rgba(35,201,139,0.1)", text: "#23C98B", border: "rgba(35,201,139,0.3)" },
  "בינוני": { bg: "rgba(248,185,0,0.1)", text: "#C48E00", border: "rgba(248,185,0,0.3)" },
  "גבוה": { bg: "rgba(242,81,157,0.1)", text: "#F2519D", border: "rgba(242,81,157,0.3)" },
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

  if (generating) return (
    <div className="min-h-screen bg-briefi-bg flex items-center justify-center" dir="rtl">
      <LoadingState message="מייצרים הוקים לקונספט שבחרתם..." />
    </div>
  );
  if (error) return (
    <div className="min-h-screen bg-briefi-bg flex items-center justify-center" dir="rtl">
      <ErrorState onRetry={() => setError(false)} />
    </div>
  );

  return (
    <div className="min-h-screen bg-briefi-bg" dir="rtl">
      <div className="bg-white border-b border-border px-5 pt-safe pt-4 pb-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-briefi-secondary" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-briefi-navy">בחרו קונספט לסרטון</h1>
            <p className="text-xs text-briefi-muted">זה הרעיון של הסרטון. אחרי זה נבחר הוק, מבנה וטקסט.</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-5 space-y-5">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-white border border-border rounded-full text-xs font-medium text-briefi-secondary">
            קטגוריה: <span className="text-briefi-navy font-bold">{category}</span>
          </div>
        </div>

        <div className="space-y-4">
          {concepts.map((concept, idx) => {
            const riskStyle = riskColors[concept.risk_level] || riskColors["בינוני"];
            const isExpanded = expandedIdx === idx;
            const isRewriting = rewritingIdx === idx;

            return (
              <div key={idx} className="bg-white rounded-2xl border border-border overflow-hidden">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    {concept.risk_level && (
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: riskStyle.bg, color: riskStyle.text, border: `1px solid ${riskStyle.border}` }}
                      >
                        {concept.risk_level}
                      </span>
                    )}
                    {concept.tone && (
                      <span className="text-xs text-briefi-muted font-medium">{concept.tone}</span>
                    )}
                    <button
                      onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                      className="text-briefi-muted hover:text-briefi-navy transition-colors mr-auto"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  <div>
                    <h3 className="font-black text-briefi-navy text-base">{concept.concept_title}</h3>
                    <p className="text-sm text-briefi-secondary mt-1 leading-relaxed">{concept.concept_summary}</p>
                  </div>

                  {isExpanded && (
                    <div className="space-y-2 pt-2 border-t border-muted animate-fade-in">
                      {concept.visual_direction && (
                        <div>
                          <p className="text-xs font-bold text-briefi-muted mb-1">כיוון ויזואלי</p>
                          <p className="text-sm text-briefi-secondary">{concept.visual_direction}</p>
                        </div>
                      )}
                      {concept.why_it_works && (
                        <div>
                          <p className="text-xs font-bold text-briefi-muted mb-1">למה זה עובד</p>
                          <p className="text-sm text-briefi-secondary">{concept.why_it_works}</p>
                        </div>
                      )}
                    </div>
                  )}

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

                  <button
                    onClick={() => handleSelect(concept)}
                    disabled={isRewriting}
                    className="w-full h-12 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #1E8BFF 0%, #8B3DFF 100%)" }}
                  >
                    בחרו את הקונספט הזה ✓
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