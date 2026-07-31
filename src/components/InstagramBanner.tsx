import { Instagram } from "lucide-react";

export const INSTAGRAM_URL = "https://instagram.com/alevelace";

export function InstagramBanner({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={
        compact
          ? "inline-flex items-center gap-2 text-xs font-medium text-primary hover:underline"
          : "flex items-center gap-3 rounded-xl border bg-gradient-to-r from-pink-500/10 via-fuchsia-500/10 to-orange-400/10 p-4 hover:border-primary/40 transition"
      }
    >
      <span className="size-9 rounded-lg bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 text-white grid place-items-center shrink-0">
        <Instagram className="size-5" />
      </span>
      <span className={compact ? "" : "text-sm font-medium leading-snug"}>
        Follow us &amp; send feedback / suggestions via Instagram DMs{" "}
        <span className="font-semibold text-primary">@alevelace</span>!
      </span>
    </a>
  );
}
