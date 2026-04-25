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
  const [error, setError] = useState(false);

  const handleSelect = async (cta) => {
    setGenerating(true);
    setError(false);

    const proj = await base44.entities.Project.filter({ id: projectId }).then(r => r[0]);

    // Track user choice
    await base44.entities.UserChoice.create({
      project_id: projectId,
      choice_type: "cta",
      selected_value: cta,
      rejected_values: ctas.filter(c => c !== cta),
      selected_category: category,
    });

    // Assemble final brief via OpenAI backend
    const response = await base44.functions.invoke("briefiAI", {
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
    });

    const finalBrief = response.data?.final_brief;

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

    await base44.entities.Project.update(projectId, {
      completed_briefs_count: videoNumber,
      status: videoNumber >= 8 ? "ready_to_export" : "in_progress"
    });

    setGenerating(false);
    navigate(`/project/${projectId}/final-brief`, { state: { briefId: savedBrief.id } });
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