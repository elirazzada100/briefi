import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Pencil, Check, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import LoadingState from "@/components/shared/LoadingState";
import ErrorState from "@/components/shared/ErrorState";
import { useProjectGuard } from "@/hooks/useProjectGuard";

const CARD_ICONS = {
  "הכיוון הכי חזק": "🎯",
  "מה מוכרים פה באמת": "💡",
  "למה זה יכול לעבוד": "✅",
  "איך נגרום לאנשים לעצור": "⚡",
  "הזווית של בריפי": "🔍",
};

// Fallback: if AI returns old-schema DNA, convert to cards format
function legacyDnaToCards(dna) {
  if (!dna) return [];
  const cards = [];
  if (dna.main_angle) cards.push({ title: "הכיוון הכי חזק", summary: dna.main_angle, tags: [] });
  if (dna.what_is_interesting) cards.push({ title: "מה מוכרים פה באמת", summary: dna.what_is_interesting, tags: [] });
  if (dna.audience_truth) cards.push({ title: "למה זה יכול לעבוד", summary: dna.audience_truth, tags: [] });
  if (dna.what_to_avoid) cards.push({ title: "הזווית של בריפי", summary: dna.what_to_avoid, tags: [] });
  return cards;
}

function AnalysisCard({ card, index }) {
  const [expanded, setExpanded] = useState(false);
  const icon = CARD_ICONS[card.title] || "✨";
  const tags = card.tags || [];

  // Detect if summary is long (more than ~180 chars ≈ 3 lines)
  const isLong = (card.summary || "").length > 180;
  const showToggle = isLong;
  const displayText = isLong && !expanded
    ? card.summary.slice(0, 180).replace(/\s+\S*$/, "…")
    : card.summary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="bg-white rounded-2xl border border-border/60 shadow-sm p-4"
    >
      <div className="flex items-start gap-2 mb-2">
        <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
        <h3 className="text-sm font-black text-foreground leading-snug">{card.title}</h3>
      </div>

      <p className="text-sm text-foreground/80 leading-relaxed text-right mb-2">
        {displayText}
      </p>

      {showToggle && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-primary font-medium mb-2"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" />סגרו פירוט</> : <><ChevronDown className="w-3 h-3" />פתחו פירוט</>}
        </button>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span key={tag} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/15">
              {tag}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function EditableDirections({ directions, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(directions.join("\n"));

  const save = () => {
    onSave(value.split("\n").filter(Boolean));
    setEditing(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">📋</span>
          <h3 className="text-sm font-bold text-foreground">כיווני תוכן מומלצים</h3>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-primary">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            className="text-sm rounded-xl resize-none"
            dir="rtl"
            rows={3}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} className="rounded-lg gap-1"><Check className="h-3 w-3" /> שמור</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="rounded-lg">ביטול</Button>
          </div>
        </div>
      ) : (
        <ul className="space-y-1">
          {directions.map((d, i) => (
            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">·</span>
              <span>{d}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CreativeDNA() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [dna, setDna] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(false);
  const [timingDebug, setTimingDebug] = useState(null);
  const generationStartedRef = useRef(false);
  const requestInFlightRef = useRef(false);
  let showTimingDebug = false;
  try {
    showTimingDebug = typeof window !== "undefined" && window.localStorage?.getItem("briefiDebugTiming") === "true";
  } catch {
    showTimingDebug = false;
  }

  const { project, loading: guardLoading } = useProjectGuard(projectId);

  useEffect(() => {
    if (project?.creative_dna) {
      setDna(project.creative_dna);
      generationStartedRef.current = true;
    } else if (project && !dna && !generationStartedRef.current) {
      generationStartedRef.current = true;
      generateDNA();
    }
  }, [project]);

  const generateDNA = async () => {
    if (!project || requestInFlightRef.current) return;

    requestInFlightRef.current = true;
    setGenerating(true);
    setError(false);
    const requestStartedAt = new Date().toISOString();
    const frontendRequestStart = performance.now();

    try {
      const response = await base44.functions.invoke("grokBriefiFlow", {
        action: "generateCreativeDNA",
        project_id: project.id,
        client_name: project.client_name,
        main_goal: project.main_goal,
        raw_notes: project.raw_notes,
      });
      const requestFinishedAt = new Date().toISOString();
      const frontendGenerateDnaMs = Math.round(performance.now() - frontendRequestStart);

      const result = response.data?.creative_dna;
      if (!result || response.data?.error) {
        throw new Error(response.data?.error || "DNA generation failed");
      }

      const nextTimingDebug = {
        frontend_generate_dna_ms: frontendGenerateDnaMs,
        frontend_request_started_at: requestStartedAt,
        frontend_request_finished_at: requestFinishedAt,
        backend_debug: {
          generate_creative_dna_total_ms: response.data?._debug?.generate_creative_dna_total_ms ?? null,
          provider_roundtrip_ms: response.data?._debug?.provider_roundtrip_ms ?? null,
          parse_ms: response.data?._debug?.parse_ms ?? null,
          attempt_count: response.data?._debug?.attempt_count ?? null,
          retry_used: response.data?._debug?.retry_used ?? null,
          project_update_ms: response.data?._debug?.project_update_ms ?? null,
          model: response.data?._debug?.model ?? null,
          provider: response.data?._debug?.provider ?? null,
        },
      };
      setTimingDebug(nextTimingDebug);

      if (import.meta.env.DEV) {
        console.debug("[creative-dna-timing]", nextTimingDebug);
      }

      setDna(result);
    } catch (err) {
      console.error("Failed to generate creative DNA:", err);
      setError(true);
      generationStartedRef.current = false;
    } finally {
      requestInFlightRef.current = false;
      setGenerating(false);
    }
  };

  const updateDirections = async (newDirs) => {
    const updated = { ...dna, recommended_content_directions: newDirs };
    setDna(updated);
    await base44.entities.Project.update(project.id, { creative_dna: updated });
  };

  const handleCopyTiming = async () => {
    if (!timingDebug || !navigator?.clipboard?.writeText) return;

    const timingReport = [
      "Business Analysis timing:",
      `frontend_total: ${timingDebug.frontend_generate_dna_ms ?? ""}`,
      `generate_creative_dna_total: ${timingDebug.backend_debug?.generate_creative_dna_total_ms ?? ""}`,
      `provider_roundtrip: ${timingDebug.backend_debug?.provider_roundtrip_ms ?? ""}`,
      `parse: ${timingDebug.backend_debug?.parse_ms ?? ""}`,
      `attempt_count: ${timingDebug.backend_debug?.attempt_count ?? ""}`,
      `retry_used: ${timingDebug.backend_debug?.retry_used ?? ""}`,
      `project_update: ${timingDebug.backend_debug?.project_update_ms ?? ""}`,
      `provider: ${timingDebug.backend_debug?.provider ?? ""}`,
      `model: ${timingDebug.backend_debug?.model ?? ""}`,
    ].join("\n");

    await navigator.clipboard.writeText(timingReport);
  };

  if (guardLoading || !project) return <LoadingState message="עוד רגע זה מוכן." />;
  if (generating) return <LoadingState message={["קוראים את העסק.", "מחפשים את הזווית שתעצור גלילה."]} />;
  if (error) return <ErrorState onRetry={generateDNA} />;
  if (!dna) return <LoadingState message="שנייה סיימנו." />;

  const cards = dna.business_analysis_cards?.length
    ? dna.business_analysis_cards
    : legacyDnaToCards(dna);

  const directions = dna.recommended_content_directions || [];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center cursor-pointer">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <p className="text-xs font-bold text-foreground">{project?.client_name}</p>
          </div>
        </div>
        {/* No stepper — stepper starts from concept selection only */}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="briefi-page-container"
      >
        <div className="mb-5">
          <h1 className="text-xl font-black text-foreground mb-1">הניתוח של העסק</h1>
          <p className="text-sm text-muted-foreground">
            כאן יש כיוון. כשנראה טוב, ממשיכים לבנות.
          </p>
        </div>

        {/* Analysis cards */}
        <div className="space-y-3 mb-4">
          {cards.map((card, i) => (
            <AnalysisCard key={i} card={card} index={i} />
          ))}
        </div>

        {/* Content directions - editable */}
        {directions.length > 0 && (
          <div className="mb-6">
            <EditableDirections directions={directions} onSave={updateDirections} />
          </div>
        )}

        {timingDebug && showTimingDebug && (
          <div className="mb-6 bg-muted/40 border border-border/60 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-foreground">תזמון ניתוח עסק</h2>
              <button onClick={handleCopyTiming} className="briefi-btn-secondary !h-8 !px-3 text-xs">
                העתק תזמון
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-foreground/80">
              <span>frontend_generate_dna_ms</span>
              <span className="text-left">{timingDebug.frontend_generate_dna_ms ?? ""}</span>
              <span>generate_creative_dna_total_ms</span>
              <span className="text-left">{timingDebug.backend_debug?.generate_creative_dna_total_ms ?? ""}</span>
              <span>provider_roundtrip_ms</span>
              <span className="text-left">{timingDebug.backend_debug?.provider_roundtrip_ms ?? ""}</span>
              <span>parse_ms</span>
              <span className="text-left">{timingDebug.backend_debug?.parse_ms ?? ""}</span>
              <span>attempt_count</span>
              <span className="text-left">{timingDebug.backend_debug?.attempt_count ?? ""}</span>
              <span>retry_used</span>
              <span className="text-left">{String(timingDebug.backend_debug?.retry_used ?? "")}</span>
              <span>project_update_ms</span>
              <span className="text-left">{timingDebug.backend_debug?.project_update_ms ?? ""}</span>
              <span>provider</span>
              <span className="text-left">{timingDebug.backend_debug?.provider ?? ""}</span>
              <span>model</span>
              <span className="text-left">{timingDebug.backend_debug?.model ?? ""}</span>
            </div>
          </div>
        )}

        <div className="space-y-2.5">
          <button onClick={() => navigate(`/project/${projectId}/video-style`, { state: { business: { business_name: project.client_name, business_description: project.raw_notes, main_goal: project.main_goal }, businessAnalysis: dna } })} className="briefi-btn-primary w-full">
            <Sparkles className="h-4 w-4" />
            יאללה, נבנה סרטונים
          </button>
          <button onClick={generateDNA} className="briefi-btn-secondary w-full">
            <RotateCcw className="h-4 w-4" />
            שפרו את הניתוח
          </button>
          <button onClick={() => navigate(`/project/${projectId}/new`)} className="briefi-btn-ghost w-full">
            <ArrowRight className="h-4 w-4" />
            חזרה
          </button>
        </div>
      </motion.div>
    </div>
  );
}
