import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Sparkles, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import LoadingState from "@/components/shared/LoadingState";
import BriefiStepper from "@/components/briefi/BriefiStepper";

const FORMAT_LABELS = {
  person_to_camera: "דיבור למצלמה",
  voiceover: "ווייסאובר",
  dialogue: "דיאלוג",
  text_only: "טקסט בלבד",
  acted_scene: "סצנה מיוצגת",
};

export default function GrokBodyPicker() {
  const { projectId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const selectedConcept = state?.selectedConcept;
  const selectedVideoStyle = state?.selectedVideoStyle;
  const categoryId = state?.categoryId;
  const business = state?.business;
  const businessAnalysis = state?.businessAnalysis;

  const [bodyOptions, setBodyOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedIdx, setExpandedIdx] = useState(null);
  const [selectingIdx, setSelectingIdx] = useState(null);

  // Guard: must have concept
  useEffect(() => {
    if (!selectedConcept || !business) {
      navigate(`/project/${projectId}/grok-concepts`);
      return;
    }
    loadBodyOptions();
  }, []);

  const loadBodyOptions = async () => {
    setLoading(true);
    setError(null);

    const res = await base44.functions.invoke("grokBriefiFlow", {
      action: "generateBodyOptions",
      business,
      selectedConcept,
      category_id: categoryId,
    });

    if (res.data?.error) {
      setError(res.data.error);
      setLoading(false);
      return;
    }

    setBodyOptions(res.data?.body_options || []);
    setLoading(false);
  };

  const handleSelectBody = (bodyOption, idx) => {
    setSelectingIdx(idx);
    navigate(`/project/${projectId}/grok-cta`, {
      state: {
        selectedConcept,
        selectedBody: bodyOption,
        selectedVideoStyle,
        categoryId,
        business,
        businessAnalysis,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <LoadingState message="מסדרים לך רעיון" />
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
            <p className="text-xs font-bold text-foreground truncate">{selectedConcept?.concept_title || selectedConcept?.concept_name || "קונספט נבחר"}</p>
            <p className="text-[10px] text-muted-foreground">בחרו מבנה סרטון</p>
          </div>
        </div>
        <div className="mt-2">
          <BriefiStepper currentStep={5} />
        </div>
      </div>

      <div className="briefi-page-container space-y-4">
        <div>
          <h1 className="text-xl font-black text-foreground">בחרו מבנה לסרטון</h1>
          <p className="text-sm text-muted-foreground mt-0.5">4 דרכים שונות לצלם את אותו קונספט. בחרו אחת.</p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-700 font-medium">{error}</p>
              <button onClick={loadBodyOptions} className="text-xs text-red-600 underline mt-1">נסו שוב</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {bodyOptions.map((option, idx) => {
            const isExpanded = expandedIdx === idx;
            const formatLabel = FORMAT_LABELS[option.script_format] || option.script_format || "";

            return (
              <div key={idx} className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
                <div className="p-4 space-y-3">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-black text-foreground text-base leading-snug">{option.body_title}</h3>
                      {formatLabel && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground mt-1 inline-block">{formatLabel}</span>
                      )}
                    </div>
                    <button
                      onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 flex-shrink-0"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Scene preview */}
                  <p className="text-sm text-foreground/80 leading-relaxed">{option.scene_preview}</p>

                  {/* Practical note */}
                  {option.practical_note && (
                    <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                      🎬 {option.practical_note}
                    </p>
                  )}

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="space-y-3 pt-2 border-t border-muted animate-fade-in">
                      {option.shot_sequence?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">מבנה צילום</p>
                          <div className="space-y-1.5">
                            {option.shot_sequence.map((shot, si) => (
                              <div key={si} className="flex items-start gap-2.5">
                                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{si + 1}</div>
                                <p className="text-sm text-foreground">{shot}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {option.spoken_lines?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">שורות דיבור</p>
                          {option.spoken_lines.map((line, li) => (
                            <p key={li} className="text-sm text-foreground italic bg-primary/5 rounded-lg px-3 py-1.5 mb-1">"{line}"</p>
                          ))}
                        </div>
                      )}
                      {option.on_screen_text?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">טקסטים למסך</p>
                          {option.on_screen_text.map((text, ti) => (
                            <p key={ti} className="text-sm text-foreground font-medium bg-muted/40 rounded-lg px-3 py-1.5 mb-1">{text}</p>
                          ))}
                        </div>
                      )}
                      {option.visual_shots_needed?.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-muted-foreground mb-2 uppercase tracking-wide">צילומים נדרשים</p>
                          {option.visual_shots_needed.map((shot, vi) => (
                            <p key={vi} className="text-xs text-muted-foreground">• {shot}</p>
                          ))}
                        </div>
                      )}
                      {option.why_this_works && (
                        <div>
                          <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wide">למה זה עובד</p>
                          <p className="text-sm text-muted-foreground">{option.why_this_works}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => handleSelectBody(option, idx)}
                    disabled={selectingIdx !== null}
                    className="briefi-btn-primary w-full"
                  >
                    <Sparkles className="w-4 h-4" />
                    {selectingIdx === idx ? "ממשיכים..." : "בחרו מבנה זה"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
