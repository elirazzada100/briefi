import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Pencil, Check, RotateCcw } from "lucide-react";
import LoadingState from "@/components/shared/LoadingState";
import ErrorState from "@/components/shared/ErrorState";

const dnaFields = [
  { key: "main_angle", label: "הזווית המרכזית", icon: "🎯" },
  { key: "audience_truth", label: "מה הקהל צריך להבין", icon: "👥" },
  { key: "what_is_interesting", label: "מה מעניין פה באמת", icon: "✨" },
  { key: "what_to_avoid", label: "ממה כדאי להיזהר", icon: "⚠️" },
  { key: "recommended_content_directions", label: "כיווני תוכן מומלצים", icon: "📋" },
];

export default function CreativeDNA() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [dna, setDna] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
  });

  useEffect(() => {
    if (project?.creative_dna) {
      setDna(project.creative_dna);
    } else if (project && !dna && !generating) {
      generateDNA();
    }
  }, [project]);

  const generateDNA = async () => {
    if (!project) return;
    setGenerating(true);
    setError(false);

    const response = await base44.functions.invoke("briefiAI", {
      action: "generateCreativeDNA",
      project_id: project.id,
      client_name: project.client_name,
      main_goal: project.main_goal,
      raw_notes: project.raw_notes,
    });

    const result = response.data?.creative_dna;
    setDna(result);
    await base44.entities.Project.update(project.id, { status: "in_progress" });
    setGenerating(false);
  };

  const startEdit = (key, value) => {
    setEditingField(key);
    setEditValue(Array.isArray(value) ? value.join("\n") : value);
  };

  const saveEdit = async (key) => {
    const newValue = key === "recommended_content_directions" 
      ? editValue.split("\n").filter(Boolean) 
      : editValue;
    const updated = { ...dna, [key]: newValue };
    setDna(updated);
    setEditingField(null);
    await base44.entities.Project.update(project.id, { creative_dna: updated });
  };

  const handleContinue = () => {
    navigate(`/project/${projectId}/category`);
  };

  if (!projectId) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <p className="text-destructive font-bold text-lg">שגיאה: מזהה פרויקט חסר</p>
      <button onClick={() => navigate("/")} className="text-primary underline text-sm">חזרה לדף הבית</button>
    </div>
  );

  if (!project) return <LoadingState message="טוען פרויקט..." />;
  if (generating) return <LoadingState message="Briefi מנתח את העסק..." />;
  if (error) return <ErrorState onRetry={generateDNA} />;
  if (!dna) return <LoadingState />;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="briefi-page-container"
    >
      <div className="mb-5">
        <h1 className="text-xl font-black text-foreground mb-1">זה מה שהבנו על העסק</h1>
        <p className="text-sm text-muted-foreground">
          אפשר לערוך כל חלק. כשזה נראה טוב, ממשיכים.
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {dnaFields.map((field, index) => {
          const value = dna[field.key];
          const isEditing = editingField === field.key;
          const displayValue = Array.isArray(value) ? value.join(" / ") : value;

          return (
            <motion.div
              key={field.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.07 }}
              className="bg-white rounded-2xl border border-border/60 shadow-sm p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{field.icon}</span>
                  <h3 className="text-sm font-bold text-foreground">{field.label}</h3>
                </div>
                {!isEditing && (
                  <button
                    onClick={() => startEdit(field.key, value)}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="text-sm rounded-xl resize-none"
                    dir="rtl"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(field.key)} className="rounded-lg gap-1">
                      <Check className="h-3 w-3" /> שמור
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingField(null)} className="rounded-lg">
                      ביטול
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">{displayValue}</p>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="space-y-2.5">
        <button
          onClick={handleContinue}
          className="briefi-btn-primary w-full"
        >
          <Sparkles className="h-4 w-4" />
          נראה טוב, ממשיכים
        </button>

        <button
          onClick={generateDNA}
          className="briefi-btn-secondary w-full"
        >
          <RotateCcw className="h-4 w-4" />
          שפרו את הניתוח
        </button>

        <button
          onClick={() => navigate(-1)}
          className="briefi-btn-ghost w-full"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה
        </button>
      </div>
    </motion.div>
    </div>
  );
}