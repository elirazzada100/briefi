import React from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

export default function OptionCard({ children, selected, onClick, accentColor, className = "" }) {
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative rounded-2xl border-[1.5px] p-4 cursor-pointer transition-all duration-200
        ${selected
          ? `border-2 shadow-md`
          : "border-border/60 bg-card hover:border-border"
        }
        ${className}`}
      style={selected ? {
        borderColor: accentColor || 'hsl(var(--primary))',
        backgroundColor: `${accentColor || 'hsl(var(--primary))'}10`,
      } : {}}
    >
      {selected && (
        <div
          className="absolute top-3 left-3 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: accentColor || 'hsl(var(--primary))' }}
        >
          <Check className="h-3.5 w-3.5 text-white" />
        </div>
      )}
      {children}
    </motion.div>
  );
}