import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Plus, FileDown, ArrowRight, ChevronLeft, Film } from "lucide-react";
import LoadingState from "@/components/shared/LoadingState";

const categoryEmojis = {
  "מצחיק": "😂",
  "תדמית": "💎",
  "סרטון אווירה": "🌿",
  "סרטון היכרות": "👋",
  "מכירתי": "🛒",
  "כאב / פתרון": "💡",
  "טרנדי": "🔥",
};

export default function BriefPack() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
  });

  const { data: briefs = [], isLoading } = useQuery({
    queryKey: ["briefs", projectId],
    queryFn: () => base44.entities.VideoBrief.filter({ project_id: projectId }, "video_number"),
  });

  const readyBriefs = briefs.filter(b => b.final_brief);

  if (!project || isLoading) return <LoadingState />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-6"
    >
      <div className="mb-6">
        <p className="text-xs text-muted-foreground font-medium mb-1">{project.client_name}</p>
        <h1 className="text-xl font-extrabold text-foreground mb-2">חבילת הבריפים</h1>
        <p className="text-sm text-muted-foreground">
          המטרה: 8 סרטונים ברורים שאפשר לשלוח ללקוח.
        </p>
      </div>

      {/* Progress */}
      <div className="bg-card rounded-2xl border border-border/60 p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-foreground">{readyBriefs.length} מתוך 8 בריפים מוכנים</span>
          <span className="text-xs text-muted-foreground">{Math.round((readyBriefs.length / 8) * 100)}%</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-l transition-all duration-500"
            style={{
              width: `${(readyBriefs.length / 8) * 100}%`,
              backgroundImage: "linear-gradient(to left, #1E8BFF, #8B3DFF)",
            }}
          />
        </div>
        {readyBriefs.length < 8 && readyBriefs.length > 0 && (
          <p className="text-[11px] text-muted-foreground mt-2">
            אפשר לייצא גם לפני 8, אבל החבילה המלאה נראית מקצועית יותר.
          </p>
        )}
      </div>

      {/* Brief list */}
      {readyBriefs.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Film className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">עדיין אין סרטונים בחבילה</p>
          <p className="text-xs text-muted-foreground mb-4">
            בחרו קטגוריה ונבנה את הסרטון הראשון.
          </p>
          <Button onClick={() => navigate(`/project/${projectId}/category`)} className="rounded-xl gap-2">
            <Plus className="h-4 w-4" />
            בנו סרטון ראשון
          </Button>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {readyBriefs.map((brief, index) => (
            <motion.div
              key={brief.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Link to={`/project/${projectId}/brief/${brief.id}/final`}>
                <div className="bg-card rounded-2xl border border-border/60 p-4 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">{categoryEmojis[brief.category] || "🎬"}</span>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          {brief.final_brief?.brief_title || `סרטון #${brief.video_number}`}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="text-[10px] bg-muted text-muted-foreground">{brief.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {brief.final_brief?.hook}
                        </p>
                      </div>
                    </div>
                    <ChevronLeft className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {readyBriefs.length < 8 && (
          <Button
            onClick={() => navigate(`/project/${projectId}/category`)}
            className="w-full h-14 rounded-2xl text-base font-bold gap-2 shadow-lg shadow-primary/20"
          >
            <Plus className="h-5 w-5" />
            בנו בריף נוסף
          </Button>
        )}

        {readyBriefs.length > 0 && (
          <Button
            onClick={() => navigate(`/project/${projectId}/export`)}
            variant={readyBriefs.length >= 8 ? "default" : "outline"}
            className={`w-full h-12 rounded-2xl text-sm font-semibold gap-2 ${readyBriefs.length >= 8 ? "h-14 text-base shadow-lg shadow-primary/20" : ""}`}
          >
            <FileDown className="h-4 w-4" />
            ייצוא PDF
          </Button>
        )}

        <button
          onClick={() => navigate("/")}
          className="w-full text-center text-sm text-muted-foreground font-medium flex items-center justify-center gap-1 mt-2"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לדשבורד
        </button>
      </div>
    </motion.div>
  );
}