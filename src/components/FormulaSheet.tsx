import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/Markdown";
import { Sigma, Copy, Check } from "lucide-react";
import { sheetsForBoard } from "@/lib/formulas";
import { useBoard, BOARD_LABEL } from "@/lib/board";
import { cn } from "@/lib/utils";

export function FormulaSheetTrigger({ className }: { className?: string }) {
  const { board } = useBoard();
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const groups = useMemo(() => {
    const all = sheetsForBoard(board);
    const needle = q.trim().toLowerCase();
    if (!needle) return all;
    return all
      .map((g) => ({
        ...g,
        sets: g.sets
          .map((s) => ({ ...s, formulas: s.formulas.filter((f) => (f.name + " " + f.latex).toLowerCase().includes(needle)) }))
          .filter((s) => s.formulas.length > 0),
      }))
      .filter((g) => g.sets.length > 0);
  }, [board, q]);

  const copy = async (latex: string) => {
    try {
      await navigator.clipboard.writeText(latex);
      setCopied(latex);
      setTimeout(() => setCopied(null), 1500);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className={cn("gap-1.5", className)} aria-label="Open formula cheat sheet">
          <Sigma className="size-4" /> Formulas
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto print:hidden">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><Sigma className="size-5 text-primary" /> Formula cheat sheets</SheetTitle>
          <SheetDescription>Quick reference for {BOARD_LABEL[board]} — tap the copy icon to grab the LaTeX.</SheetDescription>
        </SheetHeader>

        <div className="px-4">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search formulae, e.g. de Broglie, break-even…"
            aria-label="Search formulae"
          />
        </div>

        <div className="px-4 pb-8 space-y-6">
          {groups.length === 0 && <p className="text-sm text-muted-foreground">No formulae match “{q}”.</p>}
          {groups.map((g) => (
            <section key={g.subject}>
              <h3 className="text-sm font-semibold tracking-tight mb-2">{g.subject}</h3>
              <div className="space-y-3">
                {g.sets.map((s) => (
                  <div key={s.title} className="rounded-lg border bg-card">
                    <div className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground border-b">{s.title}</div>
                    <ul className="divide-y">
                      {s.formulas.map((f) => (
                        <li key={f.name} className="p-3 flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium">{f.name}</div>
                            <div className="text-sm overflow-x-auto"><Markdown>{`$$${f.latex}$$`}</Markdown></div>
                            {f.note && <div className="text-[11px] text-muted-foreground">{f.note}</div>}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-h-11 min-w-11 shrink-0"
                            aria-label={`Copy LaTeX for ${f.name}`}
                            onClick={() => void copy(f.latex)}
                          >
                            {copied === f.latex ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
