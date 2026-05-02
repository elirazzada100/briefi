import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

function normalizeMessages(message) {
  if (Array.isArray(message)) {
    return message.filter(Boolean).slice(0, 2);
  }

  if (typeof message === "string" && message.trim()) {
    return message
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 2);
  }

  return ["שנייה סיימנו."];
}

export default function LoadingState({ message = "שנייה סיימנו.", rotateMs = 3000 }) {
  const messages = useMemo(() => normalizeMessages(message), [message]);
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    setMsgIdx(0);
  }, [messages]);

  useEffect(() => {
    if (messages.length <= 1) return undefined;

    const interval = setInterval(() => {
      setMsgIdx((idx) => (idx + 1) % messages.length);
    }, rotateMs);

    return () => clearInterval(interval);
  }, [messages, rotateMs]);

  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <div className="max-w-[260px] space-y-1 px-2">
        <p className="text-sm font-medium leading-7 text-muted-foreground">
          {messages[msgIdx]}
        </p>
      </div>
    </div>
  );
}
