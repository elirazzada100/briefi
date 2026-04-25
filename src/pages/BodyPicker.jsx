import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import LoadingState from "@/components/briefi/LoadingState";
import ErrorState from "@/components/briefi/ErrorState";

const REWRITE_ACTIONS = ["פשוט יותר", "מצחיק יותר", "יותר לקוח-מאשר", "יותר טרנדי"];

const CTA_PROMPT = `You are Briefi, an Israeli social media brief-building assistant.

Generate 4 CTA options for the selected short-form video.

Client: {{client_name}}
Goal: {{main_goal}}
Creative DNA: {{creative_dna}}
Selected category: {{selected_category}}
Selected hook: {{selected_hook}}
Selected body: {{selected_body}}

Return JSON only (no markdown, no code blocks):
{
  "ctas": [
    {"cta_type": "ישיר", "cta_text": "", "why_it_fits": ""},
    {"cta_type": "רך", "cta_text": "", "why_it_fits": ""},
    {"cta_type": "שמירה / שיתוף", "cta_text": "", "why_it_fits": ""},
    {"cta_type": "פנייה / הודעה", "cta_text": "", "why_it_fits": ""}
  ]
}

Rules:
- Hebrew only.
- CTA must match the main goal.
- Clear CTAs are allowed.
- Avoid cringe.`;

export default function BodyPicker() {
  const { projectId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [bodyOptions, setBodyOptions] = useState(state?.bodyOptions || []);
  const [category, setCategory] = useState(state?.category || "");
  const [selectedHook, setSelectedHook] = useState(state?.selectedHook || {});
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [rewritingIdx, setRewritingIdx] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

  const handleSelect = async (body) => {
    setGenerating(true);
    setError(false);

    const proj = await base44.entities.Project.filter({ id: projectId }).then(r => r[0]);
    const dnaStr = JSON.stringify(proj?.creative_dna || {});

    const prompt = CTA_PROMPT
      .replace("{{client_name}}", proj?.client_name || "")
      .replace("{{main_goal}}", proj?.main_goal || "")
      .replace("{{creative_dna}}", dnaStr)
      .replace("{{selected_category}}", category)
      .replace("{{selected_hook}}", JSON.stringify(selectedHook))
      .replace("{{selected_body}}", JSON.stringify(body));

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          ctas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                cta_type: { type: "string" },
                cta_text: { type: "string" },
                why_it_fits: { type: "string" }
              }
            }
          }
        }
      }
    });

    setGenerating(false);
    navigate(`/cta-picker/${projectId}`, {
      state: { ctas: result.ctas, category, selectedHook, selectedBody: body }
    });
  };

  const handleRewrite = async (idx, action) => {
    setRewritingIdx(idx);
    const proj = await base44.entities.Project.filter({ id: projectId }).then(r => r[0]);
    const body = bodyOptions[idx];

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Rewrite this video body structure based on the requested change.

Original: ${JSON.stringify(body)}
Requested change: ${action}
Business context: ${proj?.raw_notes || ""}
Category: ${category}

Return JSON only:
{
  "rewritten_text": "",
  "what_changed": ""
}

Rules: Hebrew only. Keep the strategic idea.`,
      response_json_schema: {
        type: "object",
        properties: {
          rewritten_text: { type: "string" },
          what_changed: { type: "string" }
        }
      }
    });

    const updated = [...bodyOptions];
    updated[idx] = { ...body, concept_summary: result.rewritten_text };
    setBodyOptions(updated);
    setRewritingIdx(null);
  };

  if (generating) return <div className="min-h-screen bg-briefi-bg flex items-center justify-center" dir="rtl"><LoadingState message="מייצרים CTA מתאים..." /></div>;
  if (error) return <div className="min-h-screen bg-briefi-bg flex items-center justify-center" dir="rtl"><ErrorState onRetry={() => setError(false)} /></div>;

  return (
    <div className="min-h-screen bg-briefi-bg" dir="rtl">
      <div className="bg-white border-b border-border px-5 pt-safe pt-4 pb-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-briefi-secondary" />
          </button>
          <div>
            <h1 className="text-xl font-black text-briefi-navy">עכשיו בונים את הסרטון</h1>
            <p className="text-xs text-briefi-muted">בחרו מבנה שיתאים להוק וללקוח.</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-5 space-y-5">
        {/* Selected Hook Preview */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3">
          <p className="text-xs font-bold text-primary mb-1">ההוק שבחרתם</p>
          <p className="text-sm font-bold text-briefi-navy">"{selectedHook?.hook_text}"</p>
        </div>

        <div className="space-y-4">
          {bodyOptions.map((body, idx) => {
            const isExpanded = expandedIdx === idx;
            const isRewriting = rewritingIdx === idx;

            return (
              <div key={idx} className="bg-white rounded-2xl border border-border overflow-hidden">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-briefi-navy text-base">{body.body_title}</h3>
                    <button onClick={() => setExpandedIdx(isExpanded ? null : idx)} className="text-briefi-muted hover:text-briefi-navy transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  <p className="text-sm text-briefi-secondary">{body.concept_summary}</p>

                  {isExpanded && (
                    <div className="space-y-3 pt-2 border-t border-muted animate-fade-in">
                      {body.shot_flow?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-briefi-muted mb-2">זרימת הצילומים</p>
                          <div className="space-y-1.5">
                            {body.shot_flow.map((shot, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                                <p className="text-sm text-briefi-secondary">{shot}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {body.text_overlays?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-briefi-muted mb-2">טקסטים למסך</p>
                          <div className="space-y-1">
                            {body.text_overlays.map((text, i) => (
                              <p key={i} className="text-sm text-briefi-navy font-medium bg-muted/50 rounded-lg px-3 py-1.5">"{text}"</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {body.production_notes && (
                        <div>
                          <p className="text-xs font-bold text-briefi-muted mb-1">הערות צילום</p>
                          <p className="text-sm text-briefi-secondary">{body.production_notes}</p>
                        </div>
                      )}
                      {body.why_this_structure_works && (
                        <div>
                          <p className="text-xs font-bold text-briefi-muted mb-1">למה המבנה הזה עובד</p>
                          <p className="text-sm text-briefi-secondary">{body.why_this_structure_works}</p>
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
                    onClick={() => handleSelect(body)}
                    disabled={isRewriting}
                    className="w-full h-12 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #1E8BFF 0%, #8B3DFF 100%)" }}
                  >
                    בחרו את המבנה הזה ✓
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