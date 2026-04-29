import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Search, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

const INDUSTRIES = [
  "מסעדנות ואוכל",
  "יופי ואסתטיקה",
  "פיטנס ותזונה",
  "מאמנים, יועצים ונותני ידע",
  "עסקים מקומיים ושירותים לבית",
  'נדל"ן, עיצוב פנים ושיפוצים',
  "אירועים, לילה וחוויות",
  "אופנה, תכשיטים ובוטיקים",
  "הורות, ילדים ומשפחה",
  "בריאות, טיפול ו-Wellness",
];

const INTERNAL_TYPES = ["מצחיק", "תדמיתי", "היכרותי", "מכירתי", "לימודי"];
const USER_STYLES = ["מצחיק", "תדמית", "סרטון הכרות", "מכירתי"];

export default function AdminConceptBank() {
  const [concepts, setConcepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStyle, setFilterStyle] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    // Load all 1000 concepts in batches
    let all = [];
    const batchSize = 50;
    for (let i = 0; i < 20; i++) {
      const batch = await base44.entities.ConceptBank.list("global_concept_number", batchSize);
      all = [...all, ...batch];
      if (batch.length < batchSize) break;
    }
    setConcepts(all);
    setLoading(false);
  };

  // Stats
  const total = concepts.length;
  const byIndustry = {};
  const byType = {};
  const byStyle = {};
  const bySourceBatch = {};

  concepts.forEach(c => {
    byIndustry[c.industry_name] = (byIndustry[c.industry_name] || 0) + 1;
    byType[c.internal_concept_type] = (byType[c.internal_concept_type] || 0) + 1;
    byStyle[c.user_facing_video_style] = (byStyle[c.user_facing_video_style] || 0) + 1;
    bySourceBatch[c.source_batch] = (bySourceBatch[c.source_batch] || 0) + 1;
  });

  // Filter for display
  const filtered = concepts.filter(c => {
    const matchSearch = !search || c.concept_title?.includes(search) || c.concept_raw_text?.includes(search);
    const matchIndustry = !filterIndustry || c.industry_name === filterIndustry;
    const matchType = !filterType || c.internal_concept_type === filterType;
    const matchStyle = !filterStyle || c.user_facing_video_style === filterStyle;
    return matchSearch && matchIndustry && matchType && matchStyle;
  });

  const isFullyLoaded = total === 1000;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <Link to="/admin/learning" className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-sm font-black text-foreground">מאגר קונספטים</h1>
            <p className="text-[10px] text-muted-foreground">ConceptBank Admin</p>
          </div>
        </div>
      </div>

      <div className="briefi-page-container space-y-4">

        {/* Status banner */}
        {loading ? (
          <div className="bg-muted rounded-2xl p-4 text-center text-sm text-muted-foreground">טוען...</div>
        ) : !isFullyLoaded ? (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-800">המאגר לא מלא. אין להשתמש בו כמקור אמת עד השלמת ייבוא.</p>
              <p className="text-xs text-amber-700 mt-1">קיימים {total} קונספטים פעילים. נדרשים 1,000.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm font-bold text-green-800">המאגר מלא ✓ — {total.toLocaleString()} קונספטים פעילים</p>
          </div>
        )}

        {/* Summary stats */}
        {!loading && (
          <>
            <div className="bg-white rounded-2xl border border-border/60 p-4 space-y-3">
              <h2 className="text-sm font-black text-foreground">סיכום</h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-primary">{total}</p>
                  <p className="text-[10px] text-muted-foreground">קונספטים פעילים</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-primary">{Object.keys(byIndustry).length}</p>
                  <p className="text-[10px] text-muted-foreground">תחומים</p>
                </div>
              </div>
              {Object.keys(bySourceBatch).map(b => (
                <p key={b} className="text-[10px] text-muted-foreground">מקור: {b}</p>
              ))}
            </div>

            {/* By industry */}
            <div className="bg-white rounded-2xl border border-border/60 p-4 space-y-2">
              <h2 className="text-sm font-black text-foreground">לפי תחום</h2>
              {INDUSTRIES.map(ind => {
                const count = byIndustry[ind] || 0;
                const ok = count === 100;
                return (
                  <div key={ind} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                    <span className="text-xs text-foreground">{ind}</span>
                    <span className={`text-xs font-bold ${ok ? "text-green-600" : "text-red-500"}`}>
                      {count} {ok ? "✓" : "⚠️"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* By internal type */}
            <div className="bg-white rounded-2xl border border-border/60 p-4 space-y-2">
              <h2 className="text-sm font-black text-foreground">לפי סוג פנימי</h2>
              {INTERNAL_TYPES.map(t => (
                <div key={t} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                  <span className="text-xs text-foreground">{t}</span>
                  <span className={`text-xs font-bold ${(byType[t] || 0) === 200 ? "text-green-600" : "text-amber-600"}`}>
                    {byType[t] || 0}
                  </span>
                </div>
              ))}
            </div>

            {/* By user-facing style */}
            <div className="bg-white rounded-2xl border border-border/60 p-4 space-y-2">
              <h2 className="text-sm font-black text-foreground">לפי סגנון ויזואלי</h2>
              {USER_STYLES.map(s => (
                <div key={s} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                  <span className="text-xs text-foreground">{s}</span>
                  <span className="text-xs font-bold text-foreground">{byStyle[s] || 0}</span>
                </div>
              ))}
            </div>

            {/* Filters + search */}
            <div className="bg-white rounded-2xl border border-border/60 p-4 space-y-3">
              <h2 className="text-sm font-black text-foreground">חיפוש וסינון</h2>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="חיפוש לפי כותרת..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="briefi-input pr-9"
                />
              </div>
              <select value={filterIndustry} onChange={e => setFilterIndustry(e.target.value)} className="briefi-input">
                <option value="">כל התחומים</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              <div className="flex gap-2">
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="briefi-input">
                  <option value="">כל הסוגים</option>
                  {INTERNAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={filterStyle} onChange={e => setFilterStyle(e.target.value)} className="briefi-input">
                  <option value="">כל הסגנונות</option>
                  {USER_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">{filtered.length} תוצאות</p>
            </div>

            {/* Concept list (first 50 matching) */}
            <div className="space-y-2">
              {filtered.slice(0, 50).map(c => (
                <div key={c.id} className="bg-white rounded-xl border border-border/60 p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-foreground flex-1">{c.concept_title}</p>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">#{c.global_concept_number}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{c.industry_name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{c.internal_concept_type}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{c.user_facing_video_style}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{c.concept_raw_text}</p>
                </div>
              ))}
              {filtered.length > 50 && (
                <p className="text-xs text-muted-foreground text-center">מוצגים 50 מתוך {filtered.length}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}