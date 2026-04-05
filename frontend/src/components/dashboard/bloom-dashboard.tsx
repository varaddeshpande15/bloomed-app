"use client";

import {
  getBloomTestCompletionActivity,
  listBloomTestSessionsForUser,
} from "@/actions/bloom-test-session";
import {
  TraitAdaptationCard,
  TraitOnboardingCtaCard,
} from "@/components/dashboard/trait-adaptation-card";
import { TestActivityCalendar } from "@/components/dashboard/test-activity-calendar";
import { TestStreakBadge } from "@/components/dashboard/test-streak-badge";
import type { MappedTraits } from "@/lib/map-traits";
import { quoteForToday, SYLLABUS_TEMPLATES } from "@/lib/bloom-templates";
import {
  computeCurrentStreak,
  mergeCompletionsByDay,
} from "@/lib/test-streak-calendar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion } from "framer-motion";
import { ArrowRightIcon, ClipboardListIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import * as React from "react";

export function BloomDashboard({
  userName,
  adaptation,
}: {
  userName: string;
  adaptation: {
    mapped: MappedTraits;
    updatedAt: string | null;
  } | null;
}) {
  const [sessions, setSessions] = React.useState<
    Awaited<ReturnType<typeof listBloomTestSessionsForUser>>
  >([]);
  const [completionActivity, setCompletionActivity] = React.useState<
    Awaited<ReturnType<typeof getBloomTestCompletionActivity>>
  >([]);
  const quote = React.useMemo(() => quoteForToday(), []);

  const testStreak = React.useMemo(() => {
    const byDay = mergeCompletionsByDay(completionActivity);
    return computeCurrentStreak(new Set(byDay.keys()));
  }, [completionActivity]);

  const loadDashboardData = React.useCallback(() => {
    void listBloomTestSessionsForUser().then(setSessions);
    void getBloomTestCompletionActivity().then(setCompletionActivity);
  }, []);

  React.useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  React.useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") loadDashboardData();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [loadDashboardData]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-w-0 flex-1 space-y-3"
        >
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Hi {userName}!
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground italic border-l-4 border-foreground pl-4">
            {quote}
          </p>
        </motion.div>
        <TestStreakBadge streak={testStreak} />
      </div>

      {adaptation ? (
        <TraitAdaptationCard mapped={adaptation.mapped} updatedAt={adaptation.updatedAt} />
      ) : (
        <TraitOnboardingCtaCard />
      )}

      <section>
        <div className="mb-4 flex items-center gap-2">
          <SparklesIcon className="size-5" />
          <h2 className="text-lg font-semibold">Syllabus templates</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Pick an exam style, upload your syllabus, and take an adaptive test powered by the BloomEd
          engine.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SYLLABUS_TEMPLATES.map((t, i) => (
            <motion.div
              key={t.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className={cn(
                  "h-full border-2 border-foreground shadow-[6px_6px_0_0_rgb(0_0_0)] transition-transform hover:-translate-y-0.5",
                )}
              >
                <CardHeader>
                  <div className="flex size-10 items-center justify-center rounded-lg border-2 border-foreground bg-primary/10">
                    <t.Icon className="size-5" />
                  </div>
                  <CardTitle className="text-lg">{t.title}</CardTitle>
                  <CardDescription>{t.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    asChild
                    className="w-full border-2 border-foreground font-semibold shadow-[4px_4px_0_0_rgb(0_0_0)]"
                  >
                    <Link href={`/tests/new?template=${encodeURIComponent(t.key)}`}>
                      Take a test
                      <ArrowRightIcon className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardListIcon className="size-5" />
            <h2 className="text-lg font-semibold">Recent test reports</h2>
          </div>
          <Button asChild variant="outline" size="sm" className="border-2 border-foreground">
            <Link href="/reports">View all reports</Link>
          </Button>
        </div>
        {sessions.length === 0 ? (
          <Card className="border-2 border-dashed border-border">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No completed tests yet. Start from a template above.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sessions.map((s) => (
              <Card
                key={s.id}
                className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)] transition-transform hover:-translate-y-0.5"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {s.templateKey ?? "Adaptive test"} · {s.examType}
                  </CardTitle>
                  <CardDescription>
                    {s.status === "completed" ? "Completed" : s.status} ·{" "}
                    {s.createdAt?.toString?.().slice(0, 16) ?? ""}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-xs text-muted-foreground">
                  <p>
                    {s.targetQuestionCount} questions planned
                    {s.reportJson ? " · report saved" : ""}
                  </p>
                  <Button
                    asChild
                    size="sm"
                    className="w-fit border-2 border-foreground font-semibold shadow-[3px_3px_0_0_rgb(0_0_0)]"
                  >
                    <Link href={`/tests/${s.id}`}>
                      Open session & report
                      <ArrowRightIcon className="size-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <TestActivityCalendar entries={completionActivity} streak={testStreak} />
    </div>
  );
}
