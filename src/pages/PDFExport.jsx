import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { ArrowRight, FileDown, Loader2 } from "lucide-react";
import LoadingState from "@/components/shared/LoadingState";
import { jsPDF } from "jspdf";

const sectionOptions = [
  { id: "hooks", label: "הוקים" },
  { id: "video_structure", label: "מבנה סרטון" },
  { id: "cta", label: "CTA" },
  { id: "production_notes", label: "הערות צילום" },
  { id: "creative_dna", label: "Creative DNA" },
  { id: "caption_suggestion", label: "הצעה לכיתוב" },
];

export default function PDFExport() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [pdfTitle, setPdfTitle] = useState("חבילת בריפים לסושיאל");
  const [preparedBy, setPreparedBy] = useState("");
  const [selectedSections, setSelectedSections] = useState(["hooks", "video_structure", "cta", "production_notes", "creative_dna"]);
  const [exporting, setExporting] = useState(false);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
  });

  const { data: briefs = [] } = useQuery({
    queryKey: ["briefs", projectId],
    queryFn: () => base44.entities.VideoBrief.filter({ project_id: projectId }, "video_number"),
  });

  const readyBriefs = briefs.filter(b => b.final_brief);

  const toggleSection = (id) => {
    setSelectedSections(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleExport = async () => {
    setExporting(true);

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = 210;
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    // Cover page
    doc.setFillColor(250, 250, 247);
    doc.rect(0, 0, 210, 297, "F");
    
    doc.setFillColor(108, 53, 255);
    doc.rect(0, 0, 210, 4, "F");

    doc.setFontSize(28);
    doc.setTextColor(11, 27, 54);
    doc.text(pdfTitle, pageWidth / 2, 80, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(95, 102, 117);
    doc.text(`${readyBriefs.length} briefs for ${project?.client_name}`, pageWidth / 2, 95, { align: "center" });

    if (preparedBy) {
      doc.setFontSize(11);
      doc.text(`Prepared by: ${preparedBy}`, pageWidth / 2, 115, { align: "center" });
    }

    doc.setFontSize(10);
    doc.text(new Date().toLocaleDateString("he-IL"), pageWidth / 2, 130, { align: "center" });

    // Creative DNA page
    if (selectedSections.includes("creative_dna") && project?.creative_dna) {
      doc.addPage();
      doc.setFillColor(250, 250, 247);
      doc.rect(0, 0, 210, 297, "F");
      
      doc.setFillColor(108, 53, 255);
      doc.rect(0, 0, 210, 4, "F");

      let y = 25;
      doc.setFontSize(18);
      doc.setTextColor(11, 27, 54);
      doc.text("Creative DNA", margin, y);
      y += 15;

      const dna = project.creative_dna;
      const dnaFields = [
        { label: "Main Angle", value: dna.main_angle },
        { label: "Audience Truth", value: dna.audience_truth },
        { label: "What's Interesting", value: dna.what_is_interesting },
        { label: "What to Avoid", value: dna.what_to_avoid },
        { label: "Content Directions", value: Array.isArray(dna.recommended_content_directions) ? dna.recommended_content_directions.join(", ") : "" },
      ];

      dnaFields.forEach(f => {
        if (!f.value) return;
        doc.setFontSize(10);
        doc.setTextColor(108, 53, 255);
        doc.text(f.label, margin, y);
        y += 5;
        doc.setFontSize(10);
        doc.setTextColor(95, 102, 117);
        const lines = doc.splitTextToSize(f.value, contentWidth);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 8;
      });
    }

    // Brief pages
    readyBriefs.forEach((brief, index) => {
      doc.addPage();
      doc.setFillColor(250, 250, 247);
      doc.rect(0, 0, 210, 297, "F");

      doc.setFillColor(108, 53, 255);
      doc.rect(0, 0, 210, 4, "F");

      let y = 25;
      const fb = brief.final_brief;

      doc.setFontSize(10);
      doc.setTextColor(108, 53, 255);
      doc.text(`Brief #${index + 1}`, margin, y);
      y += 7;

      doc.setFontSize(16);
      doc.setTextColor(11, 27, 54);
      const titleLines = doc.splitTextToSize(fb.brief_title || `Video #${index + 1}`, contentWidth);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 7 + 5;

      const addField = (label, value) => {
        if (!value || y > 270) return;
        doc.setFontSize(9);
        doc.setTextColor(108, 53, 255);
        doc.text(label, margin, y);
        y += 4;
        doc.setFontSize(10);
        doc.setTextColor(11, 27, 54);
        const lines = doc.splitTextToSize(String(value), contentWidth);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 6;
      };

      addField("Goal", fb.goal);
      addField("Category", fb.category);

      if (selectedSections.includes("hooks")) {
        addField("Hook", fb.hook);
      }

      addField("Main Idea", fb.main_idea);

      if (selectedSections.includes("video_structure") && fb.video_structure) {
        doc.setFontSize(9);
        doc.setTextColor(108, 53, 255);
        doc.text("Video Structure", margin, y);
        y += 4;
        fb.video_structure.forEach(step => {
          if (y > 270) return;
          doc.setFontSize(10);
          doc.setTextColor(11, 27, 54);
          const stepText = `${step.step}. ${step.description}`;
          const lines = doc.splitTextToSize(stepText, contentWidth - 5);
          doc.text(lines, margin + 2, y);
          y += lines.length * 5 + 2;
        });
        y += 4;
      }

      if (selectedSections.includes("cta")) {
        addField("CTA", fb.cta);
      }

      if (selectedSections.includes("production_notes")) {
        addField("Production Notes", fb.production_notes);
      }

      if (selectedSections.includes("caption_suggestion") && fb.caption_suggestion) {
        addField("Caption Suggestion", fb.caption_suggestion);
      }

      addField("Risk Level", fb.client_risk_level);
    });

    doc.save(`${project?.client_name || "briefs"}-brief-pack.pdf`);
    
    await base44.entities.Project.update(project.id, { status: "exported" });
    setExporting(false);
  };

  if (!project) return <LoadingState />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-6"
    >
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-foreground mb-2">ייצוא ל־PDF</h1>
        <p className="text-sm text-muted-foreground">
          הפכו את הבריפים למסמך שאפשר לשלוח ללקוח.
        </p>
      </div>

      <div className="space-y-6 mb-8">
        <div className="space-y-2">
          <Label className="text-sm font-bold">כותרת ה־PDF</Label>
          <Input
            value={pdfTitle}
            onChange={(e) => setPdfTitle(e.target.value)}
            className="h-12 rounded-xl text-sm"
            dir="rtl"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold">שם הלקוח</Label>
          <Input
            value={project.client_name}
            disabled
            className="h-12 rounded-xl text-sm bg-muted"
            dir="rtl"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold">הוכן על ידי</Label>
          <Input
            value={preparedBy}
            onChange={(e) => setPreparedBy(e.target.value)}
            placeholder="שם שלכם או שם הסוכנות"
            className="h-12 rounded-xl text-sm"
            dir="rtl"
          />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-bold">סעיפים לכלול</Label>
          {sectionOptions.map((section) => (
            <div key={section.id} className="flex items-center gap-3">
              <Checkbox
                checked={selectedSections.includes(section.id)}
                onCheckedChange={() => toggleSection(section.id)}
                id={section.id}
              />
              <label htmlFor={section.id} className="text-sm font-medium text-foreground cursor-pointer">
                {section.label}
              </label>
            </div>
          ))}
        </div>

        <div className="bg-muted rounded-2xl p-4 text-center">
          <p className="text-sm font-semibold text-foreground">{readyBriefs.length} בריפים מוכנים לייצוא</p>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          onClick={handleExport}
          disabled={exporting || readyBriefs.length === 0}
          className="w-full h-14 rounded-2xl text-base font-bold gap-2 shadow-lg shadow-primary/20"
        >
          {exporting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <FileDown className="h-5 w-5" />
          )}
          {exporting ? "מייצא..." : "ייצאו PDF"}
        </Button>

        <button
          onClick={() => navigate(`/project/${projectId}/briefs`)}
          className="w-full text-center text-sm text-muted-foreground font-medium flex items-center justify-center gap-1"
        >
          <ArrowRight className="h-4 w-4" />
          חזרה לבריפים
        </button>
      </div>
    </motion.div>
  );
}