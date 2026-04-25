import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function LoadingState({ message = "Briefi עובד על זה..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
      >
        <Loader2 className="h-8 w-8 text-primary" />
      </motion.div>
      <p className="text-sm text-muted-foreground font-medium">{message}</p>
    </div>
  );
}