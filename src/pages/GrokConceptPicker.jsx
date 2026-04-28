import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Sparkles } from "lucide-react";
import LoadingState from "@/components/shared/LoadingState";
import { useProjectGuard } from "@/hooks/useProjectGuard";

const CATEGORY_LABELS = {
  food_restaurants: "מסעדנות ואוכל",
  beauty_aesthetics: "יופי ואסתטיקה",
  fitness_nutrition: "פיטנס ותזונה",
  coaches_consultants: "מאמנים ויועצים",
  local_services: "שירותים מקומיים",
  real_estate_interiors: "נדל״ן ועיצוב",
  events_nightlife: "אירועים ולילה",
  fashion_boutiques: "אופנה ובוטיקים",
  parenting_family: "הורות ומשפחה",
  health_wellness: "בריאות ו-Wellness",
};

export default function GrokConceptPicker() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { project, loading: guardLoading } = useProjectGuard(projectId);

  const [concepts, setConcepts] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);
  const [adapting, setAdapting] = useState(false);
  const [adaptingIdx, setAdaptingIdx] = useState(null);

  useEffect(() => {
    if (project) loadConcepts();
  }, [project]);

  const loadConcepts = async () => {
    setLoading(true);

    // Classify if not already done
    let catId = project.category_id;
    if (!catId) {
      const res = await base44.functions.invoke("classifyBusinessCategory", {
        businessDescription: `${project.client_name}. ${project.main_goal}. ${project.raw_notes}`,
      });
      catId = res.data?.category_id || "food_restaurants";
      await base44.entities.Project.update(project.id, { category_id: catId });
    }
    setCategoryId(catId);

    // Fetch up to 4 active concepts from ConceptBank
    const all = await base44.entities.ConceptBank.filter({ category_id: catId, is_active: true });
    // Shuffle and take 4
    const shuffled = all.sort(() => Math.random() - 0.5).slice(0, 4);
    setConcepts(shuffled);
    setLoading(false);
  };

  const handleSelect = async (concept, idx) => {
    setAdapting(true);
    setAdaptingIdx(idx);

    const business = {
      business_name: project.client_name,
      business_description: project.raw_notes,
      category_id: categoryId,
      main_goal: project.main_goal,
    };

    const res = await base44.functions.invoke("adaptConceptToBusiness", {
      business,
      selectedConcept: concept,
    });

    const adapted = res.data;

    // Save as a VideoBrief
    const existingBriefs = await base44.entities.VideoBrief.filter({ project_id: project.id });
    const brief = await base44.entities.VideoBrief.create({
      project_id: project.id,
      category: categoryId,
      brief_title: adapted.adapted_concept_name || concept.concept_name,
      video_concept: adapted.one_sentence_concept,
      hook: adapted.opening_line,
      script_text: adapted.shooting_brief?.map(s => s.spoken_line).filter(Boolean).join("\n"),
      shot_structure: adapted.shooting_brief?.map((s, i) => ({
        step: i + 1,
        visual: s.shot,
        spoken_or_overlay_text: s.spoken_line || s.on_screen_text,
      })),
      cta: adapted.cta,
      caption_suggestion: adapted.caption,
      production_notes: adapted.why_it_fits_this_business,
      idea_tags: concept.tone_tags || [],
      script_format: "person_to_camera",
    });

    // Update project brief count
    await base44.entities.Project.update(project.id, {
      completed_briefs_count: (existingBriefs.length || 0) + 1,
      status: "in_progress",
    });

    setAdapting(false);
    navigate(`/project/${project.id}/final-brief`, {
      state: { briefId: brief.id, adapted, concept }
    });
  };

  if (guardLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <LoadingState message="מוצאים קונספטים שמתאימים לעסק..." />
      </div>
    );
  }

  if (adapting) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <LoadingState message="מתאימים את הקונספט לעסק..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <p className="text-xs font-bold text-foreground">{project?.client_name}</p>
            {categoryId && (
              <p className="text-[10px] text-muted-foreground">{CATEGORY_LABELS[categoryId] || categoryId}</p>
            )}
          </div>
        </div>
      </div>

      <div className="briefi-page-container space-y-4">
        <div>
          <h1 className="text-xl font-black text-foreground">בחרו קונספט לסרטון</h1>
          <p className="text-sm text-muted-foreground mt-0.5">כל קונספט יותאם בדיוק לעסק שלכם.</p>
        </div>

        {concepts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">אין קונספטים זמינים לקטגוריה הזאת עדיין.</p>
            <p className="text-xs text-muted-foreground mt-1">הוסיפו קונספטים ל-ConceptBank דרך הניהול.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {concepts.map((concept, idx) => (
              <div key={concept.id} className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 space-y-3">
                <h3 className="font-black text-foreground text-base leading-snug">{concept.concept_name}</h3>
                <p className="text-sm text-foreground/80 leading-relaxed">{concept.core_situation}</p>

                {concept.human_tension && (
                  <p className="text-xs text-muted-foreground italic">"{concept.human_tension}"</p>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {(concept.tone_tags || []).map(tag => (
                    <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/15">{tag}</span>
                  ))}
                </div>

                <button
                  onClick={() => handleSelect(concept, idx)}
                  disabled={adapting}
                  className="briefi-btn-primary w-full"
                >
                  <Sparkles className="w-4 h-4" />
                  בנו לי בריף על הקונספט הזה
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}