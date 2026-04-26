import React from "react";
import { Check } from "lucide-react";

const steps = [
  { label: "קטגוריה" },
  { label: "קונספט" },
  { label: "הוק" },
  { label: "מבנה" },
  { label: "CTA" },
];

export default function StepProgress({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-1 pt-2 pb-1 overflow-x-hidden">
      {steps.map((step, index) => {
        const stepNum = index + 1;
        const isActive = stepNum === currentStep;
        const isComplete = stepNum < currentStep;

        return (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300
                  ${isComplete
                    ? "bg-primary text-white shadow-sm shadow-primary/30"
                    : isActive
                    ? "bg-primary text-white ring-4 ring-primary/15"
                    : "bg-muted text-muted-foreground"
                  }`}
              >
                {isComplete ? <Check className="h-3.5 w-3.5" /> : stepNum}
              </div>
              <span className={`text-[9px] font-semibold leading-none ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-6 h-0.5 rounded-full mb-4 transition-all duration-300 ${stepNum < currentStep ? "bg-primary" : "bg-border"}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}