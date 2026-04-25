import { useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight } from "lucide-react";
import LoadingState from "@/components/briefi/LoadingState";
import ErrorState from "@/components/briefi/ErrorState";

const ctaTypeColors = {
  "ישיר": { bg: "rgba(255,122,47,0.08)", border: "rgba(255,122,47,0.3)", text: "#FF7A2F" },
  "רך": { bg: "rgba(35,201,139,0.08)", border: "rgba(35,201,139,0.3)", text: "#23C98B" },
  "שמירה / שיתוף": { bg: "rgba(36,155,255,0.08)", border: "rgba(36,155,255,0.3)", text: "#249BFF" },
  "פנייה / הודעה": { bg: "rgba(242,81,157,0.08)", border: "rgba(242,81,157,0.3)", text: "#F2519D" },
};

const FINAL_BRIEF_PROMPT = `You are Briefi, an Israeli social media brief-building assistant.

Assemble a final client-ready video brief based on the user's selections.

Client: {{client_name}}
Goal: {{main_goal}}
Creative DNA: {{creative_dna}}
Selected category: {{selected_category}}
Selected hook: {{selected_hook}}
Selected body: {{selected_body}}
Selected CTA: {{selected_cta}}

Return JSON only (no markdown, no code blocks):
{
  "brief_title": "",
  "goal": "",
  "category": "",
  "hook": "",
  "main_idea": "",
  "video_structure": [
    {"step": 1, "description": ""},
    {"step": 2, "description": ""},
    {"step": 3, "description": ""}
  ],
  "text_overlays": ["", "", ""],
  "cta": "",
  "production_notes": "",
  "client_risk_level": "",
  "caption_suggestion": ""
}

Rules:
- Hebrew only.
- Make the brief clean and professional.
- Ready to send to a client after light editing.
- Keep it short and useful.`;

export default function CTAPicker() {
  const { projectId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [ctas] = useState(state?.ctas || []);
  const [category] = useState(state?.category || "");
  const [selectedHook] = useState(state?.selectedHook || {});
  const [selectedBody] = useState(state?.selectedBody || {});
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);

  const handleSelect = async (cta) => {
    setGenerating(true);
    setError(false);

    const proj = await base44.entities.Project.filter({ id: projectId }).then(r => r[0]);
    const dnaStr = JSON.stringify(proj?.creative_dna || {});

    const prompt = FINAL_BRIEF_PROMPT
      .replace("{{client_name}}", proj?.client_name || "")
      .replace("{{main_goal}}", proj?.main_goal || "")
      .replace("{{creative_dna}}", dnaStr)
      .replace("{{selected_category}}", category)
      .replace("{{selected_hook}}", JSON.stringify(selectedHook))
      .replace("{{selected_body}}", JSON.stringify(selectedBody))
      .replace("{{selected_cta}}", JSON.stringify(cta));

    const finalBrief = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          brief_title: { type: "string" },
          goal: { type: "string" },
          category: { type: "string" },
          hook: { type: "string" },
          main_idea: { type: "string" },
          video_structure: { type: "array", items: { type: "object", properties: { step: { type: "number" }, description: { type: "string" } } } },
          text_overlays: { type: "array", items: { type: "string" } },
          cta: { type: "string" },
          production_notes: { type: "string" },
          client_risk_level: { type: "string" },
          caption_suggestion: { type: "string" }
        }
      }
    });

    // Get existing briefs count for this project
    const existingBriefs = await base44.entities.VideoBrief.filter({ project_id: projectId });
    const videoNumber = (existingBriefs.length || 0) + 1;

    const savedBrief = await base44.entities.VideoBrief.create({
      project_id: projectId,
      video_number: videoNumber,
      category,
      selected_hook: selectedHook,
      selected_body: selectedBody,
      selected_cta: cta,
      final_brief: finalBrief,
      status: "ready"
    });

    // Update project count
    await base44.entities.Project.update(projectId, {
      completed_briefs_count: videoNumber,
      status: videoNumber >= 8 ? "ready_to_export" : "in_progress"
    });

    setGenerating(false);
    navigate(`/final-brief/${projectId}/${savedBrief.id}`);
  };

  if (generating) return <div className="min-h-screen bg-briefi-bg flex items-center justify-center" dir="rtl"><LoadingState message="מרכיבים את הבריף הסופי..." /></div>;
  if (error) return <div className="min-h-screen bg-briefi-bg flex items-center justify-center" dir="rtl"><ErrorState onRetry={() => setError(false)} /></div>;

  return (
    <div className="min-h-screen bg-briefi-bg" dir="rtl">
      <div className="bg-white border-b border-border px-5 pt-safe pt-4 pb-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-briefi-secondary" />
          </button>
          <div>
            <h1 className="text-xl font-black text-briefi-navy">איך הסרטון נגמר?</h1>
            <p className="text-xs text-briefi-muted">בחרו קריאה לפעולה שמתאימה למטרה.</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-5 space-y-4">
        {/* Context pills */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-3 space-y-1">
          <p className="text-xs font-bold text-primary">ההוק שבחרתם</p>
          <p className="text-sm font-bold text-briefi-navy">"{selectedHook?.hook_text}"</p>
          <p className="text-xs text-briefi-muted mt-1">{selectedBody?.body_title}</p>
        </div>

        <div className="space-y-3">
          {ctas.map((cta, idx) => {
            const style = ctaTypeColors[cta.cta_type] || ctaTypeColors["ישיר"];
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border overflow-hidden"
                style={{ borderColor: style.border }}
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

                  <p className="text-briefi-navy font-black text-base leading-snug">"{cta.cta_text}"</p>

                  <p className="text-sm text-briefi-secondary">{cta.why_it_fits}</p>

                  <button
                    onClick={() => handleSelect(cta)}
                    className="w-full h-12 rounded-xl font-bold text-sm text-white transition-all active:scale-95"
                    style={{ background: `linear-gradient(135deg, ${style.text} 0%, #8B3DFF 100%)` }}
                  >
                    בחרו CTA ✓
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