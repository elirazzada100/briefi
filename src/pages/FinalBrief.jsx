import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Pencil, Check, X, FileText, Plus } from "lucide-react";
import LoadingState from "@/components/briefi/LoadingState";

const riskColors = {
  "נמוך": "text-green-600 bg-green-50 border-green-200",
  "בינוני": "text-yellow-600 bg-yellow-50 border-yellow-200",
  "גבוה": "text-red-500 bg-red-50 border-red-200",
  "low": "text-green-600 bg-green-50 border-green-200",
  "medium": "text-yellow-600 bg-yellow-50 border-yellow-200",
  "high": "text-red-500 bg-red-50 border-red-200",
};

function EditableField({ label, value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");

  const handleSave = () => {
    onSave(val);
    setEditing(false);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-briefi-muted">{label}</p>
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
            className="w-full min-h-[70px] p-3 rounded-xl border border-primary/30 bg-primary/5 text-briefi-navy text-sm font-medium focus:outline-none resize-none"
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
        <p className="text-sm text-briefi-navy font-medium leading-relaxed">{val || "—"}</p>
      )}
    </div>
  );
}

export default function FinalBrief() {
  const { projectId, briefId } = useParams();
  const navigate = useNavigate();
  const [brief, setBrief] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  if (loading) return <div className="min-h-screen bg-briefi-bg flex items-center justify-center" dir="rtl"><LoadingState message="טוען את הבריף..." /></div>;

  const fb = brief?.final_brief || {};
  const riskClass = riskColors[fb.client_risk_level] || riskColors["בינוני"];

  return (
    <div className="min-h-screen bg-briefi-bg" dir="rtl">
      <div className="bg-white border-b border-border px-5 pt-safe pt-4 pb-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(`/brief-pack/${projectId}`)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-briefi-secondary" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-briefi-navy">הבריף מוכן</h1>
              {fb.client_risk_level && (
                <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${riskClass}`}>
                  {fb.client_risk_level}
                </span>
              )}
            </div>
            <p className="text-xs text-briefi-muted">סרטון #{brief?.video_number} · {fb.category || brief?.category}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-5 space-y-4">
        {/* Brief Card */}
        <div className="bg-white rounded-2xl border border-border p-5 space-y-5">
          <EditableField label="שם הסרטון" value={fb.brief_title} onSave={v => updateBriefField("brief_title", v)} />
          <div className="border-t border-muted pt-4">
            <EditableField label="מטרה" value={fb.goal} onSave={v => updateBriefField("goal", v)} />
          </div>
          <div className="border-t border-muted pt-4">
            <EditableField label="הוק" value={fb.hook} onSave={v => updateBriefField("hook", v)} />
          </div>
          <div className="border-t border-muted pt-4">
            <EditableField label="רעיון מרכזי" value={fb.main_idea} onSave={v => updateBriefField("main_idea", v)} />
          </div>
          <div className="border-t border-muted pt-4 space-y-2">
            <p className="text-xs font-bold text-briefi-muted">מבנה הסרטון</p>
            {(fb.video_structure || []).map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">{step.step || i + 1}</div>
                <p className="text-sm text-briefi-navy font-medium">{step.description}</p>
              </div>
            ))}
          </div>
          {(fb.text_overlays || []).length > 0 && (
            <div className="border-t border-muted pt-4 space-y-1.5">
              <p className="text-xs font-bold text-briefi-muted">טקסטים למסך</p>
              {fb.text_overlays.map((text, i) => (
                <p key={i} className="text-sm text-briefi-navy font-medium bg-muted/50 rounded-lg px-3 py-1.5">"{text}"</p>
              ))}
            </div>
          )}
          <div className="border-t border-muted pt-4">
            <EditableField label="CTA" value={fb.cta} onSave={v => updateBriefField("cta", v)} />
          </div>
          <div className="border-t border-muted pt-4">
            <EditableField label="הערות צילום" value={fb.production_notes} onSave={v => updateBriefField("production_notes", v)} />
          </div>
          {fb.caption_suggestion && (
            <div className="border-t border-muted pt-4">
              <EditableField label="הצעה לכיתוב" value={fb.caption_suggestion} onSave={v => updateBriefField("caption_suggestion", v)} />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleSave}
            className={`w-full h-14 rounded-2xl font-black text-base text-white flex items-center justify-center gap-2 transition-all active:scale-95 ${saved ? "bg-green-500" : ""}`}
            style={!saved ? { background: "linear-gradient(135deg, #1E8BFF 0%, #8B3DFF 100%)" } : {}}
          >
            {saved ? "✓ הבריף נשמר!" : saving ? "שומר..." : "שמור בריף"}
          </button>

          <button
            onClick={() => navigate(`/category/${projectId}`)}
            className="w-full h-14 rounded-2xl font-bold text-base text-primary bg-primary/8 border-2 border-primary/20 flex items-center justify-center gap-2 transition-all active:scale-95 hover:bg-primary/10"
          >
            <Plus className="w-5 h-5" />
            בנו את הסרטון הבא
          </button>

          <button
            onClick={() => navigate(`/brief-pack/${projectId}`)}
            className="w-full h-12 rounded-2xl font-medium text-sm text-briefi-secondary bg-white border border-border flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <FileText className="w-4 h-4" />
            למסך הבריפים
          </button>
        </div>
      </div>
    </div>
  );
}