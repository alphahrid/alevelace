import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Square } from "lucide-react";

// Strip markdown/LaTeX for cleaner speech
function clean(text: string): string {
  return text
    .replace(/\$\$([\s\S]*?)\$\$/g, " $1 ")
    .replace(/\$([^$]+)\$/g, " $1 ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#+\s*/g, "")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function ReadAloud({
  text,
  label = "Read aloud",
  size = "sm",
  variant = "outline",
}: {
  text: string;
  label?: string;
  size?: "sm" | "default" | "lg";
  variant?: "outline" | "ghost" | "default" | "secondary";
}) {
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  if (!supported) return null;

  const start = () => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(clean(text));
    u.rate = 1;
    u.pitch = 1;
    u.lang = "en-GB";
    // Prefer a British voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) => /en-GB/i.test(v.lang)) || voices.find((v) => /en/i.test(v.lang));
    if (preferred) u.voice = preferred;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utterRef.current = u;
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return (
    <Button size={size} variant={variant} onClick={speaking ? stop : start} className="gap-1.5" type="button">
      {speaking ? <Square className="size-3.5" /> : <Volume2 className="size-3.5" />}
      {speaking ? "Stop" : label}
    </Button>
  );
}
