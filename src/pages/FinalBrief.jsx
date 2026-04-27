import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Pencil, Check, X, FileText, Plus, RefreshCw, ThumbsUp, ThumbsDown } from "lucide-react";
import LoadingState from "@/components/briefi/LoadingState";
import { useProjectGuard } from "@/hooks/useProjectGuard";

const riskColors = {
  "נמוך": "text-green-600 bg-green-50 border-green-200",
  "בינוני": "text-yellow-600 bg-yellow-50 border-yellow-200",
  "גבוה": "text-red-500 bg-red-50 border-red-200",
};

const scriptFormatLabels = {
  "voiceover": "ווייסאובר",
  "person_to_camera": "דיבור למצלמה",
  "dialogue": "דיאלוג",
  "text_only": "טקסט בלבד",
};

const FEEDBACK_TAGS = [
  "מעולה",
  "סבבה",
  "לא מספיק ברור",
  "מוזר / לא ישראלי",
  "תיאורטי מדי",
  "לא פרקטי לצילום",
  "לא מצחיק",
  "לא מתאים לעסק",
  "הוק חלש",
  "גוף הסרטון לא ברור",
  "אין פאנץ׳",
  "אין מספיק מה לצלם",
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
            className="w-full p-3 rounded-xl border border-primary/30 bg-primary/5 text-briefi-navy text-sm font-medium focus:outline-none resize-none"
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
  const briefId = state?.briefId;
  const wasImproved = state?.wasImproved || false;
  const navigate = useNavigate();
  const [brief, setBrief] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Feedback state
  const [mainFeedback, setMainFeedback] = useState(null);
  const [specificFeedback, setSpecificFeedback] = useState([]);
  const [freeTextNegative, setFreeTextNegative] = useState("");
  const [freeTextPositive, setFreeTextPositive] = useState("");
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [improving, setImproving] = useState(false);

  // Ownership guard
  const { project, loading } = useProjectGuard(projectId);

  useEffect(() => {
    if (!briefId) return;
    base44.entities.VideoBrief.filter({ id: briefId }).then(r => setBrief(r[0]));
  }, [briefId]);

  const updateBriefField = async (field, value) => {
    const updatedFinalBrief = { ...(brief?.final_brief || {}), [field]: value };
    setBrief(prev => ({ ...prev, final_brief: updatedFinalBrief }));
    await base44.entities.VideoBrief.update(briefId, { final_brief: updatedFinalBrief });
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.VideoBrief.update(briefId, { status: "approved" });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleSpecificFeedback = (item) => {
    setSpecificFeedback(prev =>
      prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
    );
  };

  const handleSaveFeedback = async () => {
    if (!mainFeedback && specificFeedback.length === 0 && !freeTextNegative && !freeTextPositive) return;
    await base44.entities.UserBriefFeedback.create({
      project_id: projectId,
      video_brief_id: briefId,
      rating_label: mainFeedback,
      selected_feedback_tags: specificFeedback,
      free_text_negative: freeTextNegative,
      free_text_positive: freeTextPositive,
      category: brief?.category || "",
    });
    setFeedbackSaved(true);
  };

  const handleImproveWithFeedback = async () => {
    if (!mainFeedback && specificFeedback.length === 0 && !freeTextNegative) return;
    setImproving(true);

    // Save feedback with rewrite flag
    await base44.entities.UserBriefFeedback.create({
      project_id: projectId,
      video_brief_id: briefId,
      rating_label: mainFeedback,
      selected_feedback_tags: specificFeedback,
      free_text_negative: freeTextNegative,
      free_text_positive: freeTextPositive,
      category: brief?.category || "",
    });

    const response = await base44.functions.invoke("briefiAI", {
      action: "improveFinalBrief",
      project_id: projectId,
      video_brief_id: briefId,
      original_brief: brief?.final_brief,
      quality_check: { issues: specificFeedback, fix_suggestions: [] },
      client_name: project?.client_name || "",
      main_goal: project?.main_goal || "",
      selected_category: brief?.category || "",
      selected_concept: {},
      creative_dna: project?.creative_dna || {},
      feedback_tags: [mainFeedback, ...specificFeedback].filter(Boolean),
    });

    const improved = response.data?.final_brief;
    if (improved) {
      setBrief(prev => ({ ...prev, final_brief: improved }));
      await base44.entities.VideoBrief.update(briefId, { final_brief: improved });
    }
    setImproving(false);
    setMainFeedback(null);
    setSpecificFeedback([]);
    setFeedbackSaved(false);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl"><LoadingState message="טוען את הבריף..." /></div>;
  if (improving) return <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl"><LoadingState message="משפרים לפי הפידבק..." /></div>;

  const fb = brief?.final_brief || {};
  const riskClass = riskColors[fb.client_risk_level] || riskColors["בינוני"];
  const scriptLabel = scriptFormatLabels[fb.script_format] || fb.script_format || "";

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/project/${projectId}/brief-pack`)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-black text-foreground">הבריף מוכן</h1>
              {fb.client_risk_level && (
                <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${riskClass}`}>
                  {fb.client_risk_level}
                </span>
              )}
              {wasImproved && (
                <span className="text-xs px-2 py-0.5 rounded-full border font-bold text-green-600 bg-green-50 border-green-200">
                  ✓ בדיקת איכות בוצעה
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">סרטון #{brief?.video_number} · {brief?.category}</p>
          </div>
        </div>
      </div>

      <div className="briefi-page-container space-y-4">
        <div className="bg-white rounded-2xl border border-border p-4 space-y-5" style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box", overflowWrap: "break-word" }}>

          {/* 1. שם הסרטון */}
          <EditableField label="שם הסרטון" value={fb.brief_title} onSave={v => updateBriefField("brief_title", v)} />

          {/* 2. קונספט */}
          <div className="border-t border-muted pt-4">
            <EditableField label="קונספט לסרטון" value={fb.video_concept || fb.main_idea} onSave={v => updateBriefField("video_concept", v)} />
          </div>

          {/* 3. הוק */}
          <div className="border-t border-muted pt-4">
            <EditableField label="הוק" value={fb.hook} onSave={v => updateBriefField("hook", v)} />
          </div>

          {/* 4. טקסט / ווייסאובר — prominent */}
          <div className="border-t border-muted pt-4">
            <div className="rounded-2xl p-4 space-y-2" style={{ background: "rgba(124,58,237,0.05)" }}>
              {scriptLabel && (
                <span className="inline-block text-xs text-primary font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(124,58,237,0.10)" }}>{scriptLabel}</span>
              )}
              <EditableField
                label="טקסט / ווייסאובר"
                value={fb.script_text}
                onSave={v => updateBriefField("script_text", v)}
                prominent
                hint="זה הטקסט שאפשר להקריא, להגיד למצלמה או להשתמש בו כבסיס לצילום."
              />
            </div>
          </div>

          {/* 5. מבנה צילום */}
          {(fb.shot_structure || fb.video_structure)?.length > 0 && (
            <div className="border-t border-muted pt-4 space-y-2">
              <p className="text-xs font-bold text-muted-foreground">מבנה צילום</p>
              {(fb.shot_structure || fb.video_structure).map((step, i) => (
                <div key={i} className="flex items-start gap-3 bg-muted/30 rounded-xl p-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">{step.step || i + 1}</div>
                  <div className="flex-1 space-y-0.5">
                    {step.visual && <p className="text-sm text-foreground font-medium" style={{ overflowWrap: "break-word" }}>{step.visual}</p>}
                    {step.spoken_or_overlay_text && (
                      <p className="text-xs text-muted-foreground italic" style={{ overflowWrap: "break-word" }}>"{step.spoken_or_overlay_text}"</p>
                    )}
                    {step.description && <p className="text-sm text-foreground font-medium" style={{ overflowWrap: "break-word" }}>{step.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 6. טקסטים למסך */}
          {(fb.text_overlays || []).length > 0 && (
            <div className="border-t border-muted pt-4 space-y-1.5">
              <p className="text-xs font-bold text-muted-foreground">טקסטים למסך</p>
              {fb.text_overlays.map((text, i) => (
                <p key={i} className="text-sm text-foreground font-medium bg-muted/50 rounded-lg px-3 py-1.5" style={{ overflowWrap: "break-word" }}>"{text}"</p>
              ))}
            </div>
          )}

          {/* 7. קריאה לפעולה */}
          <div className="border-t border-muted pt-4">
            <EditableField label="קריאה לפעולה" value={fb.cta} onSave={v => updateBriefField("cta", v)} />
          </div>

          {/* 8. כיתוב לפוסט */}
          <div className="border-t border-muted pt-4">
            <EditableField label="כיתוב לפוסט" value={fb.caption_suggestion} onSave={v => updateBriefField("caption_suggestion", v)} />
          </div>

          {/* 9. הערות צילום */}
          <div className="border-t border-muted pt-4">
            <EditableField label="הערות צילום" value={fb.production_notes} onSave={v => updateBriefField("production_notes", v)} />
          </div>

          {/* 10. עדיפות לצילום */}
          {(fb.shooting_time_priority || fb.shooting_time_reason) && (
            <div className="border-t border-muted pt-4 space-y-1.5">
              <p className="text-xs font-bold text-muted-foreground">עדיפות לצילום</p>
              {fb.shooting_time_priority && (
                <p className="text-sm font-bold text-foreground">{fb.shooting_time_priority}</p>
              )}
              {fb.shooting_time_reason && (
                <p className="text-sm text-muted-foreground">{fb.shooting_time_reason}</p>
              )}
            </div>
          )}
        </div>

        {/* Feedback Section */}
        <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
          <div>
            <p className="text-sm font-black text-foreground">איך יצא הבריף?</p>
            <p className="text-xs text-muted-foreground mt-0.5">סמנו מה עבד ומה לא. זה באמת מלמד את בריפי.</p>
          </div>

          {feedbackSaved ? (
            <div className="text-xs text-green-600 font-bold">תודה. בריפי ילמד מזה ✓</div>
          ) : (
            <>
              {/* Feedback tags */}
              <div className="flex flex-wrap gap-1.5">
                {FEEDBACK_TAGS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => {
                      if (opt === "מעולה" || opt === "סבבה") {
                        setMainFeedback(mainFeedback === opt ? null : opt);
                      } else {
                        toggleSpecificFeedback(opt);
                      }
                    }}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all font-medium ${
                      (mainFeedback === opt || specificFeedback.includes(opt))
                        ? "bg-primary/10 text-primary border-primary/30"
                        : "bg-muted/30 text-muted-foreground border-border hover:border-primary/20"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {/* Free text */}
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-1">מה לא עבד?</p>
                  <textarea
                    value={freeTextNegative}
                    onChange={e => setFreeTextNegative(e.target.value)}
                    placeholder="למשל: אין דמות, לא ברור מה לצלם, זה נשמע אמריקאי, ההוק חלש..."
                    rows={2}
                    className="w-full p-2.5 rounded-xl border border-border bg-muted/20 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-1">מה כן עבד?</p>
                  <textarea
                    value={freeTextPositive}
                    onChange={e => setFreeTextPositive(e.target.value)}
                    placeholder="למשל: משפט טוב, סיטואציה טובה, הוק חזק, רעיון שאפשר לצלם..."
                    rows={2}
                    className="w-full p-2.5 rounded-xl border border-border bg-muted/20 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveFeedback}
                  className="flex-1 h-9 rounded-xl font-bold text-xs text-foreground border border-border bg-muted/30 hover:bg-muted/60 transition-all"
                >
                  שלחו ביקורת
                </button>
                {(specificFeedback.length > 0 || freeTextNegative) && (
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
            {saved ? "✓ הבריף נשמר!" : saving ? "שומר..." : "שמור בריף"}
          </button>

          <button
            onClick={() => navigate(`/project/${projectId}/category`)}
            className="briefi-btn-secondary w-full"
          >
            <Plus className="w-4 h-4" />
            בנו את הסרטון הבא
          </button>

          <button
            onClick={() => navigate(`/project/${projectId}/brief-pack`)}
            className="briefi-btn-ghost w-full"
          >
            <FileText className="w-4 h-4" />
            למסך הבריפים
          </button>
        </div>
      </div>
    </div>
  );
}