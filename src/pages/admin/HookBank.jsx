import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Search, CheckCircle2, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";

export default function AdminHookBank() {
  const [hooks, setHooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterMechanic, setFilterMechanic] = useState("");
  const [filterStyle, setFilterStyle] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    // Load in batches of 50 (SDK default max)
    let all = [];
    for (let i = 0; i < 25; i++) {
      const batch = await base44.entities.LockedHookTemplates.list("source_order", 50);
      all = [...all, ...batch];
      if (batch.length < 50) break;
    }
    setHooks(all);
    setLoading(false);
  };

  const toggleActive = async (hook) => {
    setToggling(hook.id);
    await base44.entities.LockedHookTemplates.update(hook.id, { is_active: !hook.is_active });
    setHooks(prev => prev.map(h => h.id === hook.id ? { ...h, is_active: !h.is_active } : h));
    setToggling(null);
  };

  // Derived filter options
  const categories = [...new Set(hooks.map(h => h.source_category).filter(Boolean))].sort();
  const mechanics = [...new Set(hooks.map(h => h.hook_mechanic).filter(Boolean))].sort();
  const styles = [...new Set(hooks.map(h => h.best_for_styles).filter(Boolean))].sort();

  const activeCount = hooks.filter(h => h.is_active).length;
  const sourceBatch = hooks[0]?.source_batch || "—";

  const filtered = hooks.filter(h => {
    const matchSearch = !search || h.hebrew_template?.includes(search) || h.hook_id?.includes(search);
    const matchCat = !filterCategory || h.source_category === filterCategory;
    const matchMechanic = !filterMechanic || h.hook_mechanic === filterMechanic;
    const matchStyle = !filterStyle || h.best_for_styles === filterStyle;
    return matchSearch && matchCat && matchMechanic && matchStyle;
  });

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <Link to="/admin/learning" className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-sm font-black text-foreground">בנק הפתיחות</h1>
            <p className="text-[10px] text-muted-foreground">LockedHookTemplates Admin</p>
          </div>
        </div>
      </div>

      <div className="briefi-page-container space-y-4">

        {loading ? (
          <div className="bg-muted rounded-2xl p-4 text-center text-sm text-muted-foreground animate-pulse">טוען...</div>
        ) : (
          <>
            {/* Status */}
            {activeCount === 1000 ? (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-800">בנק הפתיחות מלא ✓ — {activeCount.toLocaleString()} פתיחות פעילות</p>
                  <p className="text-[10px] text-green-700 mt-0.5">מקור: {sourceBatch}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-800">הבנק לא מלא. נדרשות 1,000 פתיחות.</p>
                  <p className="text-xs text-amber-700 mt-1">קיימות {activeCount} פתיחות פעילות מתוך {hooks.length} כולל.</p>
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="bg-white rounded-2xl border border-border/60 p-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xl font-black text-primary">{activeCount}</p>
                  <p className="text-[9px] text-muted-foreground">פתיחות פעילות</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xl font-black text-foreground">{hooks.length - activeCount}</p>
                  <p className="text-[9px] text-muted-foreground">לא פעילות</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-xl font-black text-foreground">{categories.length}</p>
                  <p className="text-[9px] text-muted-foreground">קטגוריות</p>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-border/60 p-4 space-y-3">
              <h2 className="text-sm font-black text-foreground">חיפוש וסינון</h2>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="חיפוש לפי טקסט..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="briefi-input pr-9"
                />
              </div>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="briefi-input">
                <option value="">כל הקטגוריות</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex gap-2">
                <select value={filterMechanic} onChange={e => setFilterMechanic(e.target.value)} className="briefi-input">
                  <option value="">כל המנגנונים</option>
                  {mechanics.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={filterStyle} onChange={e => setFilterStyle(e.target.value)} className="briefi-input">
                  <option value="">כל הסגנונות</option>
                  {styles.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">{filtered.length} תוצאות</p>
            </div>

            {/* Hook list */}
            <div className="space-y-2">
              {filtered.slice(0, 100).map(h => {
                const isExpanded = expandedId === h.id;
                return (
                  <div
                    key={h.id}
                    className={`bg-white rounded-xl border shadow-sm p-3 space-y-2 transition-all ${h.is_active ? "border-border/60" : "border-border/30 opacity-60"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-bold text-muted-foreground">#{h.source_order}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{h.source_category}</span>
                          {h.hook_mechanic && h.hook_mechanic !== "general" && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{h.hook_mechanic}</span>
                          )}
                          {h.is_locked && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">🔒 נעול</span>
                          )}
                        </div>
                        <p className="text-xs text-foreground leading-relaxed">{h.hebrew_template}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : h.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleActive(h)}
                          disabled={toggling === h.id}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${h.is_active ? "text-green-600 hover:bg-green-50" : "text-muted-foreground hover:bg-muted"}`}
                        >
                          {h.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="bg-muted/40 rounded-lg p-3 space-y-1.5 text-[10px]">
                        <div><span className="font-bold text-foreground">hook_id: </span><span className="text-muted-foreground">{h.hook_id}</span></div>
                        <div><span className="font-bold text-foreground">best_for_styles: </span><span className="text-muted-foreground">{h.best_for_styles}</span></div>
                        <div><span className="font-bold text-foreground">best_for_industries: </span><span className="text-muted-foreground">{h.best_for_industries}</span></div>
                        {h.placeholder_slots && h.placeholder_slots !== "[]" && (
                          <div><span className="font-bold text-foreground">placeholders: </span><span className="text-muted-foreground">{h.placeholder_slots}</span></div>
                        )}
                        <div><span className="font-bold text-foreground">source_batch: </span><span className="text-muted-foreground">{h.source_batch}</span></div>
                        {h.is_locked && (
                          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-amber-700 font-medium">⚠️ ההוק הזה נעול. שינוי הטקסט יכול לפגוע בהתאמה למאגר המקורי.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {filtered.length > 100 && (
                <p className="text-xs text-muted-foreground text-center py-2">מוצגות 100 מתוך {filtered.length}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}