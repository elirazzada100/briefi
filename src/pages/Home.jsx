import { Link } from "react-router-dom";
import { Plus, FolderOpen, User } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen bg-briefi-bg flex flex-col items-center justify-center px-5" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm flex flex-col items-center text-center gap-6"
      >
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl bg-white border border-border shadow-sm flex items-center justify-center">
          <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="10" y1="32" x2="28" y2="8" strokeLinecap="round" />
            <path d="M28 8 L30 6 L32 8 L28 8Z" fill="currentColor" />
            <path d="M10 32 Q14 28 20 30" strokeLinecap="round" />
          </svg>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-briefi-navy">מה בונים היום?</h1>
          <p className="text-sm text-briefi-secondary leading-relaxed">
            בונים בריפים לסושיאל שלב אחרי שלב.<br />
            בלי להתחיל מדף ריק.
          </p>
        </div>

        {/* Primary CTA */}
        <div className="w-full space-y-3">
          <Link to="/new-project" className="block">
            <button className="w-full h-12 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-md shadow-primary/20 transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #6C35FF 0%, #249BFF 100%)" }}>
              <Plus className="h-4 w-4" />
              בריף חדש
            </button>
          </Link>

          <Link to="/dashboard" className="block">
            <button className="w-full h-11 rounded-2xl text-sm font-semibold text-briefi-navy bg-white border border-border flex items-center justify-center gap-2 transition-all active:scale-95 hover:border-primary/30">
              <FolderOpen className="h-4 w-4 text-briefi-secondary" />
              הפרויקטים שלי
            </button>
          </Link>
        </div>

        {/* Microcopy */}
        <p className="text-xs text-briefi-muted">
          הבריפים, הלקוחות והייצואים שלך שמורים במקום אחד.
        </p>

        {/* Profile link */}
        <Link to="/profile" className="flex items-center gap-1.5 text-xs text-briefi-muted hover:text-briefi-secondary transition-colors">
          <User className="h-3.5 w-3.5" />
          הגדרות פרופיל
        </Link>
      </motion.div>
    </div>
  );
}