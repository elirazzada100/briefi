import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Pencil, Check, X, Plus, RefreshCw } from "lucide-react";
import LoadingState from "@/components/briefi/LoadingState";
import { useProjectGuard } from "@/hooks/useProjectGuard";

const scriptFormatLabels = {
  voiceover: "ווייסאובר",
  person_to_camera: "דיבור למצלמה",
  dialogue: "דיאלוג",
  text_only: "טקסט בלבד",
  acted_scene: "סצנה מיוצגת",
};

const SMILEY_OPTIONS = [
  { score: 5, emoji: "😍", label: "מעולה" },
  { score: 4, emoji: "🙂", label: "טוב" },
  { score: 3, emoji: "😐", label: "סביר" },
  { score: 2, emoji: "🙁", label: "לא מספיק" },
  { score: 1, emoji: "😞", label: "לא טוב" },
];

function EditableField({ label, value, onSave, prominent = false, hint = null }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");

  useEffect(() => { setVal(value || ""); }, [value]);

  const handleSave = () => { onSave(val); setEditing(false); };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className={`text-xs font-bold ${prominent ? "text-primary" : "text-muted-foreground"}`}>{label}</p>
        {!editing && (
          <button onClick={() => setEditing(true)} className="w-6 h-6 rounded-md bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors">
            <Pencil className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={val}
            onChange={e => setVal(e.target.value)}
            autoFocus
            rows={prominent ? 6 : 3}
            className="w-full p-3 rounded-xl border border-primary/30 bg-primary/5 text-foreground text-sm font-medium focus:outline-none resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold">
              <Check className="w-3 h-3" /> שמור
            </button>
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs font-bold">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className={`font-medium leading-relaxed text-foreground ${prominent ? "briefi-script-text text-base" : "text-sm"}`} style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word", wordBreak: "normal" }}>{val || "—"}</p>
          {hint && <p className="text-xs text-muted-foreground mt-1 italic">{hint}</p>}
        </>
      )}
    </div>
  );
}

