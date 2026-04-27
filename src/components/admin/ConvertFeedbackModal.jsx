import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Check, Loader2 } from "lucide-react";

const TYPE_LABELS = {
  anti_pattern: "AntiPattern חדש",
  voice_sample: "VoiceSample חדש",
  prompt_rule: "PromptImprovementRule חדש",
  learning_item: "FeedbackLearningItem חדש",
};

export default function ConvertFeedbackModal({ target, onClose, onSaved }) {
  const { feedback, type } = target;
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [fields, setFields] = useState(() => {
    const neg = feedback.free_text_negative || "";
    const pos = feedback.free_text_positive || "";
    if (type === "anti_pattern") return {
      industry: feedback.industry || "food_general",
      bad_pattern: neg,
      why_bad: "",
      better_direction: pos,
    };
    if (type === "voice_sample") return {
      industry: feedback.industry || "food_general",
      category: feedback.category || "",
      sample_type: "bad",
      input_text: neg,
      output_text: pos,
      rating: "bad",
      why: "",
    };
    if (type === "prompt_rule") return {
      industry: feedback.industry || "",
      category: feedback.category || "",
      rule_text: neg || "",
      bad_example: neg,
      good_example: pos,
    };
    // learning_item
    return {
      industry: feedback.industry || "",
      category: feedback.category || "",
      learning_type: "bad_pattern",
      problem_detected: neg,
      suggested_fix: pos,
      example_bad: neg,
      example_better: pos,
      status: "pending_admin_review",
    };
  });

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...fields, source_batch: "feedback_converted", is_active: true };
    if (type === "anti_pattern") {
      await base44.entities.AntiPattern.create(payload);
    } else if (type === "voice_sample") {
      await base44.entities.VoiceSample.create(payload);
    } else if (type === "prompt_rule") {
      await base44.entities.PromptImprovementRule.create(payload);
    } else {
      await base44.entities.FeedbackLearningItem.create({ ...fields, source_feedback_id: feedback.id });
    }
    setSaved(true);
    setSaving(false);
    setTimeout(onSaved, 800);
  };

  const Field = ({ label, name, multiline = false }) => (
    <div className="space-y-1">
      <label className="text-[11px] font-bold text-muted-foreground">{label}</label>
      {multiline ? (
        <textarea
          value={fields[name] || ""}
          onChange={e => setFields(p => ({ ...p, [name]: e.target.value }))}
          rows={3}
          className="w-full p-2.5 rounded-xl border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
      ) : (
        <input
          value={fields[name] || ""}
          onChange={e => setFields(p => ({ ...p, [name]: e.target.value }))}
          className="w-full px-3 py-2 rounded-xl border border-border bg-muted/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-black text-foreground">{TYPE_LABELS[type]}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="תעשייה" name="industry" />
          {"category" in fields && <Field label="קטגוריה" name="category" />}

          {type === "anti_pattern" && <>
            <Field label="תבנית רעה" name="bad_pattern" multiline />
            <Field label="למה זה רע" name="why_bad" multiline />
            <Field label="כיוון טוב יותר" name="better_direction" multiline />
          </>}

          {type === "voice_sample" && <>
            <Field label="טקסט קלט (הרע)" name="input_text" multiline />
            <Field label="טקסט פלט (הטוב)" name="output_text" multiline />
            <Field label="למה" name="why" multiline />
          </>}

          {type === "prompt_rule" && <>
            <Field label="כלל" name="rule_text" multiline />
            <Field label="דוגמה רעה" name="bad_example" multiline />
            <Field label="דוגמה טובה" name="good_example" multiline />
          </>}

          {type === "learning_item" && <>
            <Field label="בעיה שזוהתה" name="problem_detected" multiline />
            <Field label="תיקון מוצע" name="suggested_fix" multiline />
            <Field label="דוגמה רעה" name="example_bad" multiline />
            <Field label="דוגמה טובה" name="example_better" multiline />
          </>}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || saved}
          className="w-full h-11 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all"
          style={{ background: saved ? "#22c55e" : "linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)" }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <><Check className="w-4 h-4" /> נשמר!</> : "שמור"}
        </button>
      </div>
    </div>
  );
}