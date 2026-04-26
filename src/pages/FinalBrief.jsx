import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Pencil, Check, X, FileText, Plus, RefreshCw, ThumbsUp, ThumbsDown } from "lucide-react";
import LoadingState from "@/components/briefi/LoadingState";

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

const SPECIFIC_FEEDBACK_OPTIONS = [
  "ההוק ארוך מדי",
  "הטקסט לא מדבר טבעי",
  "לא ברור מה לצלם",
  "יותר מכירתי",
  "יותר מצחיק",
  "יותר לקוח-מאשר",
];

function EditableField({ label, value, onSave, prominent = false, hint = null }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");

  useEffect(() => { setVal(value || ""); }, [value]);

  const handleSave = () => { onSave(val); setEditing(false); };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className={`text-xs font-bold ${prominent ? "text-primary" : "text-briefi-muted"}`}>{label}</p>
        {!editing && (
          <button onClick={() => setEditing(true)} className="w-6 h-6 rounded-md bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors">
            <Pencil className="w-3 h-3 text-briefi-muted" />
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
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 bg-muted text-briefi-secondary rounded-lg text-xs font-bold">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className={`text-sm text-briefi-navy font-medium leading-relaxed whitespace-pre-wrap ${prominent ? "text-base" : ""}`}>{val || "—"}</p>
          {hint && <p className="text-xs text-briefi-muted mt-1 italic">{hint}</p>}
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
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Feedback state
  const [mainFeedback, setMainFeedback] = useState(null);
  const [specificFeedback, setSpecificFeedback] = useState([]);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [improving, setImproving] = useState(false);

  useEffect(() => {
    Promise.all([
      base44.entities.VideoBrief.filter({ id: briefId }).then(r => r[0]),
      base44.entities.Project.filter({ id: projectId }).then(r => r[0])
    ]).then(([b, p]) => {
      setBrief(b);
      setProject(p);
    }).finally(() => setLoading(false));
  }, [briefId, projectId]);

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

  const handleSaveFeedback = async (main) => {
    setMainFeedback(main);
    await base44.entities.UserFeedback.create({
      project_id: projectId,
      video_brief_id: briefId,
      main_feedback: main,
      specific_feedback: specificFeedback,
      triggered_rewrite: false,
    });
    setFeedbackSaved(true);
  };

  const handleImproveWithFeedback = async () => {
    if (!mainFeedback && specificFeedback.length === 0) return;
    setImproving(true);

    // Save feedback with rewrite flag
    await base44.entities.UserFeedback.create({
      project_id: projectId,
      video_brief_id: briefId,
      main_feedback: mainFeedback,
      specific_feedback: specificFeedback,
      triggered_rewrite: true,
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

  if (loading) return <div className="min-h-screen bg-briefi-bg flex items-center justify-center" dir="rtl"><LoadingState message="טוען את הבריף..." /></div>;
  if (improving) return <div className="min-h-screen bg-briefi-bg flex items-center justify-center" dir="rtl"><LoadingState message="משפרים לפי הפידבק..." /></div>;

  const fb = brief?.final_brief || {};
  const riskClass = riskColors[fb.client_risk_level] || riskColors["בינוני"];
  const scriptLabel = scriptFormatLabels[fb.script_format] || fb.script_format || "";

  return (
    <div className="min-h-screen bg-briefi-bg" dir="rtl">
      <div className="briefi-header">
        <div className="max-w-lg mx-auto flex items-center gap-3">
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
        <div className="bg-white rounded-2xl border border-border p-5 space-y-5">

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
            <div className="bg-primary/5 rounded-2xl p-4 space-y-2">
              {scriptLabel && (
                <span className="inline-block text-xs bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-full">{scriptLabel}</span>
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
              <p className="text-xs font-bold text-briefi-muted">מבנה צילום</p>
              {(fb.shot_structure || fb.video_structure).map((step, i) => (
                <div key={i} className="flex items-start gap-3 bg-muted/30 rounded-xl p-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">{step.step || i + 1}</div>
                  <div className="flex-1 space-y-0.5">
                    {step.visual && <p className="text-sm text-briefi-navy font-medium">{step.visual}</p>}
                    {step.spoken_or_overlay_text && (
                      <p className="text-xs text-briefi-secondary italic">"{step.spoken_or_overlay_text}"</p>
                    )}
                    {step.description && <p className="text-sm text-briefi-navy font-medium">{step.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 6. טקסטים למסך */}
          {(fb.text_overlays || []).length > 0 && (
            <div className="border-t border-muted pt-4 space-y-1.5">
              <p className="text-xs font-bold text-briefi-muted">טקסטים למסך</p>
              {fb.text_overlays.map((text, i) => (
                <p key={i} className="text-sm text-briefi-navy font-medium bg-muted/50 rounded-lg px-3 py-1.5">"{text}"</p>
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
        </div>

        {/* Feedback Section */}
        <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
          <p className="text-xs font-bold text-briefi-muted">מה דעתכם על הבריף?</p>

          {/* Main feedback */}
          {!feedbackSaved ? (
            <div className="flex gap-2">
              {["אהבתי", "חלש", "לא מספיק ישראלי"].map(opt => (
                <button
                  key={opt}
                  onClick={() => handleSaveFeedback(opt)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                    mainFeedback === opt
                      ? "bg-primary text-white border-primary"
                      : "bg-muted/30 text-briefi-secondary border-border hover:border-primary/30"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-green-600 font-bold">תודה על הפידבק ✓</div>
          )}

          {/* Specific feedback */}
          <div className="flex flex-wrap gap-1.5">
            {SPECIFIC_FEEDBACK_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => toggleSpecificFeedback(opt)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all font-medium ${
                  specificFeedback.includes(opt)
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-muted/30 text-briefi-secondary border-border hover:border-primary/20"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>

          {/* Rewrite with feedback */}
          {(mainFeedback || specificFeedback.length > 0) && (
            <button
              onClick={handleImproveWithFeedback}
              className="w-full h-10 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #23C98B 0%, #249BFF 100%)" }}
            >
              <RefreshCw className="w-4 h-4" />
              שפרו את הבריף לפי הפידבק
            </button>
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