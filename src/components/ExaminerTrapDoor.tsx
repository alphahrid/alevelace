import { AlertTriangle, ShieldCheck } from "lucide-react";
import { getExaminerTraps } from "@/lib/examiner-traps";

export function ExaminerTrapDoor({ subjectName, topicName }: { subjectName?: string | null; topicName?: string | null }) {
  const traps = getExaminerTraps(subjectName, topicName);
  return (
    <section className="rounded-2xl border border-warning/40 bg-gradient-to-br from-warning/10 via-warning/5 to-transparent p-5 sm:p-6">
      <header className="flex items-center gap-2 mb-1">
        <AlertTriangle className="size-5 text-warning-foreground" />
        <h2 className="text-lg font-semibold tracking-tight">Examiner Trap Door</h2>
      </header>
      <p className="text-xs text-muted-foreground mb-4">
        The top 5 mark-losing mistakes real candidates make in {topicName || subjectName || "this area"}. Read these before your next attempt.
      </p>
      <ol className="space-y-3">
        {traps.map((t, i) => (
          <li key={i} className="rounded-lg border bg-card p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <div className="size-6 shrink-0 rounded-full bg-destructive/15 text-destructive-foreground grid place-items-center text-xs font-bold">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{t.mistake}</div>
                <div className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="size-3.5 shrink-0 mt-0.5 text-success-foreground" />
                  <span><span className="font-semibold text-foreground">How to avoid:</span> {t.avoid}</span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
