import { Loader2 } from "lucide-react";

export default function LoadingState({ message = "שנייה סיימנו" }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="max-w-[220px] text-sm font-medium leading-6 text-muted-foreground">{message}</p>
    </div>
  );
}
