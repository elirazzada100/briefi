import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Plus, Download, FileText } from "lucide-react";
import LoadingState from "@/components/briefi/LoadingState";

const categoryColors = {
  "מצחיק": "#F8B900",
  "תדמית": "#6C35FF",
  "סרטון אווירה": "#23C98B",
  "סרטון היכרות": "#249BFF",
  "מכירתי": "#FF7A2F",
  "כאב / פתרון": "#F2519D",
  "טרנדי": "#11B7C7",
};

const categoryEmojis = {
  "מצחיק": "😄",
  "תדמית": "⭐",
  "סרטון אווירה": "🌿",
  "סרטון היכרות": "👋",
  "מכירתי": "🛒",
  "כאב / פתרון": "💊",
  "טרנדי": "🔥",
};

export default function BriefPack() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Project.filter({ id: projectId }).then(r => r[0]),
      base44.entities.VideoBrief.filter({ project_id: projectId })
    ]).then(([p, b]) => {
      setProject(p);
      setBriefs(b.sort((a, b) => (a.video_number || 0) - (b.video_number || 0)));
    }).finally(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="min-h-screen bg-briefi-bg flex items-center justify-center" dir="rtl"><LoadingState message="טוען בריפים..." /></div>;

  const completedCount = briefs.length;
  const progress = Math.min((completedCount / 8) * 100, 100);

  return (
    <div className="min-h-screen bg-briefi-bg" dir="rtl">
      <div className="bg-white border-b border-border px-5 pt-safe pt-4 pb-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/")} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-briefi-secondary" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black text-briefi-navy">חבילת הבריפים</h1>
            <p className="text-xs text-briefi-muted">{project?.client_name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-5 space-y-5">
        {/* Progress Section */}
        <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-briefi-navy">
                <span className="text-primary">{completedCount}</span>
                <span className="text-briefi-muted text-lg"> מתוך 8</span>
              </h2>
              <p className="text-xs text-briefi-secondary">בריפים מוכנים</p>
            </div>
            <div className="text-3xl">{completedCount >= 8 ? "🎉" : "📋"}</div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #1E8BFF 0%, #8B3DFF 100%)"
              }}
            />
          </div>

          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full min-w-[20px] ${i < completedCount ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>

          {completedCount < 8 && (
            <p className="text-xs text-briefi-muted">אפשר לייצא גם לפני 8, אבל החבילה המלאה נראית מקצועית יותר.</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/category/${projectId}`)}
            className="flex-1 h-14 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #1E8BFF 0%, #8B3DFF 100%)" }}
          >
            <Plus className="w-4 h-4" />
            בריף נוסף
          </button>
          <button
            onClick={() => navigate(`/pdf-export/${projectId}`)}
            className="flex-1 h-14 rounded-2xl font-bold text-sm text-primary border-2 border-primary/30 bg-primary/5 flex items-center justify-center gap-2 transition-all active:scale-95 hover:bg-primary/10"
          >
            <Download className="w-4 h-4" />
            ייצוא PDF
          </button>
        </div>

        {/* Briefs List */}
        {briefs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-8 text-center space-y-4">
            <div className="text-4xl">🎬</div>
            <div>
              <p className="font-bold text-briefi-navy">עדיין אין סרטונים בחבילה</p>
              <p className="text-briefi-secondary text-sm mt-1">בחרו קטגוריה ונבנה את הסרטון הראשון.</p>
            </div>
            <button
              onClick={() => navigate(`/category/${projectId}`)}
              className="px-6 py-3 text-white rounded-xl font-bold text-sm"
              style={{ background: "linear-gradient(135deg, #1E8BFF 0%, #8B3DFF 100%)" }}
            >
              בנו סרטון ראשון
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="font-bold text-briefi-navy text-sm">הסרטונים שלכם</h3>
            {briefs.map((brief) => {
              const color = categoryColors[brief.category] || "#6C35FF";
              const emoji = categoryEmojis[brief.category] || "🎬";
              const fb = brief.final_brief || {};
              return (
                <button
                  key={brief.id}
                  onClick={() => navigate(`/final-brief/${projectId}/${brief.id}`)}
                  className="w-full bg-white rounded-2xl border border-border p-4 text-right flex items-center justify-between hover:border-primary/30 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: `${color}18` }}
                    >
                      {emoji}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-briefi-muted">#{brief.video_number}</span>
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: `${color}18`, color }}
                        >
                          {brief.category}
                        </span>
                      </div>
                      <p className="font-bold text-briefi-navy text-sm mt-0.5">{fb.brief_title || "בריף ללא שם"}</p>
                      {fb.hook && (
                        <p className="text-xs text-briefi-muted mt-0.5 truncate max-w-[200px]">"{fb.hook}"</p>
                      )}
                    </div>
                  </div>
                  <FileText className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}