import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Search, Filter, Edit2, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from "lucide-react";

const INDUSTRIES = ["all", "כושר", "יוגה", "ביוטי", "קפה", "אופנה", "מסעדות", "ברים", "רכבים", "שירותים", "ילדים"];
const VIDEO_STYLES = ["all", "מצחיק", "תדמית", "cinematic", "talking head", "emotional", "challenge", "reveal", "carousel"];

function PatternRow({ pattern, onToggle, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-white rounded-2xl border ${pattern.is_active ? "border-border/60" : "border-muted opacity-60"} shadow-sm overflow-hidden`}>
      <div className="p-4 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pattern.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
              {pattern.is_active ? "פעיל" : "לא פעיל"}
            </span>
            {pattern.confidence && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {pattern.confidence}%
              </span>
            )}
          </div>
          <h3 className="font-black text-foreground text-base mt-1">{pattern.pattern_name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{pattern.core_mechanic}</p>

          <div className="flex flex-wrap gap-1 mt-2">
            {(pattern.best_for_industries || []).map(ind => (
              <span key={ind} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">{ind}</span>
            ))}
            {(pattern.best_for_video_styles || []).map(style => (
              <span key={style} className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">{style}</span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onToggle(pattern)}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"
          >
            {pattern.is_active
              ? <ToggleRight className="w-3.5 h-3.5 text-green-600" />
              : <ToggleLeft className="w-3.5 h-3.5 text-muted-foreground" />
            }
          </button>
          <button
            onClick={() => onDelete(pattern)}
            className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-muted space-y-2 pt-3">
          {pattern.underlying_human_behavior && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">התנהגות אנושית</p>
              <p className="text-sm text-foreground">{pattern.underlying_human_behavior}</p>
            </div>
          )}
          {pattern.why_it_works && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">למה זה עובד</p>
              <p className="text-sm text-foreground">{pattern.why_it_works}</p>
            </div>
          )}
          {pattern.briefi_adaptation && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">התאמה לבריפי</p>
              <p className="text-sm text-foreground">{pattern.briefi_adaptation}</p>
            </div>
          )}
          {pattern.example_israeli && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">דוגמה ישראלית</p>
              <p className="text-sm text-muted-foreground italic">"{pattern.example_israeli}"</p>
            </div>
          )}
          {pattern.example_hook && (
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">דוגמת הוק</p>
              <p className="text-sm font-bold text-primary">"{pattern.example_hook}"</p>
            </div>
          )}
          {pattern.source_name && (
            <p className="text-[10px] text-muted-foreground">מקור: {pattern.source_name} | {pattern.source_month}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminTrendPatterns() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("all");
  const [filterStyle, setFilterStyle] = useState("all");
  const [filterConfidence, setFilterConfidence] = useState(0);

  const { data: patterns = [], isLoading } = useQuery({
    queryKey: ["trendPatterns"],
    queryFn: () => base44.entities.TrendPattern.list("-created_date", 100),
  });

  const toggleMutation = useMutation({
    mutationFn: (pattern) => base44.entities.TrendPattern.update(pattern.id, { is_active: !pattern.is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trendPatterns"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TrendPattern.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trendPatterns"] }),
  });

  const filtered = patterns.filter(p => {
    const matchSearch = !search || p.pattern_name?.includes(search) || p.core_mechanic?.includes(search);
    const matchIndustry = filterIndustry === "all" || (p.best_for_industries || []).includes(filterIndustry);
    const matchStyle = filterStyle === "all" || (p.best_for_video_styles || []).includes(filterStyle);
    const matchConf = !filterConfidence || (p.confidence || 0) >= filterConfidence;
    return matchSearch && matchIndustry && matchStyle && matchConf;
  });

  const activeCount = patterns.filter(p => p.is_active).length;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-base font-black text-foreground">Trend Patterns</h1>
            <p className="text-[11px] text-muted-foreground">{activeCount} פעילים / {patterns.length} סה"כ</p>
          </div>
        </div>
      </div>

      <div className="briefi-page-container space-y-4 pt-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חפשו לפי שם או מנגנון..."
            className="briefi-input pr-9"
            dir="rtl"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <select
            value={filterIndustry}
            onChange={e => setFilterIndustry(e.target.value)}
            className="text-xs h-8 px-2 rounded-xl border border-border bg-white text-foreground"
            dir="rtl"
          >
            {INDUSTRIES.map(i => <option key={i} value={i}>{i === "all" ? "כל תעשיות" : i}</option>)}
          </select>
          <select
            value={filterStyle}
            onChange={e => setFilterStyle(e.target.value)}
            className="text-xs h-8 px-2 rounded-xl border border-border bg-white text-foreground"
            dir="rtl"
          >
            {VIDEO_STYLES.map(s => <option key={s} value={s}>{s === "all" ? "כל הסגנונות" : s}</option>)}
          </select>
          <select
            value={filterConfidence}
            onChange={e => setFilterConfidence(Number(e.target.value))}
            className="text-xs h-8 px-2 rounded-xl border border-border bg-white text-foreground"
            dir="rtl"
          >
            <option value={0}>כל הציונים</option>
            <option value={80}>80%+</option>
            <option value={85}>85%+</option>
            <option value={90}>90%+</option>
          </select>
        </div>

        <p className="text-xs text-muted-foreground">{filtered.length} תוצאות</p>

        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(pattern => (
              <PatternRow
                key={pattern.id}
                pattern={pattern}
                onToggle={(p) => toggleMutation.mutate(p)}
                onDelete={(p) => { if (confirm(`למחוק "${p.pattern_name}"?`)) deleteMutation.mutate(p.id); }}
              />
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">לא נמצאו תוצאות</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}