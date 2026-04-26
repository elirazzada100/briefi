import React from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileText, ChevronLeft, ArrowRight } from "lucide-react";
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
    queryFn: () => base44.entities.Project.list("-created_date", 50),
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="briefi-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <button className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </button>
            </Link>
            <h1 className="text-base font-black text-foreground">הפרויקטים שלי</h1>
          </div>
          <Link to="/new-project">
            <button className="briefi-btn-primary h-8 px-3 text-xs">
              <Plus className="h-3.5 w-3.5" />
              חדש
            </button>
          </Link>
        </div>
      </div>

      <div className="briefi-page-container">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center py-16 px-6"
          >
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-briefi-navy mb-1">עדיין אין פרויקטים</p>
            <p className="text-xs text-briefi-muted mb-5">
              תתחילו מלקוח אחד, פסקה אחת, ובריף אחד ברור.
            </p>
            <Link to="/new-project">
              <button className="briefi-btn-primary mx-auto">
                <Plus className="h-4 w-4" />
                צרו פרויקט ראשון
              </button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Link to={`/project/${project.id}/brief-pack`}>
                  <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 hover:border-primary/25 hover:shadow-md transition-all active:scale-[0.99]">
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
                        <ChevronLeft className="h-4 w-4 text-briefi-muted" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="w-full h-1 rounded-full bg-muted">
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
      </div>
    </div>
  );
}