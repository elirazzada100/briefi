import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import StepProgress from "@/components/shared/StepProgress";
import InfoChip from "@/components/shared/InfoChip";
import OptionCard from "@/components/shared/OptionCard";
import LoadingState from "@/components/shared/LoadingState";

const categories = [
  { id: "מצחיק", label: "מצחיק", emoji: "😂", color: "#F8B900", desc: "תשומת לב, קלילות, שיתופים" },
  { id: "תדמית", label: "תדמית", emoji: "💎", color: "#6C35FF", desc: "אמון, בהירות, מקצועיות" },
  { id: "סרטון אווירה", label: "סרטון אווירה", emoji: "🌿", color: "#23C98B", desc: "תחושה, מקום, חוויה" },
  { id: "סרטון היכרות", label: "סרטון היכרות", emoji: "👋", color: "#249BFF", desc: "אנשים, סיפור, עסק" },
  { id: "מכירתי", label: "מכירתי", emoji: "🛒", color: "#FF7A2F", desc: "פעולה, מכירות, לידים" },
  { id: "כאב / פתרון", label: "כאב / פתרון", emoji: "💡", color: "#F2519D", desc: "בעיה אמיתית → פתרון ברור" },
  { id: "טרנדי", label: "טרנדי", emoji: "🔥", color: "#11B7C7", desc: "פורמט עכשווי, מהיר, חברתי" },
];

export default function CategoryPicker() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
  });

  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!selected || !project) return;
    setLoading(true);

    // Generate hooks via OpenAI backend
    const response = await base44.functions.invoke("briefiAI", {
      action: "generateHooks",
      project_id: projectId,
      client_name: project.client_name,
      main_goal: project.main_goal,
      raw_notes: project.raw_notes,
      creative_dna: project.creative_dna || {},
      selected_category: selected,
    });

    const hooks = response.data?.hooks || [];
    setLoading(false);
    navigate(`/project/${projectId}/hooks`, { state: { hooks, category: selected } });
  };

  if (!project || loading) return <div className="min-h-screen bg-background flex items-center justify-center"><LoadingState message={loading ? "מייצרים 4 הוקים..." : "טוען..."} /></div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-6"
    >
      <StepProgress currentStep={1} />

      <div className="mb-4">
        <h1 className="text-xl font-extrabold text-foreground mb-2">איזה סוג סרטון בונים עכשיו?</h1>
        <p className="text-sm text-muted-foreground">
          בחרו כיוון אחד. אחר כך נקבל 4 הוקים ונבנה בריף ברור.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <InfoChip label="לקוח" value={project.client_name} />
        <InfoChip label="מטרה" value={project.main_goal} />
      </div>

      <div className="space-y-3 mb-8">
        {categories.map((cat, index) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
          >
            <OptionCard
              selected={selected === cat.id}
              onClick={() => setSelected(cat.id)}
              accentColor={cat.color}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{cat.emoji}</span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{cat.label}</h3>
                  <p className="text-xs text-muted-foreground">{cat.desc}</p>
                </div>
              </div>
            </OptionCard>
          </motion.div>
        ))}
      </div>

      <div className="space-y-3">
        <Button
          onClick={handleContinue}
          disabled={!selected}
          className="w-full h-14 rounded-2xl text-base font-bold gap-2 shadow-lg shadow-primary/20"
        >
          <Sparkles className="h-5 w-5" />
          תנו לי 4 הוקים
        </Button>

        <button
          onClick={() => navigate(`/project/${projectId}/creative-dna`)}
          className="w-full text-center text-sm text-muted-foreground font-medium flex items-center justify-center gap-1"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה
        </button>
      </div>
    </motion.div>
  );
}