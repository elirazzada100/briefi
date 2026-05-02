import { useEffect, useMemo, useState } from "react";
import BriefiLogo from "./BriefiLogo";

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

  return ["עוד רגע זה מוכן."];
}

export default function LoadingState({ message = "עוד רגע זה מוכן.", rotateMs = 3000 }) {
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
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-5 px-6 py-8 text-center animate-fade-in">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <BriefiLogo size={32} />
        </div>
      </div>
      <div className="max-w-[260px] space-y-1 px-2">
        <p className="text-base font-medium leading-7 text-briefi-secondary">
          {messages[msgIdx]}
        </p>
      </div>
    </div>
  );
}
