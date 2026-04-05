"use client";

import { Flame } from "lucide-react";

export function TestStreakBadge({ streak }: { streak: number }) {
  return (
    <div
      className="flex shrink-0 items-center gap-3 rounded-xl border-2 border-foreground bg-muted/40 px-4 py-3 shadow-[4px_4px_0_0_rgb(0_0_0)] dark:bg-muted/20"
      aria-live="polite"
    >
      <div className="flex size-11 items-center justify-center rounded-lg border-2 border-foreground bg-background">
        <Flame className="size-6 text-orange-500 dark:text-orange-400" aria-hidden />
      </div>
      <div className="text-left">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Day streak
        </p>
        <p className="text-3xl font-black tabular-nums leading-none text-foreground">{streak}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {streak === 0
            ? "Complete a test to start"
            : streak === 1
              ? "Keep it going"
              : "Adaptive tests with saved reports"}
        </p>
      </div>
    </div>
  );
}
