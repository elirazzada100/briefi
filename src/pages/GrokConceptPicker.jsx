import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Sparkles, Check, AlertCircle } from "lucide-react";
import LoadingState from "@/components/shared/LoadingState";
import { useProjectGuard } from "@/hooks/useProjectGuard";

const CATEGORIES = [
  { id: "food_restaurants", label: "מסעדנות ואוכל" },
  { id: "beauty_aesthetics", label: "יופי ואסתטיקה" },
  { id: "fitness_nutrition", label: "פיטנס ותזונה" },
  { id: "coaches_consultants", label: "מאמנים ויועצים" },
  { id: "local_services", label: "שירותים מקומיים" },
  { id: "real_estate_interiors", label: "נדל״ן ועיצוב" },
  { id: "events_nightlife", label: "אירועים ולילה" },
  { id: "fashion_boutiques", label: "אופנה ובוטיקים" },
  { id: "parenting_family", label: "הורות, ילדים, משפחה וצעצועים" },
  { id: "health_wellness", label: "בריאות ו-Wellness" },
];

const CONCEPT_REQUIRED_FIELDS = [
  "id", "category_id", "concept_name", "core_situation",
  "natural_opening_line", "human_tension", "scene_logic", "punchline",
  "visual_proofs", "cta_options"
];

function validateAdaptedBrief(adapted) {
  if (!adapted) return false;
  if (!adapted.adapted_concept_name) return false;
  if (!adapted.opening_line) return false;
  if (!adapted.one_sentence_concept) return false;
  if (!adapted.caption) return false;
  if (!adapted.cta) return false;
  if (!Array.isArray(adapted.shooting_brief) || adapted.shooting_brief.length < 3) return false;
  return true;
}

function validateConcept(concept) {
  if (!concept) return null;
  const missing = CONCEPT_REQUIRED_FIELDS.filter(f => {
    const val = concept[f];
    if (val === undefined || val === null || val === "") return true;
    if (Array.isArray(val) && val.length === 0) return true;
    return false;
  });
  return missing.length === 0 ? null : missing;
}

