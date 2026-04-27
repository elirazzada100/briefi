import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle, AlertTriangle, Database } from "lucide-react";

const TABLES = [
  { key: "VoiceRule", label: "Voice Rules", min: 5 },
  { key: "HookPattern", label: "Hook Patterns", min: 5 },
  { key: "CTAPattern", label: "CTA Patterns", min: 3 },
  { key: "ScriptPattern", label: "Script Patterns", min: 2 },
  { key: "CaptionPattern", label: "Caption Patterns", min: 2 },
  { key: "TrendPattern", label: "Trend Patterns", min: 2 },
  { key: "VoiceSample", label: "Voice Samples", min: 5 },
  { key: "BriefExample", label: "Brief Examples", min: 3 },
  { key: "SituationPattern", label: "Situation Patterns", min: 10 },
  { key: "BehaviorPattern", label: "Behavior Patterns", min: 3 },
  { key: "SpokenLine", label: "Spoken Lines", min: 10 },
  { key: "SceneStructure", label: "Scene Structures", min: 5 },
  { key: "PunchlinePattern", label: "Punchline Patterns", min: 3 },
  { key: "VisualProof", label: "Visual Proofs", min: 5 },
  { key: "AntiPattern", label: "Anti Patterns", min: 5 },
  { key: "PromptImprovementRule", label: "Prompt Rules", min: 0 },
  { key: "FeedbackLearningItem", label: "Learning Items", min: 0 },
  { key: "UserBriefFeedback", label: "User Feedback", min: 0 },
];

export default function ContentIntelligenceStatus() {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const results = await Promise.allSettled(
        TABLES.map(t => base44.entities[t.key].list())
      );
      const c = {};
      TABLES.forEach((t, i) => {
        c[t.key] = results[i].status === "fulfilled" ? results[i].value.length : "error";
      });
      setCounts(c);
      setLoading(false);
    };
    fetchAll();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  );

  const passing = TABLES.filter(t => counts[t.key] >= t.min && counts[t.key] !== "error");
  const failing = TABLES.filter(t => counts[t.key] !== "error" && counts[t.key] < t.min);
  const errors = TABLES.filter(t => counts[t.key] === "error");

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-green-700">{passing.length}</p>
          <p className="text-xs text-green-600 font-bold mt-0.5">עוברים</p>
        </div>
        <div className={`${failing.length > 0 ? "bg-amber-50" : "bg-muted/30"} rounded-2xl p-4 text-center`}>
          <p className={`text-2xl font-black ${failing.length > 0 ? "text-amber-700" : "text-muted-foreground"}`}>{failing.length}</p>
          <p className={`text-xs font-bold mt-0.5 ${failing.length > 0 ? "text-amber-600" : "text-muted-foreground"}`}>נמוכים ממינימום</p>
        </div>
        <div className={`${errors.length > 0 ? "bg-red-50" : "bg-muted/30"} rounded-2xl p-4 text-center`}>
          <p className={`text-2xl font-black ${errors.length > 0 ? "text-red-700" : "text-muted-foreground"}`}>{errors.length}</p>
          <p className={`text-xs font-bold mt-0.5 ${errors.length > 0 ? "text-red-600" : "text-muted-foreground"}`}>שגיאות</p>
        </div>
      </div>

      {/* Table list */}
      <div className="space-y-2">
        {TABLES.map(t => {
          const count = counts[t.key];
          const isError = count === "error";
          const isLow = !isError && count < t.min;
          const isOk = !isError && count >= t.min;

          return (
            <div key={t.key} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${
              isError ? "border-red-200 bg-red-50" : isLow ? "border-amber-200 bg-amber-50" : "border-border/40 bg-white"
            }`}>
              {isError ? (
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              ) : isLow ? (
                <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">{t.label}</p>
                <p className="text-[11px] text-muted-foreground">{t.key}</p>
              </div>
              <div className="text-left">
                {isError ? (
                  <span className="text-xs font-bold text-red-600">שגיאה</span>
                ) : (
                  <div>
                    <span className={`text-sm font-black ${isLow ? "text-amber-700" : "text-foreground"}`}>{count}</span>
                    {t.min > 0 && (
                      <span className="text-[10px] text-muted-foreground"> / {t.min} מינ׳</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}