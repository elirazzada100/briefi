import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Plus, FolderOpen, FileText, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const statusLabels = {
  draft: "טיוטה",
  in_progress: "בתהליך",
  ready_to_export: "מוכן לייצוא",
  exported: "יוצא",
};

const statusColors = {
  draft: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  ready_to_export: "bg-emerald-100 text-emerald-700",
  exported: "bg-blue-100 text-blue-700",
};

export default function Dashboard() {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date", 20),
  });

  return (
    <div className="py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-card border border-border flex items-center justify-center">
          <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="10" y1="32" x2="28" y2="8" strokeLinecap="round" />
            <path d="M28 8 L30 6 L32 8 L28 8Z" fill="currentColor" />
            <path d="M10 32 Q14 28 20 30" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-foreground mb-2">Briefi</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          הופכים שיחת לקוח ל־8 בריפים ברורים.
        </p>
      </motion.div>

      <div className="flex flex-col gap-3 mb-8">
        <Link to="/new-project">
          <Button className="w-full h-14 rounded-2xl text-base font-bold gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
            <Plus className="h-5 w-5" />
            בריף חדש
          </Button>
        </Link>
        <Link to="/projects">
          <Button variant="outline" className="w-full h-12 rounded-2xl text-sm font-semibold gap-2">
            <FolderOpen className="h-4 w-4" />
            הפרויקטים שלי
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center py-12 px-6"
        >
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <FileText className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">עדיין אין פרויקטים</p>
          <p className="text-xs text-muted-foreground mb-4">
            תתחילו מלקוח אחד, פסקה אחת, ובריף אחד ברור.
          </p>
          <Link to="/new-project">
            <Button className="rounded-xl gap-2">
              <Plus className="h-4 w-4" />
              צור פרויקט ראשון
            </Button>
          </Link>
        </motion.div>
      ) : (
        <div>
          <h2 className="text-sm font-bold text-muted-foreground mb-3">פרויקטים אחרונים</h2>
          <div className="space-y-3">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/project/${project.id}/briefs`}>
                  <div className="bg-card rounded-2xl border border-border/60 p-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground text-sm truncate">
                          {project.client_name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {project.completed_briefs_count || 0} מתוך 8 בריפים
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[10px] font-medium ${statusColors[project.status] || statusColors.draft}`}>
                          {statusLabels[project.status] || "טיוטה"}
                        </Badge>
                        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="w-full h-1.5 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${((project.completed_briefs_count || 0) / 8) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}