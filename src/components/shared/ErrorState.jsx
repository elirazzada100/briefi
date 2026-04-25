import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorState({ message = "משהו נתקע בדרך. נסו שוב בעוד רגע.", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="h-6 w-6 text-destructive" />
      </div>
      <p className="text-sm text-muted-foreground font-medium">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="gap-2 rounded-xl">
          <RotateCcw className="h-4 w-4" />
          נסה שוב
        </Button>
      )}
    </div>
  );
}