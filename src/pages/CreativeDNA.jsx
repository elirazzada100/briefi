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

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze the following Israeli business based on messy client meeting notes.

Client name: ${project.client_name}
Main goal: ${project.main_goal}
Raw notes: ${project.raw_notes}

Create a short Creative DNA summary that helps a social media manager understand what content to build.

Return JSON only with this structure:
{
  "main_angle": "",
  "audience_truth": "",
  "what_is_interesting": "",
  "what_to_avoid": "",
  "recommended_content_directions": ["", "", "", ""]
}

Rules:
- Hebrew only.
- Clear and practical.
- No generic marketing language.
- Each field should be short (1-3 sentences).
- Make it useful for building short-form video briefs.`,
      response_json_schema: {
        type: "object",
        properties: {
          main_angle: { type: "string" },
          audience_truth: { type: "string" },
          what_is_interesting: { type: "string" },
          what_to_avoid: { type: "string" },
          recommended_content_directions: { type: "array", items: { type: "string" } },
        },
      },
    });

    setDna(result);
    await base44.entities.Project.update(project.id, {
      creative_dna: result,
      status: "in_progress",
    });
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

  if (!project) return <LoadingState message="טוען פרויקט..." />;
  if (generating) return <LoadingState message="Briefi מנתח את העסק..." />;
  if (error) return <ErrorState onRetry={generateDNA} />;
  if (!dna) return <LoadingState />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-8"
    >
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-foreground mb-2">זה מה שהבנו על העסק</h1>
        <p className="text-sm text-muted-foreground">
          אפשר לערוך כל חלק. כשזה נראה טוב, ממשיכים.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {dnaFields.map((field, index) => {
          const value = dna[field.key];
          const isEditing = editingField === field.key;
          const displayValue = Array.isArray(value) ? value.join(" / ") : value;

          return (
            <motion.div
              key={field.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="bg-card rounded-2xl border border-border/60 p-4"
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

      <div className="space-y-3">
        <Button
          onClick={handleContinue}
          className="w-full h-14 rounded-2xl text-base font-bold gap-2 shadow-lg shadow-primary/20"
        >
          <Sparkles className="h-5 w-5" />
          נראה טוב, ממשיכים
        </Button>

        <Button
          onClick={generateDNA}
          variant="outline"
          className="w-full h-12 rounded-2xl text-sm font-semibold gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          שפרו את הניתוח
        </Button>

        <button
          onClick={() => navigate(-1)}
          className="w-full text-center text-sm text-muted-foreground font-medium flex items-center justify-center gap-1 mt-2"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה
        </button>
      </div>
    </motion.div>
  );
}