import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="briefi-header">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"
          >
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <h1 className="text-base font-black text-foreground">אודות בריפי</h1>
        </div>
      </div>

      <div className="briefi-page-container pt-6">
        <div className="flex flex-col items-center gap-5 mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)" }}
          >
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black text-foreground text-center">Briefi</h2>
        </div>

        <div className="bg-white rounded-2xl border border-border/60 p-5 leading-relaxed text-foreground space-y-5 text-base">
          <p>
            בריפי נוצרה בידיעה שאנחנו יכולים להפוך את העולם למקום יותר טוב, לא על ידי החלפה של ה-AI באדם, אלא שהוא יבוא לעזר.
          </p>
          <p>
            ככה נתחיל לראות רעיונות חדשים וקריאייטיביים יותר בשוק.
          </p>
          <p>
            תשתמשו בו טוב.
          </p>
          <p className="font-bold text-primary">
            בהצלחה (:
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">Briefi</p>
      </div>
    </div>
  );
}