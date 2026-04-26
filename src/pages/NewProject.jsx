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

export default function NewProject() {
  const navigate = useNavigate();
  const [clientName, setClientName] = useState("");
  const [mainGoal, setMainGoal] = useState("");
  const [rawNotes, setRawNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit = clientName.trim() && mainGoal && rawNotes.trim().length >= 10;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);

    const project = await base44.entities.Project.create({
      client_name: clientName.trim(),
      project_name: `בריפים - ${clientName.trim()}`,
      main_goal: mainGoal,
      raw_notes: rawNotes.trim(),
      status: "draft",
      completed_briefs_count: 0,
    });

    navigate(`/project/${project.id}/creative-dna`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-briefi-bg flex items-center justify-center" dir="rtl">
        <LoadingState message="יוצרים את הפרויקט..." />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="py-5"
      dir="rtl"
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-briefi-navy leading-tight mb-1">
          ספרו לנו על העסק
        </h1>
        <p className="text-sm text-briefi-secondary leading-relaxed">
          אפשר לכתוב מבולגן. Briefi יסדר את זה לבריף ברור.
        </p>
      </div>

      <div className="space-y-5">
        {/* Client name */}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-briefi-navy">שם הלקוח</label>
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="לדוגמה: בר שכונתי"
            dir="rtl"
            className="w-full h-12 rounded-full border border-border bg-white px-5 text-sm text-briefi-navy placeholder:text-briefi-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
          />
        </div>

        {/* Goal chips */}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-briefi-navy">מה המטרה?</label>
          <div className="flex flex-wrap gap-2">
            {goals.map((goal) => (
              <button
                key={goal}
                onClick={() => setMainGoal(goal)}
                className={`h-9 px-3.5 rounded-full text-[13px] font-semibold border transition-all whitespace-nowrap
                  ${mainGoal === goal
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-white border-border text-briefi-navy hover:border-primary/40"
                  }`}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>

        {/* Notes textarea */}
        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-briefi-navy">מה אתם יודעים על העסק?</label>
          <textarea
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
            placeholder="הדביקו כאן הערות מפגישת הלקוח, הודעות וואטסאפ, רעיונות, כל מה שיש..."
            dir="rtl"
            rows={6}
            className="w-full rounded-3xl border border-border bg-white px-5 py-4 text-sm text-briefi-navy placeholder:text-briefi-muted leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
          />
          <p className="text-[12px] text-briefi-muted">
            אפשר לכתוב חופשי. לא צריך בריף מסודר.
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full h-13 rounded-full text-[15px] font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]
            ${canSubmit
              ? "shadow-md shadow-primary/20 active:shadow-sm"
              : "opacity-50 cursor-not-allowed"
            }`}
          style={canSubmit ? { background: "linear-gradient(135deg, #6C35FF 0%, #249BFF 100%)" } : { background: "#9AA1AD" }}
        >
          <Sparkles className="h-4 w-4" />
          נתחו לי את העסק
        </button>

        <button
          onClick={() => navigate(-1)}
          className="w-full text-center text-sm text-briefi-muted font-medium flex items-center justify-center gap-1 py-1"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה
        </button>
      </div>
    </motion.div>
  );
}