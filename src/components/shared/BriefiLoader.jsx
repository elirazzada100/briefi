import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

const LOADING_MESSAGES = [
  "מביאים איש קריאייטיב",
  "רגע, מביאים מצלמה מהשכן",
  "הוק טוב, הכל טוב",
  "שנייה סיימנו",
  "עוד רגע זה מוכן",
  "מסדרים לך רעיון",
  "טיפ קטן: פתיחה טובה עושה חצי עבודה.",
  "טיפ קטן: עדיף רעיון ברור מאפקט יפה.",
  "טיפ קטן: אל תצלמו הכול. תצלמו את הרגע.",
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
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-8 text-center">
      <Loader2 className="w-7 h-7 text-primary animate-spin" />
      <p className="max-w-[220px] text-sm font-semibold leading-6 text-muted-foreground">
        {LOADING_MESSAGES[msgIdx]}
      </p>
    </div>
  );
}
