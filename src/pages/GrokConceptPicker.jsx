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

function CategoryConfirmStep({ categoryId, categoryNameHe, confidence, onConfirm, onChangeCategory }) {
  const [showPicker, setShowPicker] = useState(false);
  const [selected, setSelected] = useState(categoryId);

  if (showPicker) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-bold text-foreground">בחרו קטגוריה ידנית:</p>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
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
              {selected === cat.id && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
            </button>
          ))}
        </div>
        <button onClick={() => onChangeCategory(selected)} className="briefi-btn-primary w-full">
          <Check className="w-4 h-4" />
          אשרו קטגוריה זו
        </button>
        <button onClick={() => setShowPicker(false)} className="briefi-btn-ghost w-full">ביטול</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">זיהינו שהעסק מתאים ל:</p>
        <p className="text-xl font-black text-foreground">{categoryNameHe}</p>
        {confidence && confidence < 0.85 && (
          <p className="text-xs text-amber-600 font-medium">⚠ ביטחון: {Math.round(confidence * 100)}% — מומלץ לאשר</p>
        )}
      </div>
      <button onClick={onConfirm} className="briefi-btn-primary w-full">
        <Check className="w-4 h-4" />
        כן, זה נכון — המשיכו
      </button>
      <button onClick={() => setShowPicker(true)} className="briefi-btn-secondary w-full">
        שנה קטגוריה
      </button>
    </div>
  );
}

export default function GrokConceptPicker() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { project, loading: guardLoading } = useProjectGuard(projectId);

  // Stages: classifying → confirm_category → loading_concepts → concepts → selecting
  const [stage, setStage] = useState("classifying");
  const [classifyResult, setClassifyResult] = useState(null);
  const [categoryId, setCategoryId] = useState("");
  const [concepts, setConcepts] = useState([]);
  const [conceptSource, setConceptSource] = useState("concept_bank");
  const [error, setError] = useState(null);
  const [selectingIdx, setSelectingIdx] = useState(null);

  useEffect(() => {
    if (project) runClassify();
  }, [project]);

  const runClassify = async () => {
    setStage("classifying");
    setError(null);

    if (project.category_id) {
      // Already classified — skip confirmation, load concepts
      setCategoryId(project.category_id);
      await loadConcepts(project.category_id);
      return;
    }

    const res = await base44.functions.invoke("classifyBusinessCategory", {
      businessDescription: `${project.client_name}. ${project.main_goal}. ${project.raw_notes}`,
    });
    const data = res.data;
    if (data?.error) {
      setError("שגיאה בסיווג העסק. נסו שוב.");
      setStage("concepts");
      return;
    }
    setClassifyResult(data);
    setCategoryId(data.category_id);
    setStage("confirm_category");
  };

  const loadConcepts = async (catId) => {
    setStage("loading_concepts");
    setError(null);

    const business = {
      business_name: project.client_name,
      business_description: project.raw_notes,
      main_goal: project.main_goal,
    };

    const res = await base44.functions.invoke("grokBriefiFlow", {
      action: "generateConcepts",
      business,
      category_id: catId,
    });

    if (res.data?.error) {
      setError(res.data.error);
      setStage("concepts");
      return;
    }

    setConcepts(res.data?.concepts || []);
    setConceptSource(res.data?.source || "grok_generated");
    setStage("concepts");
  };

  const handleConfirmCategory = async () => {
    await base44.entities.Project.update(project.id, { category_id: categoryId });
    await loadConcepts(categoryId);
  };

  const handleChangeCategory = async (newCatId) => {
    setCategoryId(newCatId);
    await base44.entities.Project.update(project.id, { category_id: newCatId });
    await loadConcepts(newCatId);
  };

  const handleSelectConcept = async (concept, idx) => {
    setSelectingIdx(idx);
    setError(null);

    // Navigate to body picker with selected concept
    navigate(`/project/${projectId}/grok-body`, {
      state: {
        selectedConcept: concept,
        categoryId,
        business: {
          business_name: project.client_name,
          business_description: project.raw_notes,
          main_goal: project.main_goal,
        },
      },
    });
  };

  if (guardLoading || stage === "classifying") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <LoadingState message="מנתחים את העסק..." />
      </div>
    );
  }

  if (stage === "loading_concepts") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <LoadingState message="מוצאים קונספטים שמתאימים לעסק..." />
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
            {categoryId && stage === "concepts" && (
              <p className="text-[10px] text-muted-foreground">{categoryLabel}</p>
            )}
          </div>
          {stage === "concepts" && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">שלב 1 מתוך 4</span>
          )}
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
              <p className="text-sm text-muted-foreground mt-0.5">
                {conceptSource === "concept_bank"
                  ? "בחרו רעיון — ואנחנו נמשיך לבנות את מבנה הסרטון."
                  : "גרוק יצר קונספטים מותאמים לעסק. בחרו אחד להמשיך."
                }
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            {concepts.length === 0 && !error ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-sm">אין קונספטים זמינים.</p>
                <button onClick={() => loadConcepts(categoryId)} className="briefi-btn-secondary mt-4 mx-auto">
                  נסו שוב
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {concepts.map((concept, idx) => {
                  const name = concept.concept_name || concept.core_situation?.slice(0, 40) || `קונספט ${idx + 1}`;
                  const situation = concept.core_situation || "";
                  const tension = concept.human_tension || "";
                  const tags = concept.tone_tags || concept.best_for || [];
                  const isSelecting = selectingIdx === idx;

                  return (
                    <div key={idx} className="bg-white rounded-2xl border border-border/60 shadow-sm p-4 space-y-3">
                      <h3 className="font-black text-foreground text-base leading-snug">{name}</h3>
                      {situation && <p className="text-sm text-foreground/80 leading-relaxed">{situation}</p>}
                      {tension && <p className="text-xs text-muted-foreground italic">"{tension}"</p>}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((tag, ti) => (
                            <span key={ti} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/15">{tag}</span>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => handleSelectConcept(concept, idx)}
                        disabled={selectingIdx !== null}
                        className="briefi-btn-primary w-full"
                      >
                        <Sparkles className="w-4 h-4" />
                        {isSelecting ? "מעבד..." : "בחרו קונספט זה"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <button onClick={() => setStage("confirm_category")} className="briefi-btn-ghost w-full">
              שנה קטגוריה
            </button>
          </>
        )}
      </div>
    </div>
  );
}