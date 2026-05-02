import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";

const DEFAULT_LOADING_MESSAGES = [
  "מביאים איש קריאייטיב.",
  "רגע, מביאים מצלמה מהשכן.",
  "הוק טוב, הכל טוב.",
  "עוד רגע זה מוכן.",
  "טיפ קטן: פתיחה טובה עושה חצי עבודה.",
  "טיפ קטן: עדיף רעיון ברור מאפקט יפה.",
  "טיפ קטן: אל תצלמו הכול. תצלמו את הרגע.",
];

function normalizeMessages(messages) {
  if (Array.isArray(messages) && messages.length) {
    return messages.filter(Boolean).slice(0, 2);
  }

  return DEFAULT_LOADING_MESSAGES;
}

export default function BriefiLoader({ messages, rotateMs = 3000 }) {
  const resolvedMessages = useMemo(() => normalizeMessages(messages), [messages]);
  const [msgIdx, setMsgIdx] = useState(() => Math.floor(Math.random() * resolvedMessages.length));

  useEffect(() => {
    setMsgIdx(0);
  }, [resolvedMessages]);

  useEffect(() => {
    if (resolvedMessages.length <= 1) return undefined;

    const interval = setInterval(() => {
      setMsgIdx(i => (i + 1) % resolvedMessages.length);
    }, rotateMs);

    return () => clearInterval(interval);
  }, [resolvedMessages, rotateMs]);

  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 px-6 py-8 text-center">
      <Loader2 className="w-7 h-7 text-primary animate-spin" />
      <div className="max-w-[260px] space-y-1 px-2">
        <p className="text-sm font-semibold leading-7 text-muted-foreground">
          {resolvedMessages[msgIdx]}
        </p>
      </div>
    </div>
  );
}
