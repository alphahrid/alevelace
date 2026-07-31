import { BOARD_SHORT, useBoard, type Board } from "@/lib/board";
import { cn } from "@/lib/utils";

export function BoardToggle({ className }: { className?: string }) {
  const { board, setBoard } = useBoard();
  return (
    <div className={cn("inline-flex rounded-lg border bg-muted/40 p-0.5", className)} title="Active exam board">
      {(["cambridge", "edexcel"] as Board[]).map((b) => (
        <button
          key={b}
          type="button"
          onClick={() => setBoard(b)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[11px] font-semibold transition",
            board === b ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {BOARD_SHORT[b]}
        </button>
      ))}
    </div>
  );
}
