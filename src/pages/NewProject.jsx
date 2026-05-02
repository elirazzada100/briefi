import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import LoadingState from "@/components/shared/LoadingState";

const goals = [
  "יותר פניות",
  "יותר מכירות",
  "יותר חשיפה",
  "חיזוק תדמית",
  "היכרות עם העסק",
  "אחר",
];

const QUICK_COUNTS = [3, 5, 8, 10];

export default function NewProject() {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState("");
  const [mainGoal, setMainGoal] = useState("");
  const [rawNotes, setRawNotes] = useState("");
  const [briefVideoCount, setBriefVideoCount] = useState(8);
  const [loading, setLoading] = useState(false);

  const canSubmit = clientName.trim() && mainGoal && rawNotes.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);

    const user = await base44.auth.me();
    const project = await base44.entities.Project.create({
      client_name: clientName.trim(),
      project_name: `בריפים - ${clientName.trim()}`,
      main_goal: mainGoal,
      raw_notes: rawNotes.trim(),
      status: "draft",
      completed_briefs_count: 0,
      owner_id: user.id,
      brief_video_count: briefVideoCount,
    });

    navigate(`/project/${project.id}/creative-dna`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <LoadingState message="יוצרים את הפרויקט..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-6 px-4" dir="rtl">
      <div className="max-w-md mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5 hover:text-foreground transition-colors"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה
        </button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-white rounded-3xl border border-border/60 shadow-sm p-6 space-y-5"
        >
          {/* Header */}
          <div>
            <h1 className="text-xl font-black text-foreground leading-tight">ספרו לנו על העסק</h1>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              כמה מילים יעזרו לנו לבנות בריף מדויק יותר.
            </p>
          </div>

          {/* Client name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-foreground/70 tracking-wide uppercase">שם הלקוח / העסק</label>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="לדוגמה: בר שכונתי"
              dir="rtl"
              className="briefi-input"
            />
          </div>

          {/* Goal */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-foreground/70 tracking-wide uppercase">מה המטרה?</label>
            <div className="flex flex-wrap gap-2">
              {goals.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  onClick={() => setMainGoal(goal)}
                  className={`briefi-chip ${mainGoal === goal ? "briefi-chip-active" : "briefi-chip-inactive"}`}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>

          {/* Video count stepper */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-foreground/70 tracking-wide uppercase">כמה סרטונים תרצו לבנות?</label>
            <p className="text-[11px] text-muted-foreground">אפשר לבחור בין 1 ל־10. תמיד אפשר להתחיל קטן ולהוסיף עוד בהמשך.</p>
            {/* Quick picks */}
            <div className="flex gap-2">
              {QUICK_COUNTS.map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setBriefVideoCount(n)}
                  className={`flex-1 h-9 rounded-xl text-sm font-bold border transition-all ${briefVideoCount === n ? "briefi-chip-active border-transparent" : "briefi-chip-inactive"}`}
                >
                  {n}
                </button>
              ))}
            </div>
            {/* Stepper */}
            <div className="flex items-center justify-between bg-muted/40 rounded-2xl px-4 py-3">
              <button
                type="button"
                onClick={() => setBriefVideoCount(v => Math.max(1, v - 1))}
                className="w-8 h-8 rounded-full bg-white border border-border text-lg font-bold flex items-center justify-center hover:border-primary/40 transition-colors disabled:opacity-30"
                disabled={briefVideoCount <= 1}
              >−</button>
              <span className="text-base font-black text-foreground">{briefVideoCount} סרטונים</span>
              <button
                type="button"
                onClick={() => setBriefVideoCount(v => Math.min(10, v + 1))}
                className="w-8 h-8 rounded-full bg-white border border-border text-lg font-bold flex items-center justify-center hover:border-primary/40 transition-colors disabled:opacity-30"
                disabled={briefVideoCount >= 10}
              >+</button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-foreground/70 tracking-wide uppercase">מה אתם יודעים על העסק?</label>
            <textarea
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              placeholder="הדביקו הערות מהפגישה, הודעות ווטסאפ, רעיונות חופשיים, כל מה שיש..."
              dir="rtl"
              rows={5}
              className="briefi-textarea"
            />
            <p className="text-[11px] text-muted-foreground">
              אפשר לכתוב חופשי. לא צריך בריף מסודר.
            </p>
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
              אל תכניסו מידע רגיש, סודי או אישי שאין לכם רשות להשתמש בו.
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="briefi-btn-primary w-full"
          >
            <Sparkles className="h-4 w-4" />
            המשיכו לניתוח העסק
          </button>
        </motion.div>
      </div>
    </div>
  );
}