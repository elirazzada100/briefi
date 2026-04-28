import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

// Shared wrapper for legal pages (Privacy, Terms)
export default function LegalPage({ title, lastUpdated, children }) {
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
          <div>
            <h1 className="text-base font-black text-foreground">{title}</h1>
            {lastUpdated && (
              <p className="text-[11px] text-muted-foreground">עודכן לאחרונה: {lastUpdated}</p>
            )}
          </div>
        </div>
      </div>

      <div className="briefi-page-container pt-4 pb-16">
        <div className="space-y-5 text-sm text-foreground leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

// Reusable section component
export function LegalSection({ title, children }) {
  return (
    <div className="space-y-2">
      <h2 className="font-black text-foreground text-base">{title}</h2>
      <div className="text-muted-foreground leading-relaxed space-y-2">{children}</div>
    </div>
  );
}