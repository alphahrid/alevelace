import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function CommunityCounter({ className }: { className?: string }) {
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    supabase.rpc("community_stats").then(({ data }) => {
      const row = (data as Array<{ total: number }> | null)?.[0];
      if (row) setTotal(row.total);
    });
  }, []);

  if (total === null) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-orange-500/10 via-primary/10 to-transparent px-4 py-1.5 text-sm font-medium",
        className
      )}
    >
      🔥 Join <span className="tabular-nums font-bold">{total.toLocaleString()}</span> Active A-Level Ace Students
    </div>
  );
}
