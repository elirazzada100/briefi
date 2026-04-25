const steps = ["פרויקט", "קטגוריה", "הוק", "בריף"];

export default function ProgressSteps({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isActive = stepNum === currentStep;
        const isDone = stepNum < currentStep;
        return (
          <div key={i} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                  ${isDone ? "bg-primary text-white" : isActive ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-muted text-muted-foreground"}`}
              >
                {isDone ? "✓" : stepNum}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-0.5 mb-4 rounded-full ${isDone ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}