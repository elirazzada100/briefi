import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, ChevronLeft, FileText, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import BriefiLoader from "@/components/shared/BriefiLoader";
import ErrorState from "@/components/shared/ErrorState";
import { useProjectGuard } from "@/hooks/useProjectGuard";

const statusLabels = {
  draft: "טיוטה",
  in_progress: "בתהליך",
  approved: "מוכן",
  ready_to_export: "מוכן לייצוא",
  exported: "יוצא",
};

const statusColors = {
  draft: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  approved: "bg-emerald-100 text-emerald-700",
  ready_to_export: "bg-emerald-100 text-emerald-700",
  exported: "bg-blue-100 text-blue-700",
};

function sortBriefs(briefs) {
  return [...briefs].sort(
    (left, right) => (left.video_order ?? left.video_number ?? 0) - (right.video_order ?? right.video_number ?? 0)
  );
}

export default function ClientDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { project, loading: guardLoading, accessDenied } = useProjectGuard(projectId);

  const loadClient = async () => {
    if (!project?.id) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const videoBriefs = await base44.entities.VideoBrief.filter({ project_id: project.id }, "video_order", 100);
      setBriefs(sortBriefs(videoBriefs || []));
    } catch (loadError) {
      console.error("ClientDetail failed to load project briefs", {
        projectId,
        reason: loadError?.message || "failed_data_load",
      });
      setError(loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!guardLoading && !project && !accessDenied) {
      console.error("ClientDetail missing owned project", {
        projectId,
        reason: "project_not_found_or_owner_mismatch",
      });
      setError(new Error("Project not found"));
      setLoading(false);
      return;
    }

    if (project?.id) {
      loadClient();
    }
  }, [guardLoading, project?.id, accessDenied]);

  const startBriefFlow = () => {
    if (!project) return;

    if (project.creative_dna) {
      navigate(`/project/${projectId}/video-style`, {
        state: {
          business: {
            business_name: project.client_name,
            business_description: project.raw_notes || "",
            main_goal: project.main_goal || "",
          },
          businessAnalysis: project.creative_dna,
        },
      });
      return;
    }

    navigate(`/project/${projectId}/creative-dna`);
  };

  const { inProgressBriefs, completedBriefs } = useMemo(() => {
    const sorted = sortBriefs(briefs);
    return {
      inProgressBriefs: sorted.filter((brief) => !["approved", "ready_to_export", "exported"].includes(brief.status)),
      completedBriefs: sorted.filter((brief) => ["approved", "ready_to_export", "exported"].includes(brief.status)),
    };
  }, [briefs]);

  if (guardLoading || loading) {
    return (
      <div className="bg-background flex items-center justify-center" style={{ minHeight: "100dvh" }} dir="rtl">
        <BriefiLoader />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
        <div className="w-full max-w-sm">
          <ErrorState
            onRetry={loadClient}
            message="משהו נתקע בדרך. נסו שוב בעוד רגע."
          />
          <button onClick={() => navigate("/dashboard")} className="briefi-btn-secondary w-full mt-4">
            חזרה ללקוחות שלי
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/dashboard")} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black text-foreground truncate">{project.client_name}</h1>
            {project.main_goal ? <p className="text-xs text-muted-foreground truncate">{project.main_goal}</p> : null}
          </div>
        </div>
      </div>

      <div className="briefi-page-container space-y-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">סרטונים מוכנים</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-primary">{completedBriefs.length}</span>
                <span className="text-lg font-bold text-muted-foreground">/ {project.brief_video_count || 8}</span>
              </div>
            </div>
            <Badge className={`text-[10px] font-medium ${statusColors[project.status] || statusColors.draft}`}>
              {statusLabels[project.status] || "טיוטה"}
            </Badge>
          </div>
          <div className="flex gap-2.5">
            <button onClick={startBriefFlow} className="briefi-btn-primary flex-1">
              <Plus className="w-4 h-4" />
              בריף חדש
            </button>
            <button onClick={() => navigate(`/project/${projectId}/brief-pack`)} className="briefi-btn-secondary flex-1">
              <FileText className="w-4 h-4" />
              חבילת הסרטונים בבריף
            </button>
          </div>
        </div>

        {briefs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-8 text-center space-y-3">
            <div className="text-4xl">🎬</div>
            <div>
              <p className="font-bold text-foreground">עדיין אין סרטונים ללקוח הזה</p>
              <p className="text-muted-foreground text-sm mt-1">אפשר להתחיל מניתוח העסק ולהמשיך לבניית הסרטון הראשון.</p>
            </div>
            <button onClick={startBriefFlow} className="briefi-btn-primary mx-auto px-8">
              התחילו לבנות
            </button>
          </div>
        ) : null}

        {inProgressBriefs.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">בתהליך</p>
            {inProgressBriefs.map((brief) => {
              const title = brief.adapted_brief?.brief_title || brief.brief_title || `סרטון ${brief.video_number || ""}`.trim();
              return (
                <button
                  key={brief.id}
                  onClick={() => navigate(`/project/${projectId}/final-brief`, { state: { briefId: brief.id } })}
                  className="w-full bg-white rounded-2xl border border-border/60 shadow-sm p-4 text-right hover:border-primary/25 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground text-sm truncate">{title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {brief.category || brief.video_style || "סרטון"}{brief.hook ? ` · "${brief.hook}"` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={`text-[10px] font-medium ${statusColors[brief.status] || statusColors.draft}`}>
                        {statusLabels[brief.status] || "טיוטה"}
                      </Badge>
                      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}

        {completedBriefs.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">מוכנים</p>
            {completedBriefs.map((brief) => {
              const title = brief.adapted_brief?.brief_title || brief.brief_title || `סרטון ${brief.video_number || ""}`.trim();
              return (
                <button
                  key={brief.id}
                  onClick={() => navigate(`/project/${projectId}/final-brief`, { state: { briefId: brief.id } })}
                  className="w-full bg-white rounded-2xl border border-border/60 shadow-sm p-4 text-right hover:border-primary/25 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground text-sm truncate">{title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {brief.category || brief.video_style || "סרטון"}{brief.cta ? ` · ${brief.cta}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={`text-[10px] font-medium ${statusColors[brief.status] || statusColors.approved}`}>
                        {statusLabels[brief.status] || "מוכן"}
                      </Badge>
                      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}
