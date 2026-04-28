// Steps: 1=עסק, 2=ניתוח, 3=סגנון, 4=קונספט, 5=מבנה, 6=CTA, 7=בריף
const STEPS = ["עסק", "ניתוח", "סגנון", "קונספט", "מבנה", "CTA", "בריף"];

export default function BriefiStepper({ currentStep }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto no-scrollbar">
      {STEPS.map((label, i) => {
        const stepNum = i + 1;
        const isDone = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        return (
          <div key={label} className="flex items-center flex-shrink-0">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
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
                className={`h-px w-4 mx-0.5 mt-[-8px] transition-all ${
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