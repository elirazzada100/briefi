import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, Download, Check } from "lucide-react";
import LoadingState from "@/components/briefi/LoadingState";
import jsPDF from "jspdf";

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
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const [pdfTitle, setPdfTitle] = useState("חבילת בריפים לסושיאל");
  const [preparedBy, setPreparedBy] = useState("");
  const [includeSections, setIncludeSections] = useState({
    hooks: true,
    body: true,
    cta: true,
    production_notes: true,
    creative_dna: true,
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

  const generatePDF = async () => {
    setGenerating(true);
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210;
    const pageH = 297;
    const margin = 20;
    const contentW = pageW - margin * 2;

    const addRTLText = (text, x, y, options = {}) => {
      if (!text) return;
      const str = String(text);
      doc.text(str, x, y, { align: "right", ...options });
    };

    const addWrappedRTLText = (text, x, y, maxWidth, lineHeight = 6) => {
      if (!text) return y;
      const str = String(text);
      const lines = doc.splitTextToSize(str, maxWidth);
      lines.forEach((line, i) => {
        doc.text(line, x + maxWidth, y + i * lineHeight, { align: "right" });
      });
      return y + lines.length * lineHeight;
    };

    const checkNewPage = (currentY, neededSpace = 20) => {
      if (currentY + neededSpace > pageH - margin) {
        doc.addPage();
        return margin + 10;
      }
      return currentY;
    };

    // COVER PAGE
    doc.setFillColor(250, 250, 247);
    doc.rect(0, 0, pageW, pageH, "F");

    // Purple accent bar at top
    doc.setFillColor(108, 53, 255);
    doc.rect(0, 0, pageW, 8, "F");

    // Logo placeholder (pencil mark)
    doc.setDrawColor(108, 53, 255);
    doc.setLineWidth(2);
    doc.line(margin + 5, 40, margin + 35, 25);
    doc.setFillColor(11, 27, 54);
    doc.circle(margin + 5, 40, 2, "F");

    let y = 60;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(11, 27, 54);
    addRTLText("Briefi", pageW - margin, y);

    y += 12;
    doc.setFontSize(20);
    addRTLText(pdfTitle, pageW - margin, y);

    y += 8;
    doc.setFontSize(12);
    doc.setTextColor(95, 102, 117);
    doc.setFont("helvetica", "normal");
    addRTLText("8 רעיונות לסרטוני וידאו קצרים", pageW - margin, y);

    y += 20;
    doc.setFontSize(11);
    doc.setTextColor(11, 27, 54);
    doc.setFont("helvetica", "bold");
    addRTLText(`לקוח: ${project?.client_name || ""}`, pageW - margin, y);

    if (preparedBy) {
      y += 7;
      addRTLText(`הוכן על ידי: ${preparedBy}`, pageW - margin, y);
    }

    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(154, 161, 173);
    addRTLText(new Date().toLocaleDateString("he-IL"), pageW - margin, y);

    y += 15;
    doc.setDrawColor(230, 228, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);

    if (project?.main_goal) {
      y += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(95, 102, 117);
      addRTLText(`מטרה: ${project.main_goal}`, pageW - margin, y);
    }

    y += 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(11, 27, 54);
    addRTLText(`סה"כ ${briefs.length} בריפים מוכנים`, pageW - margin, y);

    // Bottom bar
    doc.setFillColor(108, 53, 255);
    doc.rect(0, pageH - 8, pageW, 8, "F");

    // CREATIVE DNA PAGE
    if (includeSections.creative_dna && project?.creative_dna) {
      doc.addPage();
      doc.setFillColor(250, 250, 247);
      doc.rect(0, 0, pageW, pageH, "F");
      doc.setFillColor(108, 53, 255);
      doc.rect(0, 0, pageW, 8, "F");

      y = margin + 15;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(11, 27, 54);
      addRTLText("Creative DNA", pageW - margin, y);

      y += 5;
      doc.setDrawColor(108, 53, 255);
      doc.setLineWidth(2);
      doc.line(pageW - margin, y, pageW - margin - 40, y);

      y += 10;
      const dna = project.creative_dna;
      Object.entries(DNA_LABELS).forEach(([key, label]) => {
        const val = dna[key];
        if (!val) return;
        y = checkNewPage(y, 25);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(108, 53, 255);
        addRTLText(label, pageW - margin, y);

        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(95, 102, 117);

        if (Array.isArray(val)) {
          val.forEach(item => {
            y = checkNewPage(y, 10);
            y = addWrappedRTLText(`• ${item}`, margin, y, contentW) + 3;
          });
        } else {
          y = addWrappedRTLText(val, margin, y, contentW) + 3;
        }
        y += 6;
      });
    }

    // BRIEF PAGES
    briefs.forEach((brief, idx) => {
      doc.addPage();
      doc.setFillColor(250, 250, 247);
      doc.rect(0, 0, pageW, pageH, "F");
      doc.setFillColor(108, 53, 255);
      doc.rect(0, 0, pageW, 8, "F");

      const fb = brief.final_brief || {};
      y = margin + 15;

      // Brief number chip
      doc.setFillColor(108, 53, 255);
      doc.roundedRect(margin, y - 5, 18, 8, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(`#${brief.video_number}`, margin + 9, y, { align: "center" });

      doc.setTextColor(11, 27, 54);
      doc.setFontSize(15);
      addRTLText(fb.brief_title || `בריף ${brief.video_number}`, pageW - margin, y);

      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(154, 161, 173);
      addRTLText(brief.category || "", pageW - margin, y);

      y += 8;
      doc.setDrawColor(230, 228, 220);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageW - margin, y);

      const fields = [
        { label: "מטרה", value: fb.goal },
        includeSections.hooks ? { label: "הוק", value: fb.hook } : null,
        { label: "רעיון מרכזי", value: fb.main_idea },
      ].filter(Boolean);

      fields.forEach(f => {
        y = checkNewPage(y, 20);
        y += 7;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(108, 53, 255);
        addRTLText(f.label, pageW - margin, y);
        y += 4;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(11, 27, 54);
        y = addWrappedRTLText(f.value || "—", margin, y, contentW) + 2;
      });

      if (includeSections.body && fb.video_structure?.length) {
        y = checkNewPage(y, 25);
        y += 8;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(108, 53, 255);
        addRTLText("מבנה הסרטון", pageW - margin, y);
        y += 4;
        fb.video_structure.forEach(step => {
          y = checkNewPage(y, 12);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(11, 27, 54);
          y = addWrappedRTLText(`${step.step}. ${step.description}`, margin, y, contentW) + 3;
        });
      }

      if (includeSections.cta && fb.cta) {
        y = checkNewPage(y, 20);
        y += 8;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(108, 53, 255);
        addRTLText("CTA", pageW - margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(11, 27, 54);
        y = addWrappedRTLText(fb.cta, margin, y, contentW) + 2;
      }

      if (includeSections.production_notes && fb.production_notes) {
        y = checkNewPage(y, 20);
        y += 8;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(108, 53, 255);
        addRTLText("הערות צילום", pageW - margin, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(95, 102, 117);
        y = addWrappedRTLText(fb.production_notes, margin, y, contentW) + 2;
      }

      // Bottom bar
      doc.setFillColor(108, 53, 255);
      doc.rect(0, pageH - 8, pageW, 8, "F");
    });

    doc.save(`${project?.client_name || "briefi"}-briefs.pdf`);

    // Update project status
    await base44.entities.Project.update(projectId, { status: "exported" });

    setGenerating(false);
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  };

  if (loading) return <div className="min-h-screen bg-briefi-bg flex items-center justify-center" dir="rtl"><LoadingState /></div>;
  if (generating) return <div className="min-h-screen bg-briefi-bg flex items-center justify-center" dir="rtl"><LoadingState message="מייצרים PDF..." /></div>;

  const checkboxes = [
    { key: "hooks", label: "הוקים" },
    { key: "body", label: "מבנה סרטון" },
    { key: "cta", label: "CTA" },
    { key: "production_notes", label: "הערות צילום" },
    { key: "creative_dna", label: "Creative DNA" },
  ];

  return (
    <div className="min-h-screen bg-briefi-bg" dir="rtl">
      <div className="bg-white border-b border-border px-5 pt-safe pt-4 pb-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(`/brief-pack/${projectId}`)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight className="w-5 h-5 text-briefi-secondary" />
          </button>
          <div>
            <h1 className="text-xl font-black text-briefi-navy">ייצוא ל־PDF</h1>
            <p className="text-xs text-briefi-muted">הפכו את הבריפים למסמך שאפשר לשלוח ללקוח.</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 py-5 space-y-5">
        {/* Summary */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
          <p className="text-sm font-bold text-primary">{project?.client_name}</p>
          <p className="text-briefi-secondary text-sm">{briefs.length} בריפים מוכנים לייצוא</p>
        </div>

        {/* Fields */}
        <div className="bg-white rounded-2xl border border-border p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-briefi-navy">כותרת ה-PDF</label>
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

        {/* Sections */}
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

        {/* Export Button */}
        <button
          onClick={generatePDF}
          disabled={briefs.length === 0}
          className={`w-full h-16 rounded-2xl font-black text-lg text-white flex items-center justify-center gap-3 transition-all active:scale-95 ${done ? "bg-green-500" : ""} ${briefs.length === 0 ? "opacity-40 cursor-not-allowed" : ""}`}
          style={!done && briefs.length > 0 ? { background: "linear-gradient(135deg, #1E8BFF 0%, #8B3DFF 100%)" } : {}}
        >
          {done ? (
            <><Check className="w-6 h-6" /> PDF מוכן!</>
          ) : (
            <><Download className="w-6 h-6" /> ייצאו PDF</>
          )}
        </button>

        <button
          onClick={() => navigate(`/brief-pack/${projectId}`)}
          className="w-full h-12 rounded-2xl font-medium text-sm text-briefi-secondary bg-white border border-border text-center transition-all active:scale-95"
        >
          חזרה לבריפים
        </button>
      </div>
    </div>
  );
}