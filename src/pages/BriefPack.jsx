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

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl"><LoadingState message="טוען בריפים..." /></div>;

  const completedCount = briefs.length;
  const progress = Math.min((completedCount / 8) * 100, 100);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-black text-foreground">חבילת הבריפים</h1>
            <p className="text-xs text-muted-foreground">{project?.client_name}</p>
          </div>
        </div>
      </div>

      <div className="briefi-page-container space-y-4">
        {/* Progress Section */}
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">בריפים מוכנים</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-primary">{completedCount}</span>
                <span className="text-lg font-bold text-muted-foreground">/ 8</span>
              </div>
            </div>
            <div className="text-3xl">{completedCount >= 8 ? "🎉" : "📋"}</div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #7C3AED 0%, #3B82F6 100%)"
              }}
            />
          </div>

          <div className="flex gap-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full ${i < completedCount ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>

          {completedCount < 8 && (
            <p className="text-xs text-muted-foreground">אפשר לייצא גם עכשיו, אבל חבילה מלאה נראית מקצועית יותר.</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5">
          <button
            onClick={() => navigate(`/project/${projectId}/category`)}
            className="briefi-btn-primary flex-1"
          >
            <Plus className="w-4 h-4" />
            בריף נוסף
          </button>
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
              <p className="text-muted-foreground text-sm mt-1">בחרו קטגוריה ונבנה את הסרטון הראשון.</p>
            </div>
            <button
              onClick={() => navigate(`/project/${projectId}/category`)}
              className="briefi-btn-primary mx-auto px-8"
            >
              בנו סרטון ראשון
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">הסרטונים שלכם</p>
            {briefs.map((brief) => {
              const color = categoryColors[brief.category] || "#7C3AED";
              const emoji = categoryEmojis[brief.category] || "🎬";
              const fb = brief.final_brief || {};
              return (
                <button
                  key={brief.id}
                  onClick={() => navigate(`/project/${projectId}/final-brief`, { state: { briefId: brief.id } })}
                  className="w-full bg-white rounded-2xl border border-border/60 shadow-sm p-3.5 text-right flex items-center justify-between hover:border-primary/25 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: `${color}15` }}
                    >
                      {emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-muted-foreground">#{brief.video_number}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>
                          {brief.category}
                        </span>
                      </div>
                      <p className="font-bold text-foreground text-sm mt-0.5">{fb.brief_title || "בריף ללא שם"}</p>
                      {fb.hook && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2" style={{ overflowWrap: "break-word" }}>"{fb.hook}"</p>
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