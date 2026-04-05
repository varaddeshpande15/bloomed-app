/**
 * Local calendar date key (YYYY-MM-DD) for streak / activity grid.
 */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseLocalDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addLocalDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Sunday-aligned start for GitHub-style grid (row 0 = Sunday). */
function previousSundayOnOrBefore(d: Date): Date {
  const s = startOfLocalDay(d);
  const dow = s.getDay();
  return addLocalDays(s, -dow);
}

export type CompletionEntry = { sessionId: string; completedAt: string };

/** One session per local day (most recently completed wins). */
export function mergeCompletionsByDay(entries: CompletionEntry[]): Map<string, string> {
  const best = new Map<string, { sessionId: string; t: number }>();
  for (const e of entries) {
    const d = new Date(e.completedAt);
    if (Number.isNaN(d.getTime())) continue;
    const key = localDateKey(d);
    const t = d.getTime();
    const cur = best.get(key);
    if (!cur || t > cur.t) {
      best.set(key, { sessionId: e.sessionId, t });
    }
  }
  return new Map([...best.entries()].map(([k, v]) => [k, v.sessionId]));
}

/**
 * Current streak: consecutive local days with a completed test, anchored from today or yesterday.
 */
export function computeCurrentStreak(dayKeys: Set<string>): number {
  const today = startOfLocalDay(new Date());
  const todayKey = localDateKey(today);
  const yesterdayKey = localDateKey(addLocalDays(today, -1));

  let anchor = todayKey;
  if (!dayKeys.has(todayKey)) {
    if (!dayKeys.has(yesterdayKey)) return 0;
    anchor = yesterdayKey;
  }

  let streak = 0;
  let d = parseLocalDateKey(anchor);
  while (dayKeys.has(localDateKey(d))) {
    streak += 1;
    d = addLocalDays(d, -1);
  }
  return streak;
}

export type CalendarCell = {
  dateKey: string;
  sessionId: string | null;
  inRange: boolean;
};

/** Columns = weeks (oldest → newest), rows = Sun → Sat. ~53 weeks. */
export function buildContributionGrid(
  dayToSession: Map<string, string>,
  totalWeeks = 53,
): { grid: CalendarCell[][]; weekLabels: string[] } {
  const end = startOfLocalDay(new Date());
  const start = addLocalDays(end, -(totalWeeks * 7 - 1));
  const gridStart = previousSundayOnOrBefore(start);

  const grid: CalendarCell[][] = [];

  for (let w = 0; w < totalWeeks; w++) {
    const col: CalendarCell[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const cellDate = addLocalDays(gridStart, w * 7 + dow);
      const dateKey = localDateKey(cellDate);
      const inRange = cellDate >= start && cellDate <= end;
      const sessionId = inRange ? (dayToSession.get(dateKey) ?? null) : null;
      col.push({ dateKey, sessionId, inRange });
    }
    grid.push(col);
  }

  const weekLabels: string[] = [];
  let prevMonth = -1;
  for (let w = 0; w < totalWeeks; w++) {
    const sunday = addLocalDays(gridStart, w * 7);
    const m = sunday.getMonth();
    const show = w === 0 || m !== prevMonth;
    weekLabels.push(show ? sunday.toLocaleString("en", { month: "short" }) : "");
    prevMonth = m;
  }

  return { grid, weekLabels };
}
