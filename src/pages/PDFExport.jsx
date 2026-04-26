import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Check, Printer, User, FileText, Users } from "lucide-react";
import LoadingState from "@/components/briefi/LoadingState";

const DNA_LABELS = {
  main_angle: "הזווית המרכזית",
  audience_truth: "מה הקהל צריך להבין",
  what_is_interesting: "מה מעניין פה באמת",
  what_to_avoid: "ממה כדאי להיזהר",
  recommended_content_directions: "כיווני תוכן מומלצים",
};

export default function PDFExport() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [briefs, setBriefs] = useState([]);
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [exportType, setExportType] = useState(null); // "internal" | "client"
  const [includeLogo, setIncludeLogo] = useState(true);
  const [preparedBy, setPreparedBy] = useState("");

  useEffect(() => {
    const load = async () => {
      const user = await base44.auth.me();
      const [p, b, br] = await Promise.all([
        base44.entities.Project.filter({ id: projectId }).then(r => r[0]),
        base44.entities.VideoBrief.filter({ project_id: projectId }),
        base44.entities.UserBranding.filter({ user_id: user.id }).then(r => r[0] || null),
      ]);
      // Ownership check
      if (!p || (p.owner_id && p.owner_id !== user.id)) {
        navigate("/dashboard");
        return;
      }
      setProject(p);
      setBriefs(b.sort((a, x) => (a.video_number || 0) - (x.video_number || 0)));
      setBranding(br);
      setPreparedBy(br?.display_name || br?.business_name || "");
      setIncludeLogo(!!br?.logo_url);
      setLoading(false);
    };
    load();
  }, [projectId]);

  const buildHeader = (branding, includeLogo, clientName, date) => {
    const color = branding?.brand_color || "#6C35FF";
    const logoHtml = includeLogo && branding?.logo_url
      ? `<img src="${branding.logo_url}" alt="לוגו" style="max-height:60px; max-width:160px; object-fit:contain;" />`
      : branding?.business_name
        ? `<span style="font-size:20px;font-weight:900;color:${color};">${branding.business_name}</span>`
        : `<span style="font-size:20px;font-weight:900;color:${color};">Briefi</span>`;

    const contactParts = [branding?.email, branding?.phone, branding?.website].filter(Boolean);
    const contact = contactParts.length ? `<div style="font-size:10px;color:#9AA1AD;margin-top:4px;">${contactParts.join(" · ")}</div>` : "";

    return `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
        <div>
          ${logoHtml}
          ${branding?.display_name && branding.display_name !== branding.business_name ? `<div style="font-size:11px;color:#5F6675;margin-top:2px;">${branding.display_name}</div>` : ""}
          ${contact}
        </div>
        <div style="text-align:left;font-size:11px;color:#5F6675;">
          <div>${clientName}</div>
          <div>${date}</div>
        </div>
      </div>
      <div style="height:3px;background:${color};border-radius:2px;margin-bottom:24px;"></div>
    `;
  };

  const generateInternalHTML = () => {
    const color = branding?.brand_color || "#6C35FF";
    const date = new Date().toLocaleDateString("he-IL");
    const header = buildHeader(branding, includeLogo, project?.client_name || "", date);
    const dna = project?.creative_dna || {};

    const dnaSection = `
      <div class="section-page">
        <h2 style="font-size:20px;font-weight:900;color:${color};margin-bottom:6px;border-bottom:3px solid ${color};padding-bottom:8px;display:inline-block;">Creative DNA</h2>
        ${Object.entries(DNA_LABELS).map(([key, label]) => {
          const val = dna[key];
          if (!val) return "";
          return `
            <div style="margin-bottom:16px;">
              <div style="font-size:10px;font-weight:800;color:${color};text-transform:uppercase;margin-bottom:4px;">${label}</div>
              ${Array.isArray(val)
                ? `<ul style="padding-right:18px;margin:0;">${val.map(v => `<li style="font-size:13px;color:#5F6675;margin-bottom:3px;">${v}</li>`).join("")}</ul>`
                : `<p style="font-size:13px;color:#5F6675;margin:0;">${val}</p>`
              }
            </div>
          `;
        }).join("")}
      </div>
    `;

    const briefsHTML = briefs.map((brief) => {
      const fb = brief.final_brief || {};
      const shotItems = fb.shot_structure || fb.video_structure || [];
      const scriptFormatLabels = { voiceover: "ווייסאובר", person_to_camera: "דיבור למצלמה", dialogue: "דיאלוג", text_only: "טקסט בלבד" };
      const scriptLabel = scriptFormatLabels[fb.script_format] || fb.script_format || "";

      return `
        <div class="section-page">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #E6E4DC;">
            <span style="background:${color};color:white;font-weight:900;font-size:12px;padding:4px 10px;border-radius:8px;">#${brief.video_number}</span>
            <div>
              <div style="font-size:18px;font-weight:900;color:#0B1B36;">${fb.brief_title || `בריף ${brief.video_number}`}</div>
              <div style="font-size:11px;color:#9AA1AD;">${brief.category || ""}${fb.client_risk_level ? ` · סיכון: ${fb.client_risk_level}` : ""}</div>
            </div>
          </div>

          ${fb.video_concept ? `<div style="margin-bottom:14px;"><div style="font-size:10px;font-weight:800;color:${color};margin-bottom:4px;">קונספט לסרטון</div><p style="font-size:13px;color:#5F6675;margin:0;">${fb.video_concept}</p></div>` : ""}

          ${fb.hook ? `
            <div style="background:#F3EFFF;border-right:4px solid ${color};padding:12px 14px;border-radius:10px;margin-bottom:14px;">
              <div style="font-size:10px;font-weight:800;color:${color};margin-bottom:4px;">הוק</div>
              <p style="font-size:15px;font-weight:800;color:#0B1B36;margin:0;">${fb.hook}</p>
            </div>
          ` : ""}

          ${fb.script_text ? `
            <div style="background:#F9F8FF;border-right:4px solid ${color};padding:12px 14px;border-radius:10px;margin-bottom:14px;">
              <div style="font-size:10px;font-weight:800;color:${color};margin-bottom:4px;">טקסט / ווייסאובר ${scriptLabel ? `<span style="background:${color};color:white;font-size:9px;padding:1px 6px;border-radius:10px;font-weight:700;">${scriptLabel}</span>` : ""}</div>
              <p style="font-size:13px;color:#0B1B36;margin:0;line-height:1.8;white-space:pre-line;">${fb.script_text}</p>
              <p style="font-size:10px;color:#9AA1AD;margin:8px 0 0;font-style:italic;">זה הטקסט שאפשר להקריא, להגיד למצלמה או להשתמש בו כבסיס לצילום.</p>
            </div>
          ` : ""}

          ${shotItems.length ? `
            <div style="margin-bottom:14px;">
              <div style="font-size:10px;font-weight:800;color:${color};margin-bottom:6px;">מבנה צילום</div>
              ${shotItems.map((step, i) => `
                <div style="display:flex;gap:10px;align-items:flex-start;padding:8px;background:#F5F5F2;border-radius:8px;margin-bottom:5px;">
                  <span style="background:rgba(108,53,255,0.12);color:${color};font-weight:900;font-size:11px;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${step.step || i + 1}</span>
                  <div>
                    ${step.visual ? `<p style="font-size:13px;font-weight:600;color:#0B1B36;margin:0 0 2px;">${step.visual}</p>` : ""}
                    ${step.spoken_or_overlay_text ? `<p style="font-size:12px;color:#5F6675;font-style:italic;margin:0;">"${step.spoken_or_overlay_text}"</p>` : ""}
                    ${step.description ? `<p style="font-size:13px;font-weight:600;color:#0B1B36;margin:0;">${step.description}</p>` : ""}
                  </div>
                </div>
              `).join("")}
            </div>
          ` : ""}

          ${fb.text_overlays?.length ? `
            <div style="margin-bottom:14px;">
              <div style="font-size:10px;font-weight:800;color:${color};margin-bottom:6px;">טקסטים למסך</div>
              ${fb.text_overlays.map(t => `<span style="display:inline-block;background:#F0EEF7;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:600;margin:0 0 4px 6px;">"${t}"</span>`).join("")}
            </div>
          ` : ""}

          ${fb.cta ? `<div style="margin-bottom:14px;"><div style="font-size:10px;font-weight:800;color:${color};margin-bottom:4px;">קריאה לפעולה</div><p style="font-size:13px;color:#0B1B36;font-weight:700;margin:0;">${fb.cta}</p></div>` : ""}

          ${fb.caption_suggestion ? `<div style="margin-bottom:14px;"><div style="font-size:10px;font-weight:800;color:${color};margin-bottom:4px;">כיתוב לפוסט</div><p style="font-size:12px;color:#5F6675;margin:0;">${fb.caption_suggestion}</p></div>` : ""}

          ${fb.production_notes ? `<div style="background:#FFFBEB;border-right:3px solid #F8B900;padding:10px 12px;border-radius:8px;"><div style="font-size:10px;font-weight:800;color:#C48E00;margin-bottom:3px;">הערות צילום</div><p style="font-size:12px;color:#5F6675;margin:0;">${fb.production_notes}</p></div>` : ""}
        </div>
      `;
    }).join("");

    return buildFullHTML(`בריף עבודה לסושיאל - ${project?.client_name || ""}`,
      "בריף עבודה לסושיאל", "חבילת בריפים מפורטת לצילום והפקה",
      header, dnaSection + briefsHTML, color, branding, project, briefs.length, preparedBy, date);
  };

  const generateClientHTML = async () => {
    const color = branding?.brand_color || "#6C35FF";
    const date = new Date().toLocaleDateString("he-IL");
    const header = buildHeader(branding, includeLogo, project?.client_name || "", date);

    const response = await base44.functions.invoke("briefiAI", {
      action: "generateClientBriefSummary",
      project_id: projectId,
      client_name: project?.client_name || "",
      main_goal: project?.main_goal || "",
      creative_dna: project?.creative_dna || {},
      video_briefs: briefs.map(b => ({
        video_number: b.video_number,
        category: b.category,
        final_brief: b.final_brief,
      })),
    });

    const clientBriefs = response.data?.client_briefs || [];

    const briefsHTML = clientBriefs.map((cb, idx) => `
      <div class="section-page">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #E6E4DC;">
          <span style="background:${color};color:white;font-weight:900;font-size:12px;padding:4px 10px;border-radius:8px;">#${idx + 1}</span>
          <div>
            <div style="font-size:18px;font-weight:900;color:#0B1B36;">${cb.brief_title || `סרטון ${idx + 1}`}</div>
            <div style="font-size:11px;color:#9AA1AD;">${cb.category || ""}</div>
          </div>
        </div>

        ${cb.short_client_concept ? `
          <div style="margin-bottom:14px;">
            <div style="font-size:10px;font-weight:800;color:${color};margin-bottom:4px;">קונספט</div>
            <p style="font-size:14px;color:#0B1B36;margin:0;line-height:1.7;">${cb.short_client_concept}</p>
          </div>
        ` : ""}

        ${cb.hook ? `
          <div style="background:#F3EFFF;border-right:4px solid ${color};padding:12px 14px;border-radius:10px;margin-bottom:14px;">
            <div style="font-size:10px;font-weight:800;color:${color};margin-bottom:4px;">הוק מוצע</div>
            <p style="font-size:15px;font-weight:800;color:#0B1B36;margin:0;">${cb.hook}</p>
          </div>
        ` : ""}

        ${cb.short_visual_summary ? `
          <div style="margin-bottom:14px;">
            <div style="font-size:10px;font-weight:800;color:${color};margin-bottom:4px;">מה יראו בסרטון</div>
            <p style="font-size:13px;color:#5F6675;margin:0;">${cb.short_visual_summary}</p>
          </div>
        ` : ""}

        ${cb.cta ? `
          <div style="background:#F0F9FF;border-right:3px solid #249BFF;padding:10px 12px;border-radius:8px;">
            <div style="font-size:10px;font-weight:800;color:#249BFF;margin-bottom:3px;">קריאה לפעולה</div>
            <p style="font-size:13px;font-weight:700;color:#0B1B36;margin:0;">${cb.cta}</p>
          </div>
        ` : ""}
      </div>
    `).join("");

    return buildFullHTML(`חבילת קונספטים לסושיאל - ${project?.client_name || ""}`,
      "חבילת קונספטים לסושיאל", "רעיונות לסרטונים קצרים לאישור",
      header, briefsHTML, color, branding, project, briefs.length, preparedBy, date);
  };

  const buildFullHTML = (pageTitle, title, subtitle, headerHTML, bodyHTML, color, branding, project, briefCount, preparedBy, date) => `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${pageTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      direction: rtl; unicode-bidi: plaintext;
      font-family: 'Heebo', Arial, sans-serif;
      font-size: 13px; color: #0B1B36; background: #FAFAF7; line-height: 1.6;
      text-align: right;
    }
    @media print {
      body { background: white; }
      .page-break { page-break-before: always; }
      .no-print { display: none !important; }
    }
    .cover { padding: 60px 50px; min-height: 95vh; border-bottom: 6px solid ${color}; }
    .cover-title { font-size: 28px; font-weight: 900; color: #0B1B36; margin: 24px 0 6px; }
    .cover-sub { font-size: 14px; color: #5F6675; margin-bottom: 30px; }
    .cover-divider { border: none; border-top: 1px solid #E6E4DC; margin: 24px 0; }
    .section-page { padding: 40px 50px; }
    .print-btn {
      position: fixed; bottom: 24px; left: 24px;
      background: ${color}; color: white; border: none;
      padding: 14px 28px; border-radius: 14px;
      font-family: 'Heebo', sans-serif; font-size: 16px; font-weight: 800;
      cursor: pointer; box-shadow: 0 8px 30px rgba(0,0,0,0.2); z-index: 9999;
    }
  </style>
</head>
<body>
  <div class="cover">
    ${headerHTML}
    <div class="cover-title">${title}</div>
    <div class="cover-sub">${subtitle}</div>
    <div class="cover-divider"></div>
    <div style="font-size:13px;color:#0B1B36;font-weight:600;line-height:2;">
      <div>לקוח: ${project?.client_name || ""}</div>
      ${preparedBy ? `<div>הוכן על ידי: ${preparedBy}</div>` : ""}
      ${project?.main_goal ? `<div>מטרה: ${project.main_goal}</div>` : ""}
    </div>
    <div style="margin-top:16px;font-size:15px;font-weight:700;color:${color};">${briefCount} בריפים מוכנים</div>
  </div>
  ${bodyHTML}
  <button class="print-btn no-print" onclick="window.print()">🖨️ הדפסה / שמירה כ-PDF</button>
</body>
</html>`;

  const handleExport = async (type) => {
    setGenerating(true);
    let html;
    if (type === "internal") {
      html = generateInternalHTML();
    } else {
      html = await generateClientHTML();
    }
    setGenerating(false);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (!win) alert("אנא אפשרו חלון קופץ בדפדפן ונסו שנית.");
    await base44.entities.Project.update(projectId, { status: "exported" });
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl"><LoadingState /></div>;
  if (generating) return <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl"><LoadingState message="מכינים את המסמך..." /></div>;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(`/project/${projectId}/brief-pack`)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-base font-black text-foreground">ייצוא PDF</h1>
            <p className="text-xs text-muted-foreground">בחרו למי המסמך מיועד.</p>
          </div>
        </div>
      </div>

      <div className="briefi-page-container space-y-5">
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
          <p className="text-sm font-bold text-primary">{project?.client_name}</p>
          <p className="text-muted-foreground text-sm">{briefs.length} בריפים מוכנים לייצוא</p>
        </div>

        {/* Branding notice */}
        {branding?.logo_url ? (
          <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <img src={branding.logo_url} alt="לוגו" className="w-10 h-10 object-contain rounded-lg border border-border" />
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">{branding.business_name || branding.display_name}</p>
                <p className="text-xs text-muted-foreground">הלוגו שלכם יופיע במסמך</p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setIncludeLogo(v => !v)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${includeLogo ? "bg-primary border-primary" : "bg-white border-border"}`}
              >
                {includeLogo && <Check className="w-3 h-3 text-white" />}
              </div>
              <span className="text-sm text-foreground font-medium">כלול את הלוגו שלי במסמך</span>
            </label>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
            <p className="text-sm font-bold text-amber-800">עדיין לא העליתם לוגו</p>
            <p className="text-xs text-amber-700">אפשר לייצא גם בלי, או להוסיף לוגו למסמך מקצועי יותר.</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => navigate("/profile")}
                className="px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold"
              >
                הוספת לוגו
              </button>
            </div>
          </div>
        )}

        {/* Prepared by */}
        <div className="bg-white rounded-2xl border border-border p-4 space-y-2">
          <label className="text-xs font-bold text-muted-foreground">הוכן על ידי</label>
          <input
            type="text"
            value={preparedBy}
            onChange={e => setPreparedBy(e.target.value)}
            placeholder="השם שלכם / שם הסוכנות"
            className="briefi-input"
          />
        </div>

        {/* Export type cards */}
        <div className="space-y-3">
          {/* Internal */}
          <div className="bg-white rounded-2xl border-2 border-border overflow-hidden">
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-black text-foreground text-base">בריף לעצמי</h3>
                  <p className="text-xs text-muted-foreground">מפורט, פרקטי, כולל טקסטים, מבנה צילום והערות הפקה.</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/30 rounded-xl px-3 py-2">
                מתאים לתכנון, צילום והפקה
              </div>
              <button
                onClick={() => handleExport("internal")}
                disabled={briefs.length === 0}
                className="w-full h-12 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #1E8BFF 0%, #8B3DFF 100%)" }}
              >
                ייצוא בריף לעצמי
              </button>
            </div>
          </div>

          {/* Client */}
          <div className="bg-white rounded-2xl border-2 border-border overflow-hidden">
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Users className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-black text-foreground text-base">בריף לבעל העסק</h3>
                  <p className="text-xs text-muted-foreground">קצר, נקי ומוכן לשליחה לאישור לקוח.</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/30 rounded-xl px-3 py-2">
                מתאים לשליחה ואישור לקוח
              </div>
              <button
                onClick={() => handleExport("client")}
                disabled={briefs.length === 0}
                className="w-full h-12 rounded-xl font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #23C98B 0%, #249BFF 100%)" }}
              >
                ייצוא לבעל העסק
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate(`/project/${projectId}/brief-pack`)}
          className="briefi-btn-secondary w-full"
        >
          חזרה לבריפים
        </button>

        {/* Profile shortcut */}
        <button
          onClick={() => navigate("/profile")}
          className="briefi-btn-ghost w-full"
        >
          <User className="w-3.5 h-3.5" />
          עריכת מיתוג ולוגו
        </button>
      </div>
    </div>
  );
}