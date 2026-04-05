"use client";

import { cn } from "@/lib/utils";
import {
  buildContributionGrid,
  mergeCompletionsByDay,
  type CompletionEntry,
} from "@/lib/test-streak-calendar";
import { CalendarDaysIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

export function TestActivityCalendar({
  entries,
  streak,
}: {
  entries: CompletionEntry[];
  streak: number;
}) {
  const router = useRouter();

  const { grid, weekLabels } = React.useMemo(() => {
    const byDay = mergeCompletionsByDay(entries);
    return buildContributionGrid(byDay, 53);
  }, [entries]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <CalendarDaysIcon className="size-5" aria-hidden />
        <h2 className="text-lg font-semibold">Test activity</h2>
        <span className="text-xs text-muted-foreground">
          Last year · darker squares = completed test with report
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border-2 border-foreground bg-card/50 p-4 shadow-[4px_4px_0_0_rgb(0_0_0)] dark:bg-card/30">
        <div className="min-w-[720px] sm:min-w-0">
          <div className="mb-1 flex gap-1 pl-7">
            {weekLabels.map((lab, i) => (
              <div
                key={`m-${i}`}
                className="flex w-3 flex-shrink-0 justify-center sm:w-3.5"
              >
                {lab ? (
                  <span className="text-[10px] font-medium text-muted-foreground">{lab}</span>
                ) : null}
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            <div className="flex flex-col justify-between gap-[3px] pr-1 pt-0.5">
              {DOW.map((d, i) => (
                <span
                  key={`dow-${i}`}
                  className="flex h-3 w-4 items-center justify-end text-[9px] font-medium leading-none text-muted-foreground sm:h-3.5"
                >
                  {d}
                </span>
              ))}
            </div>
            <div className="flex gap-[3px]">
              {grid.map((weekCol, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {weekCol.map((cell) => {
                    const hasReport = Boolean(cell.sessionId);
                    const label = cell.inRange
                      ? new Date(cell.dateKey + "T12:00:00").toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "";
                    return (
                      <button
                        key={cell.dateKey}
                        type="button"
                        disabled={!cell.inRange || !hasReport}
                        title={cell.inRange ? `${label}${hasReport ? " · Open report" : ""}` : ""}
                        aria-label={
                          cell.inRange
                            ? hasReport
                              ? `Completed test on ${label}, open report`
                              : `No test on ${label}`
                            : undefined
                        }
                        onClick={() => {
                          if (cell.sessionId) {
                            router.push(`/tests/${cell.sessionId}`);
                          }
                        }}
                        className={cn(
                          "size-3 shrink-0 rounded-sm border transition-opacity sm:size-3.5",
                          !cell.inRange && "pointer-events-none border-transparent bg-transparent opacity-0",
                          cell.inRange &&
                            !hasReport &&
                            "border-border bg-muted/50 hover:bg-muted dark:bg-muted/30",
                          hasReport &&
                            "border-foreground bg-foreground hover:opacity-85 dark:hover:opacity-90",
                        )}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Streak today: <span className="font-semibold text-foreground">{streak}</span> day
        {streak === 1 ? "" : "s"} · Click a filled square to open that day&apos;s report.
      </p>
    </section>
  );
}
