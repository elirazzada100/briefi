import { Loader2 } from "lucide-react";

export default function LoadingState({ message = "טוען..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="text-sm text-muted-foreground font-medium">{message}</p>
    </div>
  );
}