import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, FileText, ChevronLeft, ArrowRight, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccessName, setDeleteSuccessName] = useState(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Project.filter({ owner_id: user.id }, "-created_date", 50);
    },
  });

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await base44.functions.invoke("deleteProject", { project_id: deleteTarget.id });
    setDeleting(false);
    const targetName = deleteTarget?.client_name || "";
    setDeleteTarget(null);
    if (res.data?.success) {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeleteSuccessName(targetName);
      setTimeout(() => setDeleteSuccessName(null), 4000);
    } else {
      toast({ description: res.data?.error || "לא הצלחנו למחוק את הפרויקט. נסו שוב.", variant: "destructive" });
    }
  };

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
            <h1 className="text-base font-black text-foreground">הלקוחות שלי</h1>
          </div>
          <Link to="/new-project">
            <button className="briefi-btn-primary h-8 px-3 text-xs">
              <Plus className="h-3.5 w-3.5" />
              + לקוח חדש
            </button>
          </Link>
        </div>
      </div>

      {/* Delete success banner */}
      <AnimatePresence>
        {deleteSuccessName && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="mx-auto max-w-[430px] px-4 pt-3"
          >
            <div className="flex items-center justify-between gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-green-700">"{deleteSuccessName}" נמחק בהצלחה</p>
              <button
                onClick={() => setDeleteSuccessName(null)}
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-green-100 transition-colors flex-shrink-0"
                aria-label="סגור"
              >
                <X className="w-4 h-4 text-green-600" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            <p className="text-sm font-bold text-briefi-navy mb-1">עדיין אין לקוחות</p>
            <p className="text-xs text-briefi-muted mb-5">
              תתחילו מלקוח אחד, פסקה אחת, ובריף אחד ברור.
            </p>
            <Link to="/new-project">
              <button className="briefi-btn-primary mx-auto">
                <Plus className="h-4 w-4" />
                + לקוח חדש
              </button>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {projects.map((project, index) => {
              const total = project.brief_video_count || 8;
              const done = project.completed_briefs_count || 0;
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 hover:border-primary/25 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/project/${project.id}/brief-pack`} className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground text-sm truncate">{project.client_name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{done} מתוך {total} סרטונים</p>
                      </Link>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={`text-[10px] font-medium ${statusColors[project.status] || statusColors.draft}`}>
                          {statusLabels[project.status] || "טיוטה"}
                        </Badge>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(project); }}
                          aria-label="מחיקת פרויקט"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <Link to={`/project/${project.id}/brief-pack`}>
                          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      </div>
                    </div>
                    <Link to={`/project/${project.id}/brief-pack`}>
                      <div className="mt-3">
                        <div className="w-full h-1 rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${Math.min((done / total) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  </div>
                </motion.div>
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
                <h2 className="text-lg font-black text-foreground">למחוק את הפרויקט?</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  פעולה זו תמחק את הפרויקט, הבריפים והייצואים שלו לצמיתות. לא ניתן לשחזר את זה.
                </p>
                {deleteTarget && (
                  <p className="text-xs font-bold text-foreground/60 mt-1">"{deleteTarget.client_name}"</p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="w-full h-11 rounded-2xl font-bold text-sm text-white bg-destructive hover:bg-destructive/90 transition-all disabled:opacity-60"
                >
                  {deleting ? "מוחק..." : "כן, למחוק לצמיתות"}
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