// ── Stage: category confirmation ──────────────────────────────────────────────
function CategoryConfirmStep({ categoryId, categoryNameHe, confidence, onConfirm, onChangeCategory }) {
  const [showPicker, setShowPicker] = useState(false);
  const [selected, setSelected] = useState(categoryId);

  if (showPicker) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-bold text-foreground">בחרו קטגוריה ידנית:</p>
        <div className="space-y-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelected(cat.id)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-right transition-all ${
                selected === cat.id
                  ? "border-primary/60 bg-primary/5"
                  : "border-border bg-white hover:border-primary/20"
              }`}
            >
              <span className="text-sm font-medium text-foreground">{cat.label}</span>
              {selected === cat.id && <Check className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
        <button
          onClick={() => onChangeCategory(selected)}
          className="briefi-btn-primary w-full"
        >
          <Check className="w-4 h-4" />
          אשרו קטגוריה זו
        </button>
        <button onClick={() => setShowPicker(false)} className="briefi-btn-ghost w-full">
          ביטול
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">זיהינו שהעסק מתאים ל:</p>
        <p className="text-lg font-black text-foreground">{categoryNameHe}</p>
        {confidence < 0.85 && (
          <p className="text-xs text-amber-600 font-medium">⚠ רמת הביטחון בסיווג: {Math.round(confidence * 100)}% — מומלץ לאשר</p>
        )}
      </div>
      <button onClick={onConfirm} className="briefi-btn-primary w-full">
        <Check className="w-4 h-4" />
        כן, להמשיך
      </button>
      <button onClick={() => setShowPicker(true)} className="briefi-btn-secondary w-full">
        שנה קטגוריה
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GrokConceptPicker() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { project, loading: guardLoading } = useProjectGuard(projectId);

  // Stages: "classifying" | "confirm_category" | "concepts" | "adapting"
  const [stage, setStage] = useState("classifying");
  const [classifyResult, setClassifyResult] = useState(null);
  const [categoryId, setCategoryId] = useState("");
  const [concepts, setConcepts] = useState([]);
  const [adaptError, setAdaptError] = useState(null);

  useEffect(() => {
    if (project) runClassify();
  }, [project]);

  const runClassify = async () => {
    setStage("classifying");
    // Use stored category if already classified
    if (project.category_id) {
      setCategoryId(project.category_id);
      await fetchConcepts(project.category_id);
      setStage("concepts");
      return;
    }
    const res = await base44.functions.invoke("classifyBusinessCategory", {
      businessDescription: `${project.client_name}. ${project.main_goal}. ${project.raw_notes}`,
    });
    const data = res.data;
    setClassifyResult(data);
    setCategoryId(data.category_id);
    setStage("confirm_category");
  };

  const fetchConcepts = async (catId) => {
    const all = await base44.entities.ConceptBank.filter({ category_id: catId, is_active: true });
    const shuffled = all.sort(() => Math.random() - 0.5).slice(0, 4);
    setConcepts(shuffled);
  };

  const handleConfirmCategory = async () => {
    await base44.entities.Project.update(project.id, { category_id: categoryId });
    await fetchConcepts(categoryId);
    setStage("concepts");
  };

  const handleChangeCategory = async (newCatId) => {
    setCategoryId(newCatId);
    await base44.entities.Project.update(project.id, { category_id: newCatId });
    await fetchConcepts(newCatId);
    setStage("concepts");
  };

  const handleSelect = async (concept) => {
    setAdaptError(null);

    // Validate concept has all required fields
    const missingFields = validateConcept(concept);
    if (missingFields) {
      setAdaptError(`הקונספט חסר שדות: ${missingFields.join(", ")}. נסו קונספט אחר.`);
      return;
    }

    setStage("adapting");

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

    // Guard: adapted brief must have all required fields
    if (!validateAdaptedBrief(adapted)) {
      setAdaptError("משהו לא עבר טוב ביצירת הבריף. נסו לבחור קונספט שוב.");
      setStage("concepts");
      return;
    }

    // Save as VideoBrief — map Grok output fields explicitly
    const shootingText = adapted.shooting_brief
      .map((s, i) => `סצנה ${s.scene || i + 1}: ${s.shot || ""}${s.spoken_line ? `\nדיאלוג: ${s.spoken_line}` : ""}${s.on_screen_text ? `\nטקסט על מסך: ${s.on_screen_text}` : ""}${s.camera_note ? `\nהערת מצלמה: ${s.camera_note}` : ""}`)
      .join("\n\n");

    const existingBriefs = await base44.entities.VideoBrief.filter({ project_id: project.id });
    const brief = await base44.entities.VideoBrief.create({
      project_id: project.id,
      category: categoryId,
      brief_title: adapted.adapted_concept_name,
      video_concept: adapted.one_sentence_concept,
      hook: adapted.opening_line,
      script_text: shootingText,
      shot_structure: adapted.shooting_brief.map((s, i) => ({
        step: s.scene || i + 1,
        visual: s.shot,
        spoken_or_overlay_text: s.spoken_line || s.on_screen_text,
        camera_note: s.camera_note,
      })),
      cta: adapted.cta,
      caption_suggestion: adapted.caption,
      production_notes: adapted.why_it_fits_this_business,
      visual_must_haves: adapted.visual_must_haves || [],
      risk_notes: adapted.risk_notes || "",
      idea_tags: concept.tone_tags || [],
      script_format: "person_to_camera",
      // Store adapted data for FinalBrief to read
      adapted_brief: adapted,
    });

    await base44.entities.Project.update(project.id, {
      completed_briefs_count: (existingBriefs.length || 0) + 1,
      status: "in_progress",
    });

    navigate(`/project/${project.id}/final-brief`, {
      state: { briefId: brief.id, adapted, concept }
    });
  };

  // ── Loading states ──────────────────────────────────────────────────────────
  if (guardLoading || stage === "classifying") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <LoadingState message="מנתחים את העסק ומוצאים קטגוריה..." />
      </div>
    );
  }

  if (stage === "adapting") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <LoadingState message="מתאימים את הקונספט לעסק..." />
      </div>
    );
  }

  const categoryLabel = CATEGORIES.find(c => c.id === categoryId)?.label || categoryId;

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
              <p className="text-[10px] text-muted-foreground">{categoryLabel}</p>
            )}
          </div>
        </div>
      </div>

      <div className="briefi-page-container space-y-4">

        {/* ── Stage: confirm category ── */}
        {stage === "confirm_category" && classifyResult && (
          <>
            <div>
              <h1 className="text-xl font-black text-foreground">אישור קטגוריה</h1>
              <p className="text-sm text-muted-foreground mt-0.5">לפני שמוצאים קונספטים, בדקו שהקטגוריה נכונה.</p>
            </div>
            <CategoryConfirmStep
              categoryId={categoryId}
              categoryNameHe={classifyResult.category_name_he}
              confidence={classifyResult.confidence}
              onConfirm={handleConfirmCategory}
              onChangeCategory={handleChangeCategory}
            />
          </>
        )}

        {/* ── Stage: concept selection ── */}
        {stage === "concepts" && (
          <>
            <div>
              <h1 className="text-xl font-black text-foreground">בחרו קונספט לסרטון</h1>
              <p className="text-sm text-muted-foreground mt-0.5">כל קונספט יותאם בדיוק לעסק שלכם.</p>
            </div>

            {adaptError && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{adaptError}</p>
              </div>
            )}

            {concepts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">אין קונספטים זמינים לקטגוריה הזאת עדיין.</p>
                <p className="text-xs text-muted-foreground mt-1">הוסיפו קונספטים ל-ConceptBank דרך הניהול.</p>
                <button
                  onClick={() => setStage("confirm_category")}
                  className="briefi-btn-secondary mt-4"
                >
                  שנה קטגוריה
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {concepts.map((concept) => (
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
                      onClick={() => handleSelect(concept)}
                      className="briefi-btn-primary w-full"
                    >
                      <Sparkles className="w-4 h-4" />
                      בנו לי בריף על הקונספט הזה
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}