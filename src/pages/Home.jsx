import { Link, useNavigate } from "react-router-dom";
import { Plus, FolderOpen, User, Sparkles, LogOut, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
{ to: "/dashboard", icon: FolderOpen, label: "הלקוחות שלי", desc: "כל הבריפים במקום אחד", color: "#7C3AED" },
{ to: "/profile", icon: User, label: "הגדרות ומיתוג", desc: "לוגו, שם, צבעי מותג", color: "#3B82F6" }];


export default function Home() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-between px-5 py-10" dir="rtl">
      {/* Top-left settings gear icon */}
      <div className="w-full max-w-sm flex justify-end mb-2">
        <button
          onClick={() => navigate("/settings")}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/60 transition-all"
          aria-label="הגדרות"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm flex flex-col items-center gap-8">
        
        {/* Logo mark */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, #7C3AED 0%, #3B82F6 100%)" }}>
            
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-foreground">מה בונים היום?</h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              בריפים לסושיאל, שלב אחרי שלב.
            </p>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="w-full">
          <Link to="/new-project" className="block">
            <button className="briefi-btn-primary w-full text-base">
              <Plus className="h-4 w-4" />
              לקוח חדש
            </button>
          </Link>
        </div>

        {/* Nav cards */}
        <div className="w-full space-y-2.5">
          {navItems.map((item) =>
          <Link to={item.to} key={item.to} className="block">
              <div className="flex items-center gap-3.5 bg-white rounded-2xl border border-border/60 px-4 py-3.5 hover:border-primary/25 hover:shadow-sm transition-all group">
                <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${item.color}15` }}>
                
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </motion.div>

      {/* Bottom area: logout + disclaimer */}
      <div className="w-full max-w-sm flex flex-col items-center pt-6">
        {isAuthenticated && (
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto mb-5"
          >
            <LogOut className="w-3.5 h-3.5" />
            התנתקות
          </button>
        )}
        <p className="text-[11px] text-muted-foreground/50 text-center">
          בריפי יכול לטעות לפעמים.
        </p>
      </div>
    </div>);

}