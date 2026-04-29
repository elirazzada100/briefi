import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Plus, Download, GripVertical, Trash2, X, FileText } from "lucide-react";
import LoadingState from "@/components/briefi/LoadingState";
import { AnimatePresence, motion } from "framer-motion";

const styleColors = {
  "מצחיק": "#F8B900",
  "תדמית": "#6C35FF",
  "סרטון אווירה": "#23C98B",
  "סרטון הכרות": "#249BFF",
  "סרטון היכרות": "#249BFF",
  "מכירתי": "#FF7A2F",
  "לימודי": "#0EA5E9",
  "כאב / פתרון": "#F2519D",
  "טרנדי": "#11B7C7",
};

const styleEmojis = {
  "מצחיק": "😄",
  "תדמית": "⭐",
  "סרטון אווירה": "🌿",
  "סרטון הכרות": "👋",
  "סרטון היכרות": "👋",
  "מכירתי": "🛒",
  "לימודי": "🧠",
  "כאב / פתרון": "💊",
  "טרנדי": "🔥",
};

export default function BriefPack() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  useEffect(() => {
    const load = async () => {
      const user = await base44.auth.me();
      const [p, b] = await Promise.all([
        base44.entities.Project.filter({ id: projectId }).then(r => r[0]),
        base44.entities.VideoBrief.filter({ project_id: projectId })
      ]);
      if (!p || p.owner_id !== user.id) {
        navigate("/dashboard");
        return;
      }
      setProject(p);
      // Sort by video_order if set, else video_number
      const sorted = b.sort((a, b2) =>
        (a.video_order ?? a.video_number ?? 0) - (b2.video_order ?? b2.video_number ?? 0)
      );
      setBriefs(sorted);
      setLoading(false);
    };
    load();
  }, [projectId]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await base44.entities.VideoBrief.delete(deleteTarget.id);
    const updated = briefs.filter(b => b.id !== deleteTarget.id);
    setBriefs(updated);
    // Update project count
    await base44.entities.Project.update(projectId, {
      completed_briefs_count: updated.length,
    });
    setDeleting(false);
    setDeleteTarget(null);
  };

  // ── Drag and drop reorder ────────────────────────────────────────────────────
  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = async (idx) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const newBriefs = [...briefs];
    const [moved] = newBriefs.splice(dragIdx, 1);
    newBriefs.splice(idx, 0, moved);
    setBriefs(newBriefs);
    setDragIdx(null);
    setDragOverIdx(null);
    // Persist order
    await Promise.all(newBriefs.map((b, i) =>
      base44.entities.VideoBrief.update(b.id, { video_order: i + 1 })
    ));
  };

  // Up/Down buttons fallback for mobile
  const moveUp = async (idx) => {
    if (idx === 0) return;
    const newBriefs = [...briefs];
    [newBriefs[idx - 1], newBriefs[idx]] = [newBriefs[idx], newBriefs[idx - 1]];
    setBriefs(newBriefs);
    await Promise.all(newBriefs.map((b, i) =>
      base44.entities.VideoBrief.update(b.id, { video_order: i + 1 })
    ));
  };

  const moveDown = async (idx) => {
    if (idx === briefs.length - 1) return;
    const newBriefs = [...briefs];
    [newBriefs[idx], newBriefs[idx + 1]] = [newBriefs[idx + 1], newBriefs[idx]];
    setBriefs(newBriefs);
    await Promise.all(newBriefs.map((b, i) =>
      base44.entities.VideoBrief.update(b.id, { video_order: i + 1 })
    ));
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
      <LoadingState message="טוען סרטונים..." />
    </div>
  );

  const totalTarget = project?.brief_video_count || 8;
  const completedCount = briefs.length;
  const progress = Math.min((completedCount / totalTarget) * 100, 100);
  const allDone = completedCount >= totalTarget;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-black text-foreground">חבילת הסרטונים בבריף</h1>
            <p className="text-xs text-muted-foreground">{project?.client_name}</p>
          </div>
        </div>
      </div>

      <div className="briefi-page-container space-y-4">
        {/* Progress */}
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">סרטונים מוכנים</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-primary">{completedCount}</span>
                <span className="text-lg font-bold text-muted-foreground">/ {totalTarget}</span>
              </div>
            </div>
            <div className="text-3xl">{allDone ? "🎉" : "📋"}</div>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{ width: `${progress}%`, background: "linear-gradient(90deg, #7C3AED 0%, #3B82F6 100%)" }}
            />
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: totalTarget }).map((_, i) => (
              <div key={i} className={`flex-1 h-1.5 rounded-full ${i < completedCount ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
          {!allDone ? (
            <p className="text-xs text-muted-foreground">בניתם {completedCount} מתוך {totalTarget} סרטונים. אפשר לייצא גם עכשיו.</p>
          ) : (
            <p className="text-xs text-green-600 font-semibold">כל {totalTarget} הסרטונים מוכנים! 🎉</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5">
          {completedCount < 10 ? (
            <button
              onClick={() => navigate(`/project/${projectId}/video-style`)}
              className="briefi-btn-primary flex-1"
            >
              <Plus className="w-4 h-4" />
              {allDone ? "סרטון נוסף" : "סרטון נוסף לבריף"}
            </button>
          ) : (
            <div className="flex-1 h-11 rounded-2xl bg-muted text-muted-foreground text-xs font-semibold flex items-center justify-center">
              הגעתם למקסימום של 10 סרטונים
            </div>
          )}
          <button
            onClick={() => navigate(`/project/${projectId}/export`)}
            className="briefi-btn-secondary flex-1"
          >
            <Download className="w-4 h-4" />
            ייצוא PDF
          </button>
        </div>

        {/* Briefs List */}
        {briefs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-8 text-center space-y-3">
            <div className="text-4xl">🎬</div>
            <div>
              <p className="font-bold text-foreground">עדיין אין סרטונים בחבילה</p>
              <p className="text-muted-foreground text-sm mt-1">בחרו סגנון ונבנה את הסרטון הראשון.</p>
            </div>
            <button
              onClick={() => navigate(`/project/${projectId}/video-style`)}
              className="briefi-btn-primary mx-auto px-8"
            >
              בנו סרטון ראשון
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">הסרטונים בבריף — גרור לסידור מחדש</p>
            {briefs.map((brief, idx) => {
              const style = brief.category || brief.video_style || "";
              const color = styleColors[style] || "#7C3AED";
              const emoji = styleEmojis[style] || "🎬";
              const fb = brief.adapted_brief || brief.final_brief || {};
              const title = fb.brief_title || brief.brief_title || "סרטון ללא שם";
              const hook = fb.hook || brief.hook || "";
              const isDragOver = dragOverIdx === idx;

              return (
                <div
                  key={brief.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                  className={`bg-white rounded-2xl border shadow-sm transition-all ${isDragOver ? "border-primary/50 shadow-md scale-[1.01]" : "border-border/60"}`}
                >
                  <div className="flex items-center gap-2 p-3">
                    {/* Drag handle */}
                    <div className="cursor-grab active:cursor-grabbing flex-shrink-0 p-1 text-muted-foreground/40 hover:text-muted-foreground">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Click to open */}
                    <button
                      className="flex-1 flex items-center gap-3 text-right min-w-0"
                      onClick={() => navigate(`/project/${projectId}/final-brief`, { state: { briefId: brief.id } })}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                        style={{ background: `${color}15` }}
                      >
                        {emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-muted-foreground">#{idx + 1}</span>
                          {style && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>
                              {style}
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-foreground text-sm mt-0.5 truncate">{title}</p>
                        {hook && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">"{hook}"</p>
                        )}
                      </div>
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </button>

                    {/* Up/Down fallback + Delete */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        className="w-6 h-5 text-[10px] rounded text-muted-foreground hover:text-foreground disabled:opacity-20 flex items-center justify-center"
                      >▲</button>
                      <button
                        onClick={() => moveDown(idx)}
                        disabled={idx === briefs.length - 1}
                        className="w-6 h-5 text-[10px] rounded text-muted-foreground hover:text-foreground disabled:opacity-20 flex items-center justify-center"
                      >▼</button>
                    </div>

                    <button
                      onClick={() => setDeleteTarget(brief)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                      aria-label="מחק סרטון"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-6 sm:pb-0"
            onClick={() => !deleting && setDeleteTarget(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4 shadow-xl"
            >
              <div className="space-y-1.5">
                <h2 className="text-lg font-black text-foreground">למחוק את הסרטון הזה מהבריף?</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  הסרטון יוסר מחבילת הסרטונים. אפשר ליצור סרטון חדש במקום.
                </p>
                {deleteTarget && (
                  <p className="text-xs font-bold text-foreground/60 mt-1">
                    "{(deleteTarget.adapted_brief?.brief_title || deleteTarget.brief_title || "סרטון זה")}"
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="w-full h-11 rounded-2xl font-bold text-sm text-white bg-destructive hover:bg-destructive/90 transition-all disabled:opacity-60"
                >
                  {deleting ? "מוחק..." : "כן, למחוק"}
                </button>
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="briefi-btn-secondary w-full"
                >
                  ביטול
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}