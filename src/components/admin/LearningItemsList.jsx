import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle, XCircle, Edit2, Loader2, Check, X } from "lucide-react";

const STATUS_STYLE = {
  pending_admin_review: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  auto_applied_low_risk: "bg-blue-100 text-blue-700",
};

const STATUS_LABEL = {
  pending_admin_review: "ממתין לבדיקה",
  approved: "אושר",
  rejected: "נדחה",
  auto_applied_low_risk: "הוחל אוטומטית",
};

const TYPE_LABEL = {
  bad_pattern: "AntiPattern",
  good_pattern: "GoodPattern",
  spoken_line: "SpokenLine",
  rewrite_rule: "RewriteRule",
  anti_pattern: "AntiPattern",
  brief_example: "BriefExample",
  voice_sample: "VoiceSample",
};

export default function LearningItemsList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending_admin_review");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    setLoading(true);
    base44.entities.FeedbackLearningItem.list("-created_date", 100).then(data => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const filtered = items.filter(i => filter === "all" || i.status === filter);

  const updateStatus = async (item, status) => {
    setSavingId(item.id);
    await base44.entities.FeedbackLearningItem.update(item.id, { status });
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status } : i));
    setSavingId(null);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditData({
      problem_detected: item.problem_detected || "",
      suggested_fix: item.suggested_fix || "",
      example_bad: item.example_bad || "",
      example_better: item.example_better || "",
    });
  };

  const saveEdit = async (id) => {
    setSavingId(id);
    await base44.entities.FeedbackLearningItem.update(id, editData);
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...editData } : i));
    setEditingId(null);
    setSavingId(null);
  };

  const convertToGlobal = async (item, targetType) => {
    setSavingId(item.id);
    if (targetType === "anti_pattern") {
      await base44.entities.AntiPattern.create({
        industry: item.industry || "food_general",
        bad_pattern: item.example_bad || item.problem_detected,
        why_bad: item.problem_detected,
        better_direction: item.example_better || item.suggested_fix,
        source_batch: "learning_converted",
        is_active: true,
      });
    } else if (targetType === "voice_sample") {
      await base44.entities.VoiceSample.create({
        industry: item.industry || "food_general",
        category: item.category || "",
        sample_type: "rewrite",
        input_text: item.example_bad || "",
        output_text: item.example_better || "",
        rating: "excellent",
        why: item.problem_detected,
        source_batch: "learning_converted",
        is_active: true,
      });
    } else if (targetType === "prompt_rule") {
      await base44.entities.PromptImprovementRule.create({
        industry: item.industry || "",
        category: item.category || "",
        rule_text: item.suggested_fix || item.problem_detected,
        bad_example: item.example_bad || "",
        good_example: item.example_better || "",
        source_feedback_count: 1,
        is_active: true,
      });
    }
    await updateStatus(item, "approved");
    setSavingId(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[["pending_admin_review", "ממתין"], ["approved", "אושר"], ["rejected", "נדחה"], ["all", "הכל"]].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`text-xs px-3 py-1.5 rounded-full font-bold border transition-all ${
              filter === val ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-border hover:border-primary/30"
            }`}
          >
            {label} ({val === "all" ? items.length : items.filter(i => i.status === val).length})
          </button>
        ))}
      </div>

      {!filtered.length && (
        <div className="text-center py-16 text-muted-foreground text-sm">אין פריטים בסטטוס זה.</div>
      )}

      {filtered.map(item => {
        const isEditing = editingId === item.id;
        const isSaving = savingId === item.id;

        return (
          <div key={item.id} className="bg-white rounded-2xl border border-border/60 overflow-hidden">
            <div className="p-4 space-y-2.5">
              {/* Header */}
              <div className="flex items-center gap-2 flex-wrap">
                {item.learning_type && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {TYPE_LABEL[item.learning_type] || item.learning_type}
                  </span>
                )}
                {item.industry && (
                  <span className="text-[10px] text-muted-foreground">{item.industry}</span>
                )}
                {item.category && (
                  <span className="text-[10px] text-muted-foreground">· {item.category}</span>
                )}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto ${STATUS_STYLE[item.status] || "bg-muted text-muted-foreground"}`}>
                  {STATUS_LABEL[item.status] || item.status}
                </span>
              </div>

              {/* Content */}
              {isEditing ? (
                <div className="space-y-2">
                  {[["problem_detected", "בעיה"], ["suggested_fix", "תיקון"], ["example_bad", "דוגמה רעה"], ["example_better", "דוגמה טובה"]].map(([key, label]) => (
                    <div key={key}>
                      <label className="text-[11px] font-bold text-muted-foreground">{label}</label>
                      <textarea
                        value={editData[key] || ""}
                        onChange={e => setEditData(p => ({ ...p, [key]: e.target.value }))}
                        rows={2}
                        className="w-full mt-0.5 p-2 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                      />
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(item.id)} disabled={isSaving}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white rounded-xl text-xs font-bold">
                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} שמור
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-muted text-muted-foreground rounded-xl text-xs font-bold">
                      ביטול
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {item.problem_detected && (
                    <p className="text-sm text-foreground font-medium">{item.problem_detected}</p>
                  )}
                  {item.example_bad && (
                    <p className="text-xs text-red-600 bg-red-50 rounded-lg px-2.5 py-1.5">✗ {item.example_bad}</p>
                  )}
                  {item.example_better && (
                    <p className="text-xs text-green-700 bg-green-50 rounded-lg px-2.5 py-1.5">✓ {item.example_better}</p>
                  )}
                </div>
              )}

              {/* Actions */}
              {!isEditing && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {item.status === "pending_admin_review" && (
                    <>
                      <button onClick={() => updateStatus(item, "approved")} disabled={isSaving}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl bg-green-100 text-green-700 font-bold hover:bg-green-200 transition-colors">
                        <CheckCircle className="w-3 h-3" /> אשר
                      </button>
                      <button onClick={() => updateStatus(item, "rejected")} disabled={isSaving}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl bg-red-100 text-red-700 font-bold hover:bg-red-200 transition-colors">
                        <XCircle className="w-3 h-3" /> דחה
                      </button>
                    </>
                  )}
                  <button onClick={() => startEdit(item)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl bg-muted text-muted-foreground font-bold hover:bg-muted/80 transition-colors">
                    <Edit2 className="w-3 h-3" /> ערוך
                  </button>
                  {item.status !== "rejected" && (
                    <>
                      <button onClick={() => convertToGlobal(item, "anti_pattern")} disabled={isSaving}
                        className="text-xs px-2.5 py-1.5 rounded-xl bg-orange-100 text-orange-700 font-bold hover:bg-orange-200 transition-colors">
                        → AntiPattern
                      </button>
                      <button onClick={() => convertToGlobal(item, "voice_sample")} disabled={isSaving}
                        className="text-xs px-2.5 py-1.5 rounded-xl bg-purple-100 text-purple-700 font-bold hover:bg-purple-200 transition-colors">
                        → VoiceSample
                      </button>
                      <button onClick={() => convertToGlobal(item, "prompt_rule")} disabled={isSaving}
                        className="text-xs px-2.5 py-1.5 rounded-xl bg-blue-100 text-blue-700 font-bold hover:bg-blue-200 transition-colors">
                        → PromptRule
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}