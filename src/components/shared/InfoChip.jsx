import React from "react";

export default function InfoChip({ label, value }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
      <span>{label}:</span>
      <span className="text-foreground font-semibold">{value}</span>
    </div>
  );
}