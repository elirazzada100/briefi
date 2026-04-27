import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Check } from "lucide-react";
import StepProgress from "@/components/shared/StepProgress";
import LoadingState from "@/components/shared/LoadingState";
import { useProjectGuard } from "@/hooks/useProjectGuard";

const HOOK_BANK_INTERNAL_STYLES = [
  "תדמית", "סרטון אווירה", "סרטון הכרות", "מכירתי", "כאב / פתרון",
  "אדם מדבר למצלמה", "חינוכי", "השוואה", "מיתוס / ניפוץ", "הוכחה / סמכות", "יום בחיי"
];

const categories = [
  { id: "מצחיק", label: "מצחיק", emoji: "😂", color: "#F59E0B", bg: "#FEF3C7", desc: "קלילות, תשומת לב, שיתופים" },
  { id: "תדמית", label: "תדמית", emoji: "💎", color: "#7C3AED", bg: "#EDE9FE", desc: "אמון, מקצועיות, בהירות" },
  { id: "סרטון אווירה", label: "סרטון אווירה", emoji: "🌿", color: "#10B981", bg: "#D1FAE5", desc: "תחושה, מקום, חוויה" },
  { id: "סרטון היכרות", label: "סרטון היכרות", emoji: "👋", color: "#3B82F6", bg: "#DBEAFE", desc: "אנשים, סיפור, עסק" },
  { id: "מכירתי", label: "מכירתי", emoji: "🛒", color: "#F97316", bg: "#FFEDD5", desc: "פעולה, מכירות, לידים" },
  { id: "כאב / פתרון", label: "כאב / פתרון", emoji: "💡", color: "#EC4899", bg: "#FCE7F3", desc: "בעיה אמיתית → פתרון ברור" },
  { id: "טרנדי", label: "טרנדי", emoji: "🔥", color: "#14B8A6", bg: "#CCFBF1", desc: "פורמט עכשווי, מהיר, חברתי" },
];

export default function CategoryPicker() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const { project, loading: guardLoading } = useProjectGuard(projectId);

  const handleContinue = async () => {
    if (!selected || !project) return;
    setLoading(true);

    const isHookBankStyle = HOOK_BANK_INTERNAL_STYLES.includes(selected);

    if (isHookBankStyle) {
      // Hook-bank driven mode: skip manual hook selection
      const existingBriefs = await base44.entities.VideoBrief.filter({ project_id: projectId });
      const existingCategories = existingBriefs.map(b => b.category).filter(Boolean);

      const response = await base44.functions.invoke("generateConceptsFromHookBank", {
        project_id: projectId,
        client_name: project.client_name,
        main_goal: project.main_goal,
        raw_notes: project.raw_notes,
        industry: project.industry || "general",
        creative_dna: project.creative_dna || {},
        selected_video_style: selected,
        existing_categories: existingCategories,
      });

      const concepts = (response.data?.concepts || []).map(c => ({
        concept_title: c.concept_title,
        short_description: c.short_description,
        hook_preview: c.filled_hook,
        idea_tags: c.idea_tags || [],
        why_it_works: c.why_it_works,
        scene_type: "talking_head",
        full_scene_data: c.full_concept_data || {},
        _hook_bank_mode: true,
        _generation_run_id: response.data?.generation_run_id,
        source_hook_template_id: c.source_hook_template_id,
      }));

      setLoading(false);
      navigate(`/project/${projectId}/concepts`, {
        state: { concepts, category: selected, hookBankMode: true }
      });
    } else {
      // Classic mode: generate concepts, then user picks hook
      const response = await base44.functions.invoke("briefiAI", {
        action: "generateVideoConcepts",
        project_id: projectId,
        client_name: project.client_name,
        main_goal: project.main_goal,
        raw_notes: project.raw_notes,
        creative_dna: project.creative_dna || {},
        selected_category: selected,
      });

      const concepts = response.data?.concepts || [];
      setLoading(false);
      navigate(`/project/${projectId}/concepts`, { state: { concepts, category: selected, hookBankMode: false } });
    }
  };

  const selectedCat = categories.find(c => c.id === selected);
  const isHookBankSelected = selected && HOOK_BANK_INTERNAL_STYLES.includes(selected);

  if (guardLoading || !project || loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <LoadingState message={loading ? (isHookBankSelected ? "מייצרים 20 קונספטים עם בנק ההוקים ומסננים את 4 הטובים..." : "מייצרים 4 קונספטים...") : "טוען..."} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">{project?.client_name}</p>
          </div>
        </div>
        <div className="mt-1">
          <StepProgress currentStep={1} />
        </div>
      </div>

      <div className="briefi-page-container">
        <div className="mb-5">
          <h1 className="text-xl font-black text-foreground">איזה סוג סרטון?</h1>
          <p className="text-sm text-muted-foreground mt-1">בחרו כיוון אחד ונייצר 4 קונספטים.</p>
        </div>

        <div className="grid grid-cols-1 gap-2.5 mb-6">
          {categories.map((cat, index) => {
            const isSelected = selected === cat.id;
            return (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => setSelected(cat.id)}
                className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border-2 text-right transition-all duration-200
                  ${isSelected
                    ? "border-transparent shadow-md"
                    : "border-border/60 bg-white hover:border-primary/25 hover:shadow-sm"
                  }`}
                style={isSelected ? {
                  background: `linear-gradient(135deg, ${cat.bg} 0%, white 100%)`,
                  borderColor: cat.color,
                  boxShadow: `0 0 0 2px ${cat.color}30, 0 4px 12px ${cat.color}20`
                } : {}}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: cat.bg, flexShrink: 0 }}
                >
                  {cat.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-foreground text-sm">{cat.label}</p>
                    {cat.hookBank && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary leading-none">⚡ AI הוק</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{cat.desc}</p>
                </div>
                {isSelected && (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: cat.color }}
                  >
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="space-y-2.5">
          <button
            onClick={handleContinue}
            disabled={!selected}
            className="briefi-btn-primary w-full"
          >
            <Sparkles className="h-4 w-4" />
            תנו לי 4 קונספטים
          </button>
          <button
            onClick={() => navigate(-1)}
            className="briefi-btn-ghost w-full"
          >
            <ArrowRight className="h-4 w-4" />
            חזרה
          </button>
        </div>
      </div>
    </div>
  );
}