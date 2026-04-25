import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Plus, ChevronLeft, ArrowRight, FolderOpen } from "lucide-react";
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

export default function Projects() {
  const navigate = useNavigate();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date", 50),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-8"
    >
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-extrabold text-foreground">הפרויקטים שלי</h1>
        <Link to="/new-project">
          <Button size="sm" className="rounded-xl gap-1">
            <Plus className="h-4 w-4" />
            חדש
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <FolderOpen className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">אין פרויקטים</p>
          <p className="text-xs text-muted-foreground mb-4">צרו פרויקט ראשון כדי להתחיל</p>
          <Link to="/new-project">
            <Button className="rounded-xl gap-2">
              <Plus className="h-4 w-4" />
              צור פרויקט
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <Link to={`/project/${project.id}/briefs`}>
                <div className="bg-card rounded-2xl border border-border/60 p-4 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-sm truncate">{project.client_name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {project.completed_briefs_count || 0} מתוך 8 בריפים
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        מטרה: {project.main_goal}
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
      )}

      <button
        onClick={() => navigate("/")}
        className="w-full text-center text-sm text-muted-foreground font-medium flex items-center justify-center gap-1 mt-6"
      >
        <ArrowRight className="h-4 w-4" />
        חזרה
      </button>
    </motion.div>
  );
}