import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Download, Check, Printer } from "lucide-react";
import LoadingState from "@/components/briefi/LoadingState";

const DNA_LABELS = {
  main_angle: "הזווית המרכזית",
  audience_truth: "מה הקהל צריך להבין",
  what_is_interesting: "מה מעניין פה באמת",
  what_to_avoid: "ממה כדאי להיזהר",
  recommended_content_directions: "כיווני תוכן מומלצים",
};

const scriptFormatLabels = {
  "voiceover": "ווייסאובר",
  "person_to_camera": "דיבור למצלמה",
  "dialogue": "דיאלוג",
  "text_only": "טקסט בלבד",
};

export default function PDFExport() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [pdfTitle, setPdfTitle] = useState("חבילת בריפים לסושיאל");
  const [preparedBy, setPreparedBy] = useState("");
  const [includeSections, setIncludeSections] = useState({
    script: true,
    shot_structure: true,
    cta: true,
    production_notes: true,
    creative_dna: true,
    caption: true,
  });

  useEffect(() => {
    Promise.all([
      base44.entities.Project.filter({ id: projectId }).then(r => r[0]),
      base44.entities.VideoBrief.filter({ project_id: projectId })
    ]).then(([p, b]) => {
      setProject(p);
      setBriefs(b.sort((a, x) => (a.video_number || 0) - (x.video_number || 0)));
      setPdfTitle(`חבילת בריפים - ${p?.client_name || ""}`);
    }).finally(() => setLoading(false));
  }, [projectId]);

  const toggleSection = (key) => {
    setIncludeSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const generateHTML = () => {
    const dna = project?.creative_dna || {};

    const briefsHTML = briefs.map((brief, idx) => {
      const fb = brief.final_brief || {};
      const scriptLabel = scriptFormatLabels[fb.script_format] || fb.script_format || "";
      const shotItems = fb.shot_structure || fb.video_structure || [];

      return `
        <div class="brief-page page-break">
          <div class="brief-header">
            <span class="brief-num">#${brief.video_number}</span>
            <div class="brief-header-text">
              <h2>${fb.brief_title || `בריף ${brief.video_number}`}</h2>
              <span class="category-tag">${brief.category || ""}</span>
              ${fb.client_risk_level ? `<span class="risk-tag risk-${fb.client_risk_level}">${fb.client_risk_level}</span>` : ""}
            </div>
          </div>

          ${fb.video_concept ? `<div class="section"><div class="section-label">קונספט לסרטון</div><p>${fb.video_concept}</p></div>` : ""}

          ${includeSections.script && fb.hook ? `<div class="section hook-section"><div class="section-label">הוק</div><p class="hook-text">${fb.hook}</p></div>` : ""}

          ${includeSections.script && fb.script_text ? `
            <div class="section script-section">
              <div class="section-label">טקסט / ווייסאובר ${scriptLabel ? `<span class="script-format-tag">${scriptLabel}</span>` : ""}</div>
              <p class="script-text">${fb.script_text.replace(/\n/g, "<br>")}</p>
              <p class="script-hint">זה הטקסט שאפשר להקריא, להגיד למצלמה או להשתמש בו כבסיס לצילום.</p>
            </div>
          ` : ""}

          ${includeSections.shot_structure && shotItems.length ? `
            <div class="section">
              <div class="section-label">מבנה צילום</div>
              ${shotItems.map((step, i) => `
                <div class="shot-item">
                  <span class="shot-num">${step.step || i + 1}</span>
                  <div class="shot-content">
                    ${step.visual ? `<p class="shot-visual">${step.visual}</p>` : ""}
                    ${step.spoken_or_overlay_text ? `<p class="shot-spoken">"${step.spoken_or_overlay_text}"</p>` : ""}
                    ${step.description ? `<p class="shot-visual">${step.description}</p>` : ""}
                  </div>
                </div>
              `).join("")}
            </div>
          ` : ""}

          ${fb.text_overlays?.length ? `
            <div class="section">
              <div class="section-label">טקסטים למסך</div>
              ${fb.text_overlays.map(t => `<div class="overlay-item">"${t}"</div>`).join("")}
            </div>
          ` : ""}

          ${includeSections.cta && fb.cta ? `<div class="section"><div class="section-label">קריאה לפעולה</div><p>${fb.cta}</p></div>` : ""}

          ${includeSections.caption && fb.caption_suggestion ? `<div class="section"><div class="section-label">כיתוב לפוסט</div><p class="caption-text">${fb.caption_suggestion}</p></div>` : ""}

          ${includeSections.production_notes && fb.production_notes ? `<div class="section notes-section"><div class="section-label">הערות צילום</div><p>${fb.production_notes}</p></div>` : ""}
        </div>
      `;
    }).join("");

    const dnaHTML = includeSections.creative_dna && project?.creative_dna ? `
      <div class="brief-page page-break dna-page">
        <h2 class="dna-title">Creative DNA</h2>
        ${Object.entries(DNA_LABELS).map(([key, label]) => {
          const val = dna[key];
          if (!val) return "";
          if (Array.isArray(val)) {
            return `<div class="section"><div class="section-label">${label}</div><ul>${val.map(v => `<li>${v}</li>`).join("")}</ul></div>`;
          }
          return `<div class="section"><div class="section-label">${label}</div><p>${val}</p></div>`;
        }).join("")}
      </div>
    ` : "";

    return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${pdfTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      direction: rtl;
      unicode-bidi: plaintext;
      font-family: 'Heebo', 'Arial', sans-serif;
      font-size: 13px;
      color: #0B1B36;
      background: #FAFAF7;
      line-height: 1.6;
    }

    .text, p, h1, h2, h3, li, span, div {
      direction: rtl;
      text-align: right;
      unicode-bidi: plaintext;
    }

    @media print {
      body { background: white; }
      .page-break { page-break-before: always; }
      .no-print { display: none !important; }
    }

    .cover {
      padding: 60px 50px;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      border-bottom: 6px solid #6C35FF;
    }

    .cover-brand { font-size: 36px; font-weight: 900; color: #6C35FF; margin-bottom: 10px; }
    .cover-title { font-size: 26px; font-weight: 800; color: #0B1B36; margin-bottom: 6px; }
    .cover-sub { font-size: 14px; color: #5F6675; margin-bottom: 30px; }
    .cover-meta { font-size: 13px; color: #0B1B36; font-weight: 600; line-height: 2; }
    .cover-date { font-size: 11px; color: #9AA1AD; margin-top: 8px; }
    .cover-divider { border: none; border-top: 1px solid #E6E4DC; margin: 24px 0; }
    .cover-count { font-size: 15px; font-weight: 700; color: #6C35FF; }

    .dna-page { padding: 50px; }
    .dna-title { font-size: 22px; font-weight: 900; color: #6C35FF; margin-bottom: 24px; border-bottom: 3px solid #6C35FF; padding-bottom: 10px; display: inline-block; }

    .brief-page {
      padding: 40px 50px 60px;
      min-height: 100vh;
    }

    .brief-header {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #E6E4DC;
    }

    .brief-num {
      background: #6C35FF;
      color: white;
      font-weight: 900;
      font-size: 13px;
      padding: 4px 10px;
      border-radius: 8px;
      white-space: nowrap;
      margin-top: 4px;
    }

    .brief-header-text h2 { font-size: 20px; font-weight: 900; color: #0B1B36; }

    .category-tag {
      display: inline-block;
      font-size: 11px;
      color: #9AA1AD;
      margin-top: 4px;
      margin-left: 8px;
    }

    .risk-tag {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 20px;
      margin-top: 4px;
    }
    .risk-tag.risk-נמוך { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
    .risk-tag.risk-בינוני { background: #fefce8; color: #ca8a04; border: 1px solid #fde68a; }
    .risk-tag.risk-גבוה { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; }

    .section { margin-bottom: 20px; }

    .section-label {
      font-size: 10px;
      font-weight: 800;
      color: #6C35FF;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .script-format-tag {
      font-size: 10px;
      background: #6C35FF;
      color: white;
      padding: 1px 7px;
      border-radius: 20px;
      font-weight: 700;
      text-transform: none;
    }

    .hook-section { background: #F3EFFF; border-right: 4px solid #6C35FF; padding: 14px 16px; border-radius: 10px; }
    .hook-text { font-size: 16px; font-weight: 800; color: #0B1B36; }

    .script-section { background: #F9F8FF; border-right: 4px solid #6C35FF; padding: 14px 16px; border-radius: 10px; }
    .script-text { font-size: 14px; font-weight: 500; color: #0B1B36; line-height: 1.8; }
    .script-hint { font-size: 10px; color: #9AA1AD; margin-top: 8px; font-style: italic; }

    .shot-item {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 10px;
      background: #F5F5F2;
      border-radius: 8px;
      margin-bottom: 6px;
    }
    .shot-num {
      background: rgba(108,53,255,0.12);
      color: #6C35FF;
      font-weight: 900;
      font-size: 11px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .shot-content { flex: 1; }
    .shot-visual { font-size: 13px; font-weight: 600; color: #0B1B36; }
    .shot-spoken { font-size: 12px; color: #5F6675; font-style: italic; margin-top: 2px; }

    .overlay-item {
      font-size: 13px;
      font-weight: 600;
      color: #0B1B36;
      background: #F0EEF7;
      padding: 6px 12px;
      border-radius: 8px;
      margin-bottom: 4px;
      display: inline-block;
      margin-left: 6px;
    }

    .caption-text { font-size: 12px; color: #5F6675; line-height: 1.8; }

    .notes-section p { font-size: 12px; color: #5F6675; }

    ul { padding-right: 20px; }
    ul li { margin-bottom: 4px; font-size: 13px; color: #5F6675; }

    .print-btn {
      position: fixed;
      bottom: 30px;
      left: 30px;
      background: #6C35FF;
      color: white;
      border: none;
      padding: 14px 28px;
      border-radius: 14px;
      font-family: 'Heebo', sans-serif;
      font-size: 16px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 8px 30px rgba(108,53,255,0.4);
      z-index: 9999;
    }
    .print-btn:hover { background: #5a28e0; }
  </style>
</head>
<body>

  <!-- Cover -->
  <div class="cover">
    <div class="cover-brand">Briefi ✦</div>
    <div class="cover-title">${pdfTitle}</div>
    <div class="cover-sub">חבילת בריפים לסרטונים קצרים</div>
    <div class="cover-meta">
      לקוח: ${project?.client_name || ""}${preparedBy ? `<br>הוכן על ידי: ${preparedBy}` : ""}
    </div>
    <div class="cover-date">${new Date().toLocaleDateString("he-IL")}</div>
    <hr class="cover-divider">
    <div class="cover-count">${briefs.length} בריפים מוכנים לצילום</div>
  </div>

  ${dnaHTML}
  ${briefsHTML}

  <button class="print-btn no-print" onclick="window.print()">🖨️ הדפסה / שמירה כ-PDF</button>
</body>
</html>`;
  };

  const handleExport = async () => {
    const html = generateHTML();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) alert("אנא אפשרו חלון קופץ בדפדפן ונסו שנית.");
    await base44.entities.Project.update(projectId, { status: "exported" });
  };

  if (loading) return <div className="min-h-screen bg-briefi-bg flex items-center justify-center" dir="rtl"><LoadingState /></div>;

  const checkboxes = [
    { key: "script", label: "הוק + טקסט / ווייסאובר" },
    { key: "shot_structure", label: "מבנה צילום" },
    { key: "cta", label: "קריאה לפעולה" },
    { key: "caption", label: "כיתוב לפוסט" },
    { key: "production_notes", label: "הערות צילום" },
    { key: "creative_dna", label: "Creative DNA" },
  ];

  return (
    <div className="min-h-screen bg-briefi-bg" dir="rtl">
      <div className="bg-white border-b border-border px-5 pt-safe pt-4 pb-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(`/project/${projectId}/brief-pack`)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-briefi-secondary" />
          </button>
          <div>
            <h1 className="text-xl font-black text-briefi-navy">ייצוא בריפים</h1>
            <p className="text-xs text-briefi-muted">הפכו את הבריפים למסמך שאפשר לשלוח ללקוח.</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-5 space-y-5">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
          <p className="text-sm font-bold text-primary">{project?.client_name}</p>
          <p className="text-briefi-secondary text-sm">{briefs.length} בריפים מוכנים לייצוא</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-blue-700 mb-1">איך זה עובד?</p>
          <p className="text-xs text-blue-600">המסמך ייפתח בחלון חדש בעברית מלאה עם כל הבריפים. לשמירה כ-PDF — לחצו על כפתור ההדפסה בתחתית הדף ובחרו "שמור כ-PDF".</p>
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-briefi-navy">כותרת המסמך</label>
            <input
              type="text"
              value={pdfTitle}
              onChange={e => setPdfTitle(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-border bg-muted/30 text-briefi-navy font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-briefi-navy">הוכן על ידי</label>
            <input
              type="text"
              value={preparedBy}
              onChange={e => setPreparedBy(e.target.value)}
              placeholder="השם שלכם / שם הסוכנות"
              className="w-full h-12 px-4 rounded-xl border border-border bg-muted/30 text-briefi-navy font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm placeholder:text-briefi-muted"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 space-y-3">
          <h3 className="font-bold text-briefi-navy text-sm">סעיפים לכלול</h3>
          <div className="space-y-2">
            {checkboxes.map(cb => (
              <button
                key={cb.key}
                onClick={() => toggleSection(cb.key)}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm font-medium text-briefi-navy">{cb.label}</span>
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${includeSections[cb.key] ? "bg-primary border-primary" : "bg-white border-border"}`}>
                  {includeSections[cb.key] && <Check className="w-3.5 h-3.5 text-white" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleExport}
          disabled={briefs.length === 0}
          className="w-full h-16 rounded-2xl font-black text-lg text-white flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #1E8BFF 0%, #8B3DFF 100%)" }}
        >
          <Printer className="w-6 h-6" />
          פתח מסמך לייצוא
        </button>

        <button
          onClick={() => navigate(`/project/${projectId}/brief-pack`)}
          className="w-full h-12 rounded-2xl font-medium text-sm text-briefi-secondary bg-white border border-border text-center transition-all active:scale-95"
        >
          חזרה לבריפים
        </button>
      </div>
    </div>
  );
}