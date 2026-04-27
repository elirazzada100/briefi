import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Shield } from "lucide-react";

export default function GenerationDebug() {
  const { generationRunId } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    base44.auth.me().then(user => {
      if (!user || user.role !== "admin") {
        setUnauthorized(true);
        setLoading(false);
        return;
      }
      loadData();
    });
  }, [generationRunId]);

  const loadData = async () => {
    const [runs, cands] = await Promise.all([
      base44.entities.HookDrivenGenerationRuns.filter({ id: generationRunId }),
      base44.entities.HookDrivenConceptCandidates.filter({ generation_run_id: generationRunId }),
    ]);
    setRun(runs[0] || null);
    setCandidates(cands);
    setLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
      <p className="text-muted-foreground">טוען...</p>
    </div>
  );

  if (unauthorized) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4" dir="rtl">
      <Shield className="w-12 h-12 text-destructive" />
      <p className="text-lg font-bold text-foreground">גישה מוגבלת — אדמין בלבד</p>
      <button onClick={() => navigate("/dashboard")} className="briefi-btn-secondary">חזרה</button>
    </div>
  );

  if (!run) return (
    <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
      <p className="text-muted-foreground">ריצה לא נמצאה</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <h1 className="text-base font-black text-foreground">Admin — Generation Debug</h1>
            </div>
            <p className="text-xs text-muted-foreground">Run ID: {generationRunId}</p>
          </div>
        </div>
      </div>

      <div className="briefi-page-container space-y-4">
        {/* Run summary */}
        <div className="bg-white rounded-2xl border border-border p-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Generation Run</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground">סגנון: </span><span className="font-bold">{run.selected_video_style}</span></div>
            <div><span className="text-muted-foreground">סטטוס: </span><span className={`font-bold ${run.status === "completed" ? "text-green-600" : "text-destructive"}`}>{run.status}</span></div>
            <div><span className="text-muted-foreground">תבניות שנטענו: </span><span className="font-bold">{run.total_templates_loaded}</span></div>
            <div><span className="text-muted-foreground">קונספטים גולמיים: </span><span className="font-bold">{run.total_raw_concepts_generated}</span></div>
            <div><span className="text-muted-foreground">קונספטים סופיים: </span><span className="font-bold">{run.total_final_concepts}</span></div>
            <div><span className="text-muted-foreground">נדחו: </span><span className="font-bold">{run.total_concepts_rejected}</span></div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Prompt: {run.prompt_version}</p>
        </div>

        {/* Concept candidates with full hook metadata */}
        <p className="text-sm font-black text-foreground">קונספטים שנבחרו ({candidates.length})</p>
        {candidates.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm text-amber-700 font-medium">לא נמצאו קונספטים לריצה זו.</p>
          </div>
        )}

        {candidates.map((c, idx) => (
          <div key={c.id} className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                <h3 className="font-black text-foreground text-base">{c.concept_title}</h3>
                <span className="mr-auto text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                  ניקוד: {c.high_energy_score || "—"}
                </span>
              </div>

              {/* User-visible description */}
              <div className="rounded-xl p-3 space-y-1" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" }}>
                <p className="text-[10px] font-bold text-blue-600 uppercase">מה המשתמש רואה (תיאור בלבד)</p>
                <p className="text-sm text-foreground leading-relaxed">{c.short_description}</p>
              </div>

              {/* Internal hook data — admin only */}
              <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p className="text-[10px] font-bold text-red-500 uppercase">🔒 מידע פנימי — לאדמין בלבד</p>

                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="font-bold text-muted-foreground">source_hook_template_id: </span>
                    <span className="font-mono text-foreground break-all">{c.source_hook_template_id || "❌ חסר"}</span>
                  </div>
                  <div>
                    <span className="font-bold text-muted-foreground">filled_hook (פנימי): </span>
                    <span className="text-foreground italic">"{c.filled_hook || "❌ חסר"}"</span>
                  </div>
                  {c.high_energy_score && (
                    <div>
                      <span className="font-bold text-muted-foreground">final_score: </span>
                      <span className="font-bold text-foreground">{c.high_energy_score}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Hook template details if we have template ID */}
              {c.source_hook_template_id && (
                <HookTemplateDetail templateId={c.source_hook_template_id} />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HookTemplateDetail({ templateId }) {
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.LockedHookTemplates.filter({ id: templateId }).then(res => {
      setTemplate(res[0] || null);
      setLoading(false);
    });
  }, [templateId]);

  if (loading) return <p className="text-xs text-muted-foreground">טוען תבנית...</p>;
  if (!template) return (
    <div className="rounded-xl p-3 bg-red-50 border border-red-200">
      <p className="text-xs text-red-600 font-bold">❌ תבנית לא נמצאה ב-LockedHookTemplates עבור ID: {templateId}</p>
    </div>
  );

  return (
    <div className="rounded-xl p-3 space-y-1.5" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)" }}>
      <p className="text-[10px] font-bold text-emerald-600 uppercase">✅ תבנית הוק מקורית</p>
      <div className="space-y-1 text-xs">
        <div><span className="font-bold text-muted-foreground">source_name: </span><span>{template.source_name}</span></div>
        <div><span className="font-bold text-muted-foreground">category: </span><span>{template.source_category}</span></div>
        <div><span className="font-bold text-muted-foreground">mechanic: </span><span>{template.hook_mechanic}</span></div>
        <div><span className="font-bold text-muted-foreground">original (EN): </span><span className="italic">"{template.original_template}"</span></div>
        <div><span className="font-bold text-muted-foreground">hebrew: </span><span className="italic">"{template.hebrew_template}"</span></div>
        {template.source_url && <div><span className="font-bold text-muted-foreground">source_url: </span><a href={template.source_url} target="_blank" rel="noreferrer" className="text-primary underline">{template.source_url}</a></div>}
      </div>
    </div>
  );
}