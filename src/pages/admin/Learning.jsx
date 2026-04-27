import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Shield, CheckCircle, XCircle, Edit2, Plus, RefreshCw, Database, MessageSquare, Lightbulb, AlertTriangle } from "lucide-react";
import FeedbackQueue from "@/components/admin/FeedbackQueue";
import ContentIntelligenceStatus from "@/components/admin/ContentIntelligenceStatus";
import LearningItemsList from "@/components/admin/LearningItemsList";

const TABS = [
  { id: "feedback", label: "תור פידבק", icon: MessageSquare },
  { id: "learnings", label: "פריטי למידה", icon: Lightbulb },
  { id: "intelligence", label: "סטטוס Intelligence", icon: Database },
];

export default function AdminLearning() {
  const [activeTab, setActiveTab] = useState("feedback");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(u => {
      if (!u || u.role !== "admin") {
        navigate("/dashboard");
        return;
      }
      setUser(u);
      setLoading(false);
    }).catch(() => navigate("/dashboard"));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-border/60 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-sm font-black text-foreground">Admin — Learning Dashboard</h1>
            <p className="text-xs text-muted-foreground">ניהול פידבק, למידה ו-Content Intelligence</p>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-xs text-muted-foreground hover:text-foreground font-medium px-3 py-1.5 rounded-lg bg-muted/40"
          >
            חזרה
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-5xl mx-auto px-4 flex gap-1 pb-0">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === "feedback" && <FeedbackQueue />}
        {activeTab === "learnings" && <LearningItemsList />}
        {activeTab === "intelligence" && <ContentIntelligenceStatus />}
      </div>
    </div>
  );
}