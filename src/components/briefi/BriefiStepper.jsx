// Steps shown only from special focus onward:
// 1=פוקוס, 2=קונספט, 3=הוק, 4=CTA
const STEPS = ["פוקוס", "קונספט", "הוק", "CTA"];

export default function BriefiStepper({ currentStep }) {
  // currentStep: 1=פוקוס, 2=קונספט, 3=הוק, 4=CTA
  return (
    <div className="flex items-center justify-center gap-0 w-full">
      {STEPS.map((label, i) => {
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
                className={`text-[9px] font-semibold leading-none ${
                  isActive ? "text-primary" : isDone ? "text-primary/60" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-8 mx-1 mt-[-8px] transition-all ${
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