export default function FinalBrief() {
  const { projectId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const briefId = state?.briefId;
  const finalBriefFromState = state?.finalBrief;
  const selectedConcept = state?.selectedConcept;
  const selectedOpening = state?.selectedOpening || state?.selectedBody;
  const selectedCTA = state?.selectedCTA;
  const selectedVideoStyle = state?.selectedVideoStyle;

  const [brief, setBrief] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Smiley feedback
  const [feedbackScore, setFeedbackScore] = useState(null);
  const [feedbackFreeText, setFeedbackFreeText] = useState("");
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [improving, setImproving] = useState(false);

  const { project, loading } = useProjectGuard(projectId);

  useEffect(() => {
    if (finalBriefFromState) {
      setBrief({ adapted_brief: finalBriefFromState, id: briefId });
    } else if (briefId) {
      base44.functions.invoke("secureFinalBrief", {
        action: "getOwnedVideoBrief",
        project_id: projectId,
        brief_id: briefId,
      }).then((response) => {
        if (response.data?.brief) setBrief(response.data.brief);
      });
    }
  }, [briefId, finalBriefFromState]);

  // Guard
  useEffect(() => {
    if (!loading && !briefId && !finalBriefFromState) {
      navigate(`/project/${projectId}/grok-concepts`);
    }
  }, [loading, briefId, finalBriefFromState]);

  const resolveField = (field) => {
    const adapted = brief?.adapted_brief || {};
    const legacy = brief?.final_brief || {};
    const mapping = {
      brief_title: adapted.brief_title || legacy.brief_title || brief?.brief_title || "",
      video_concept: adapted.video_concept || legacy.video_concept || brief?.video_concept || selectedConcept?.short_description || "",
      hook: adapted.hook || legacy.hook || brief?.hook || selectedOpening?.opening_line || "",
      script_text: adapted.script_text || legacy.script_text || brief?.script_text || "",
      shot_structure: adapted.shot_structure || legacy.shot_structure || brief?.shot_structure || [],
      cta: adapted.cta || legacy.cta || brief?.cta || selectedCTA?.cta_text || "",
      caption_suggestion: adapted.caption_suggestion || legacy.caption_suggestion || brief?.caption_suggestion || "",
      production_notes: adapted.production_notes || legacy.production_notes || brief?.production_notes || "",
      visual_must_haves: adapted.visual_must_haves || brief?.visual_must_haves || [],
      why_it_works: adapted.why_it_works || "",
      script_format: adapted.script_format || legacy.script_format || brief?.script_format || "",
      text_overlays: adapted.text_overlays || legacy.text_overlays || [],
    };
    return mapping[field] ?? "";
  };

  const updateBriefField = async (field, value) => {
    const updated = { ...(brief?.adapted_brief || {}), [field]: value };
    setBrief(prev => ({ ...prev, adapted_brief: updated }));
    if (briefId) {
      const fieldUpdates = { adapted_brief: updated };
      if (field === "brief_title") fieldUpdates.brief_title = value;
      if (field === "video_concept") fieldUpdates.video_concept = value;
      if (field === "hook") fieldUpdates.hook = value;
      if (field === "script_text") fieldUpdates.script_text = value;
      if (field === "shot_structure") fieldUpdates.shot_structure = value;
      if (field === "cta") fieldUpdates.cta = value;
      if (field === "caption_suggestion") fieldUpdates.caption_suggestion = value;
      if (field === "production_notes") fieldUpdates.production_notes = value;
      if (field === "visual_must_haves") fieldUpdates.visual_must_haves = value;
      if (field === "risk_notes") fieldUpdates.risk_notes = value;
      if (field === "script_format") fieldUpdates.script_format = value;
      if (field === "text_overlays") fieldUpdates.text_overlays = value;

      await base44.functions.invoke("secureFinalBrief", {
        action: "updateOwnedVideoBrief",
        project_id: projectId,
        brief_id: briefId,
        updates: fieldUpdates,
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    if (briefId) {
      await base44.functions.invoke("secureFinalBrief", {
        action: "updateOwnedVideoBrief",
        project_id: projectId,
        brief_id: briefId,
        updates: { status: "approved" },
      });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveFeedback = async () => {
    if (!feedbackScore) return;
    await base44.functions.invoke("secureVideoFeedback", {
      action: "submitVideoFeedback",
      project_id: projectId,
      video_brief_id: briefId,
      rating: feedbackScore,
      comment: feedbackFreeText,
    });
    setFeedbackSaved(true);
  };

  const handleImproveWithFeedback = async () => {
    if (!feedbackFreeText) return;
    setImproving(true);
    await base44.functions.invoke("secureVideoFeedback", {
      action: "submitVideoFeedback",
      project_id: projectId,
      video_brief_id: briefId,
      rating: feedbackScore || 3,
      comment: feedbackFreeText,
    });

    const currentBrief = brief?.adapted_brief || brief?.final_brief || {};
    const response = await base44.functions.invoke("grokBriefiFlow", {
      action: "improveFinalBrief",
      project_id: projectId,
      original_brief: currentBrief,
      feedback_text: feedbackFreeText,
      client_name: project?.client_name || "",
      main_goal: project?.main_goal || "",
    });

    const improved = response.data?.final_brief;
    if (improved) {
      setBrief(prev => ({ ...prev, adapted_brief: improved }));
      if (briefId) {
        await base44.functions.invoke("secureFinalBrief", {
          action: "updateOwnedVideoBrief",
          project_id: projectId,
          brief_id: briefId,
          updates: {
            adapted_brief: improved,
            brief_title: improved.brief_title || "",
            video_concept: improved.video_concept || "",
            hook: improved.hook || "",
            script_text: improved.script_text || "",
            shot_structure: improved.shot_structure || [],
            cta: improved.cta || "",
            caption_suggestion: improved.caption_suggestion || improved.video_description || "",
            production_notes: improved.production_notes || "",
            visual_must_haves: improved.visual_must_haves || [],
            risk_notes: improved.why_it_works || "",
            script_format: improved.script_format || "",
            text_overlays: improved.text_overlays || [],
          },
        });
      }
    }
    setImproving(false);
    setFeedbackScore(null);
    setFeedbackFreeText("");
    setFeedbackSaved(false);
  };

  if (loading || !brief) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <LoadingState message={["בונים את הסרטון.", "עוד רגע יש לך משהו שאפשר לצלם."]} />
      </div>
    );
  }

  if (improving) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <LoadingState message={["בונים את הסרטון.", "עוד רגע יש לך משהו שאפשר לצלם."]} />
      </div>
    );
  }

  const scriptLabel = scriptFormatLabels[resolveField("script_format")] || "";
  const shotStructure = resolveField("shot_structure");
  const textOverlays = resolveField("text_overlays");
  const visualMustHaves = resolveField("visual_must_haves");

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/project/${projectId}/brief-pack`)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-black text-foreground">הסרטון מוכן ✓</h1>
            {selectedVideoStyle && <p className="text-[10px] text-muted-foreground">{selectedVideoStyle}</p>}
          </div>
        </div>
      </div>

      <div className="briefi-page-container space-y-4">
        <div className="bg-white rounded-2xl border border-border p-4 space-y-5" style={{ width: "100%", boxSizing: "border-box", overflowWrap: "break-word" }}>

          {/* 1. שם הסרטון */}
          <EditableField label="שם הסרטון" value={resolveField("brief_title")} onSave={v => updateBriefField("brief_title", v)} />

          {/* 2. רעיון הסרטון */}
          <div className="border-t border-muted pt-4">
            <EditableField label="רעיון הסרטון" value={resolveField("video_concept")} onSave={v => updateBriefField("video_concept", v)} />
          </div>

          {/* 3. פתיחה */}
          <div className="border-t border-muted pt-4">
            <EditableField label="פתיחה / משפט ראשון" value={resolveField("hook")} onSave={v => updateBriefField("hook", v)} />
          </div>

          {/* 4. מה אומרים — prominent */}
          <div className="border-t border-muted pt-4">
            <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(124,58,237,0.05)" }}>
              {scriptLabel && (
                <span className="inline-block text-xs text-primary font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(124,58,237,0.10)" }}>{scriptLabel}</span>
              )}
              <EditableField
                label="מה אומרים / ווייסאובר / דיאלוג"
                value={resolveField("script_text")}
                onSave={v => updateBriefField("script_text", v)}
                prominent
                hint="זה הטקסט שאפשר להקריא, להגיד למצלמה או להשתמש בו כבסיס לצילום."
              />
            </div>
          </div>

          {/* 5. רצף שוטים */}
          {shotStructure?.length > 0 && (
            <div className="border-t border-muted pt-4 space-y-2">
              <p className="text-xs font-bold text-muted-foreground">רצף שוטים</p>
              {shotStructure.map((step, i) => (
                <div key={i} className="flex items-start gap-3 bg-muted/30 rounded-xl p-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">{step.step || i + 1}</div>
                  <div className="flex-1 space-y-0.5">
                    {step.visual && <p className="text-sm text-foreground font-medium" style={{ overflowWrap: "break-word" }}>{step.visual}</p>}
                    {step.spoken_or_overlay_text && (
                      <p className="text-xs text-muted-foreground italic" style={{ overflowWrap: "break-word" }}>"{step.spoken_or_overlay_text}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 6. טקסטים למסך */}
          {textOverlays?.length > 0 && (
            <div className="border-t border-muted pt-4 space-y-1.5">
              <p className="text-xs font-bold text-muted-foreground">טקסטים למסך</p>
              {textOverlays.map((text, i) => (
                <p key={i} className="text-sm text-foreground font-medium bg-muted/50 rounded-lg px-3 py-1.5" style={{ overflowWrap: "break-word" }}>"{text}"</p>
              ))}
            </div>
          )}

          {/* 7. CTA */}
          <div className="border-t border-muted pt-4">
            <EditableField label="קריאה לפעולה" value={resolveField("cta")} onSave={v => updateBriefField("cta", v)} />
          </div>

          {/* 8. תיאור הסרטון (was קפישן) */}
          <div className="border-t border-muted pt-4">
            <EditableField label="תיאור הסרטון" value={resolveField("caption_suggestion")} onSave={v => updateBriefField("caption_suggestion", v)} />
          </div>

          {/* 9. מה חייבים לצלם */}
          {visualMustHaves?.length > 0 && (
            <div className="border-t border-muted pt-4 space-y-1.5">
              <p className="text-xs font-bold text-muted-foreground">מה חייבים לצלם</p>
              {visualMustHaves.map((item, i) => (
                <p key={i} className="text-sm text-foreground font-medium bg-muted/40 rounded-lg px-3 py-1.5">• {item}</p>
              ))}
            </div>
          )}

          {/* 10. הערות צילום */}
          {resolveField("production_notes") && (
            <div className="border-t border-muted pt-4">
              <EditableField label="הערות צילום" value={resolveField("production_notes")} onSave={v => updateBriefField("production_notes", v)} />
            </div>
          )}

          {/* 11. למה זה עובד */}
          {resolveField("why_it_works") && (
            <div className="border-t border-muted pt-4">
              <EditableField label="למה זה עובד" value={resolveField("why_it_works")} onSave={v => updateBriefField("why_it_works", v)} />
            </div>
          )}
        </div>

        {/* Smiley Feedback */}
        <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
          <div>
            <p className="text-sm font-black text-foreground">איך יצא הסרטון?</p>
            <p className="text-xs text-muted-foreground mt-0.5">זה עוזר לבריפי ללמוד ולהשתפר.</p>
          </div>

          {feedbackSaved ? (
            <div className="text-xs text-green-600 font-bold">תודה. בריפי ילמד מזה ✓</div>
          ) : (
            <>
              <div className="flex justify-between gap-1">
                {SMILEY_OPTIONS.map((opt) => (
                  <button
                    key={opt.score}
                    onClick={() => setFeedbackScore(feedbackScore === opt.score ? null : opt.score)}
                    className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all ${
                      feedbackScore === opt.score
                        ? "border-primary bg-primary/5"
                        : "border-border bg-white hover:border-primary/30"
                    }`}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <span className="text-[9px] font-semibold text-muted-foreground leading-none">{opt.label}</span>
                  </button>
                ))}
              </div>

              <div>
                <textarea
                  value={feedbackFreeText}
                  onChange={e => setFeedbackFreeText(e.target.value)}
                  placeholder="משהו הרגיש לא מדויק? כתבו לנו."
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-border bg-muted/20 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSaveFeedback}
                  disabled={!feedbackScore}
                  className="flex-1 h-9 rounded-xl font-bold text-xs text-foreground border border-border bg-muted/30 hover:bg-muted/60 transition-all disabled:opacity-40"
                >
                  שלחו ביקורת
                </button>
                {feedbackFreeText && (
                  <button
                    onClick={handleImproveWithFeedback}
                    className="flex-1 h-9 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    style={{ background: "linear-gradient(135deg, #23C98B 0%, #249BFF 100%)" }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    שפרו לפי הפידבק
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={handleSave}
            className={`briefi-btn-primary w-full ${saved ? "!bg-green-500 !shadow-green-200" : ""}`}
          >
            {saved ? "✓ הסרטון נשמר!" : saving ? "שומר..." : "שמרו סרטון זה"}
          </button>
          <button
            onClick={() => navigate(`/project/${projectId}/video-style`)}
            className="briefi-btn-secondary w-full"
          >
            <Plus className="w-4 h-4" />
            בנו את הסרטון הבא
          </button>
          <button
            onClick={() => navigate(`/project/${projectId}/brief-pack`)}
            className="briefi-btn-ghost w-full"
          >
            חזרה לסרטונים
          </button>
        </div>
      </div>
    </div>
  );
}
