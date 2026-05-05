const REGULAR_STEPS = ["סגנון", "פוקוס", "קונספט", "הוק", "CTA"];
const TRENDY_STEPS = ["סגנון", "פוקוס", "קונספט", "CTA"];

export default function BriefiStepper({ currentStep, isTrendy = false }) {
  const steps = isTrendy ? TRENDY_STEPS : REGULAR_STEPS;

  return (
    <div className="flex items-center justify-center gap-0 w-full" dir="rtl">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        return (
          <div key={label} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                  isDone
                    ? "bg-primary text-white"
                    : isActive
                    ? "bg-primary text-white ring-2 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isDone ? "✓" : stepNum}
              </div>
              <span
                className={`text-[9px] font-semibold leading-none whitespace-nowrap ${
                  isActive ? "text-primary" : isDone ? "text-primary/60" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-px w-6 md:w-8 mx-1 mt-[-8px] transition-all ${
                  isDone ? "bg-primary/40" : "bg-border"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
