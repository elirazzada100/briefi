import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
    return <LoadingState message="יוצרים את הפרויקט..." />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-8"
    >
      <div className="mb-8">
        <h1 className="text-xl font-extrabold text-foreground mb-2">ספרו לנו על העסק</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          אפשר לכתוב מבולגן. Briefi יסדר את זה לבריף ברור.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="text-sm font-bold">שם הלקוח</Label>
          <Input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="לדוגמה: בר שכונתי"
            className="h-12 rounded-xl text-sm"
            dir="rtl"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold">מה המטרה?</Label>
          <div className="flex flex-wrap gap-2">
            {goals.map((goal) => (
              <button
                key={goal}
                onClick={() => setMainGoal(goal)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border
                  ${mainGoal === goal
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card border-border text-foreground hover:border-primary/40"
                  }`}
              >
                {goal}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold">מה אתם יודעים על העסק?</Label>
          <Textarea
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
            placeholder="הדביקו כאן הערות מפגישת הלקוח, הודעות וואטסאפ, רעיונות, כל מה שיש..."
            className="min-h-[160px] rounded-xl text-sm leading-relaxed resize-none"
            dir="rtl"
          />
          <p className="text-[11px] text-muted-foreground">
            אפשר לכתוב חופשי. לא צריך בריף מסודר.
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full h-14 rounded-2xl text-base font-bold gap-2 shadow-lg shadow-primary/20"
        >
          <Sparkles className="h-5 w-5" />
          נתחו לי את העסק
        </Button>

        <button
          onClick={() => navigate(-1)}
          className="w-full text-center text-sm text-muted-foreground font-medium flex items-center justify-center gap-1"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה
        </button>
      </div>
    </motion.div>
  );
}