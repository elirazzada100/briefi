import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ChevronDown, ChevronUp, Plus, Loader2 } from "lucide-react";
import ConvertFeedbackModal from "./ConvertFeedbackModal";

const TAG_COLORS = {
  "מעולה": "bg-green-100 text-green-700",
  "סבבה": "bg-blue-100 text-blue-700",
  "תיאורטי מדי": "bg-orange-100 text-orange-700",
  "לא פרקטי לצילום": "bg-red-100 text-red-700",
  "מוזר / לא ישראלי": "bg-purple-100 text-purple-700",
  "לא מצחיק": "bg-yellow-100 text-yellow-700",
  "הוק חלש": "bg-pink-100 text-pink-700",
  "אין פאנץ׳": "bg-red-100 text-red-700",
};

export default function FeedbackQueue() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [convertTarget, setConvertTarget] = useState(null);

  useEffect(() => {
    base44.entities.UserBriefFeedback.list("-created_date", 50).then(data => {
      setFeedbacks(data);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  );

  if (!feedbacks.length) return (
    <div className="text-center py-16 text-muted-foreground text-sm">
      אין פידבק עדיין.
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-black text-foreground text-base">תור פידבק ({feedbacks.length})</h2>
      </div>

      {feedbacks.map(fb => {
        const isExpanded = expandedId === fb.id;
        const tags = fb.selected_feedback_tags || [];
        const isPositive = tags.includes("מעולה") || tags.includes("סבבה");

        return (
          <div key={fb.id} className={`bg-white rounded-2xl border overflow-hidden ${isPositive ? "border-green-200" : "border-border/60"}`}>
            <div
              className="p-4 cursor-pointer flex items-start gap-3"
              onClick={() => setExpandedId(isExpanded ? null : fb.id)}
            >
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${isPositive ? "bg-green-500" : "bg-orange-400"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {fb.rating_label && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TAG_COLORS[fb.rating_label] || "bg-muted text-muted-foreground"}`}>
                      {fb.rating_label}
                    </span>
                  )}
                  {fb.category && (
                    <span className="text-[10px] text-muted-foreground font-medium">{fb.category}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">{new Date(fb.created_date).toLocaleDateString("he-IL")}</span>
                </div>

                {tags.filter(t => t !== fb.rating_label).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {tags.filter(t => t !== fb.rating_label).map(t => (
                      <span key={t} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${TAG_COLORS[t] || "bg-muted text-muted-foreground"}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {fb.free_text_negative && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    ✗ {fb.free_text_negative}
                  </p>
                )}
              </div>
              <button className="text-muted-foreground flex-shrink-0">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {isExpanded && (
              <div className="border-t border-muted px-4 pb-4 pt-3 space-y-3 animate-fade-in">
                {fb.free_text_negative && (
                  <div>
                    <p className="text-[11px] font-bold text-red-600 mb-1">מה לא עבד:</p>
                    <p className="text-sm text-foreground bg-red-50 rounded-xl px-3 py-2">{fb.free_text_negative}</p>
                  </div>
                )}
                {fb.free_text_positive && (
                  <div>
                    <p className="text-[11px] font-bold text-green-600 mb-1">מה כן עבד:</p>
                    <p className="text-sm text-foreground bg-green-50 rounded-xl px-3 py-2">{fb.free_text_positive}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => setConvertTarget({ feedback: fb, type: "anti_pattern" })}
                    className="text-xs px-3 py-1.5 rounded-xl bg-red-50 text-red-700 font-bold hover:bg-red-100 transition-colors"
                  >
                    → AntiPattern
                  </button>
                  <button
                    onClick={() => setConvertTarget({ feedback: fb, type: "voice_sample" })}
                    className="text-xs px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 font-bold hover:bg-purple-100 transition-colors"
                  >
                    → VoiceSample
                  </button>
                  <button
                    onClick={() => setConvertTarget({ feedback: fb, type: "prompt_rule" })}
                    className="text-xs px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition-colors"
                  >
                    → PromptRule
                  </button>
                  <button
                    onClick={() => setConvertTarget({ feedback: fb, type: "learning_item" })}
                    className="text-xs px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 font-bold hover:bg-amber-100 transition-colors"
                  >
                    → LearningItem
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {convertTarget && (
        <ConvertFeedbackModal
          target={convertTarget}
          onClose={() => setConvertTarget(null)}
          onSaved={() => setConvertTarget(null)}
        />
      )}
    </div>
  );
}