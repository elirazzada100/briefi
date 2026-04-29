import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const LOADING_MESSAGES = [
  "מביאים איש קריאייטיב",
  "רגע, מביאים מצלמה מהשכן",
  "הוק טוב, הכל טוב",
  "שנייה סיימנו",
];

export default function BriefiLoader() {
  const [msgIdx, setMsgIdx] = useState(() => Math.floor(Math.random() * LOADING_MESSAGES.length));

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx(i => (i + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <Loader2 className="w-7 h-7 text-primary animate-spin" />
      <p className="text-sm font-semibold text-muted-foreground text-center">{LOADING_MESSAGES[msgIdx]}</p>
    </div>
  );
}