"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { BloomSessionReport } from "@/lib/bloom-report-types";
import { parseBloomSessionReport } from "@/lib/bloom-report-types";
import type { MappedTraits } from "@/lib/map-traits";
import { traitSummaryLine } from "@/lib/trait-copy";
import { cn } from "@/lib/utils";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import {
  ArrowLeftIcon,
  BarChart3Icon,
  ClockIcon,
  DownloadIcon,
  MapIcon,
  SparklesIcon,
  TargetIcon,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Monochrome: foreground / muted only (light & dark theme) */
const MONO = {
  ink: "hsl(var(--foreground))",
  mid: "hsl(var(--muted-foreground))",
  light: "hsl(var(--border))",
};

const chartTooltip = {
  contentStyle: {
    backgroundColor: "hsl(var(--background))",
    border: "2px solid hsl(var(--foreground))",
    borderRadius: 6,
    fontSize: 12,
  },
  labelStyle: { color: "hsl(var(--foreground))" },
};

const axisTick = { fill: "hsl(var(--muted-foreground))", fontSize: 11 };

type AttemptRow = {
  id: string;
  topic: string | null;
  userAnswer: string;
  correctAnswer: string | null;
  isCorrect: boolean;
  timeTakenSeconds: number;
  orderIndex: number;
};

type SessionProps = {
  id: string;
  templateKey: string | null;
  examType: string;
  targetQuestionCount: number;
  status: string;
  createdAt: Date | string | null;
  reportJson: string | null;
  markingSchemeJson: string;
};

function formatWhen(d: Date | string | null) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function weakTopicsFromReport(r: BloomSessionReport | null): string[] {
  if (!r) return [];
  const fromList = [...(r.weak_concepts ?? [])];
  const buckets = r.by_topic ?? [];
  for (const b of buckets) {
    if (b.accuracy_pct < 50 && b.key && b.key !== "unknown") {
      if (!fromList.includes(b.key)) fromList.push(b.key);
    }
  }
  const mastery = r.concept_mastery_estimates ?? {};
  for (const [k, v] of Object.entries(mastery)) {
    if (v < 0.5 && k) fromList.push(k);
  }
  return [...new Set(fromList)].slice(0, 24);
}

function weakFromAttemptsOnly(attempts: AttemptRow[]): string[] {
  const byTopic = new Map<string, { n: number; c: number }>();
  for (const a of attempts) {
    const k = (a.topic ?? "unknown").trim() || "unknown";
    const cur = byTopic.get(k) ?? { n: 0, c: 0 };
    cur.n += 1;
    if (a.isCorrect) cur.c += 1;
    byTopic.set(k, cur);
  }
  const out: string[] = [];
  for (const [k, { n, c }] of byTopic) {
    if (k === "unknown") continue;
    const acc = n ? (c / n) * 100 : 0;
    if (acc < 50) out.push(k);
  }
  return out;
}

export function BloomReportDetail({
  session,
  attempts,
  mappedAtSession,
  backHref = "/reports",
}: {
  session: SessionProps;
  attempts: AttemptRow[];
  /** Traits snapshot stored when the test session was created (psych profile at test time). */
  mappedAtSession?: MappedTraits | null;
  backHref?: string;
}) {
  const report = React.useMemo(
    () => parseBloomSessionReport(session.reportJson),
    [session.reportJson],
  );

  const weakTopics = React.useMemo(() => {
    const w = weakTopicsFromReport(report);
    if (w.length) return w;
    return weakFromAttemptsOnly(attempts);
  }, [report, attempts]);

  const totals = report?.session_totals;
  const correct = totals?.total_correct ?? attempts.filter((a) => a.isCorrect).length;
  const attempted =
    totals?.total_questions_attempted ?? Math.max(attempts.length, session.targetQuestionCount);
  const wrong = Math.max(0, attempted - correct);
  const pieData = [
    { name: "Correct", value: correct },
    { name: "Incorrect", value: wrong },
  ];

  const topicData = (report?.by_topic ?? []).map((b) => ({
    name: b.key.length > 18 ? `${b.key.slice(0, 16)}…` : b.key,
    full: b.key,
    accuracy: b.accuracy_pct,
    attempts: b.attempts,
  }));

  const bloomData = (report?.by_bloom_level ?? []).map((b) => ({
    name: b.key,
    accuracy: b.accuracy_pct,
  }));

  const behaviorData = Object.entries(report?.behavior_frequency ?? {}).map(([k, v]) => ({
    name: k,
    count: v,
  }));

  const printRef = React.useRef<HTMLDivElement>(null);

  async function downloadPdf() {
    const el = printRef.current;
    if (!el) return;
    const dataUrl = await toPng(el, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });
    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(dataUrl);
    const imgH = (imgProps.height * pageW) / imgProps.width;
    let offset = 0;
    pdf.addImage(dataUrl, "PNG", 0, offset, pageW, imgH);
    let remaining = imgH - pageH;
    while (remaining > 0) {
      offset -= pageH;
      pdf.addPage();
      pdf.addImage(dataUrl, "PNG", 0, offset, pageW, imgH);
      remaining -= pageH;
    }
    pdf.save(`bloom-report-${session.id.slice(0, 8)}.pdf`);
  }

  const combinedRoadmapTopic = weakTopics.join("; ");

  const roadmapLearnQs = React.useMemo(() => {
    if (!mappedAtSession?.learning_style) return "";
    return `&learn=${encodeURIComponent(mappedAtSession.learning_style)}`;
  }, [mappedAtSession]);

  const profileVsEngineLines = React.useMemo(() => {
    const align = report?.trait_alignment;
    const lines: string[] = [];
    if (mappedAtSession) {
      lines.push(
        `At test start, your BloomEd profile mapped to: ${traitSummaryLine(mappedAtSession)}.`,
      );
    }
    if (align && typeof align === "object") {
      const ls = (align as Record<string, string>).learning_style;
      const inter = (align as Record<string, string>).interaction;
      if (ls || inter) {
        lines.push(
          `This session’s engine summary: learning style “${ls ?? "—"}”, interaction “${inter ?? "—"}”.`,
        );
      }
    }
    if (mappedAtSession && align && typeof align === "object") {
      const ls = String((align as Record<string, string>).learning_style ?? "").toLowerCase();
      const st = mappedAtSession.learning_style.toLowerCase();
      if (ls && st && (ls.includes(st) || st.includes(ls) || ls === st)) {
        lines.push(
          "Your questionnaire-derived modality lines up with how this session summarized your learning style.",
        );
      } else if (ls && st) {
        lines.push(
          "Live behavior during the test also shapes the session summary — it may differ slightly from the questionnaire alone.",
        );
      }
    }
    return lines;
  }, [report?.trait_alignment, mappedAtSession]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button
          asChild
          variant="outline"
          className="w-fit border-2 border-foreground shadow-[3px_3px_0_0_rgb(0_0_0)]"
        >
          <Link href={backHref}>
            <ArrowLeftIcon className="size-4" />
            Back
          </Link>
        </Button>
        <Button
          type="button"
          onClick={() => void downloadPdf()}
          className="border-2 border-foreground font-semibold shadow-[4px_4px_0_0_rgb(0_0_0)]"
        >
          <DownloadIcon className="size-4" />
          Download PDF
        </Button>
      </div>

      <div ref={printRef} className="space-y-8 rounded-lg bg-background p-4 md:p-6">
        <header className="space-y-1 border-b-2 border-foreground pb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Test session
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {session.templateKey ?? "Adaptive test"} · {session.examType}
          </h1>
          <p className="text-sm text-muted-foreground">
            {session.status} · {session.targetQuestionCount} questions planned ·{" "}
            {formatWhen(session.createdAt)}
          </p>
        </header>

        {(mappedAtSession || (report?.trait_alignment && Object.keys(report.trait_alignment).length > 0)) &&
        profileVsEngineLines.length > 0 ? (
          <Card className="border-2 border-primary/40 bg-primary/5 shadow-[4px_4px_0_0_rgb(0_0_0)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <SparklesIcon className="size-5" />
                Profile & session alignment
              </CardTitle>
              <CardDescription>
                How your stored traits relate to this session&apos;s adaptive summary.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                {profileVsEngineLines.map((line) => (
                  <li key={line.slice(0, 60)} className="border-l-4 border-primary pl-3">
                    {line}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
            <CardHeader className="pb-2">
              <CardDescription>Accuracy (session)</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {totals?.overall_accuracy_pct != null
                  ? `${totals.overall_accuracy_pct.toFixed(1)}%`
                  : attempted
                    ? `${((correct / attempted) * 100).toFixed(1)}%`
                    : "—"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
            <CardHeader className="pb-2">
              <CardDescription>Correct / attempted</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {correct} / {attempted}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
            <CardHeader className="pb-2">
              <CardDescription>Learning profile</CardDescription>
              <CardTitle className="text-base font-semibold leading-snug">
                {report?.learning_dna?.behavior ?? report?.behavior_profile ?? "—"}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
            <CardHeader className="pb-2">
              <CardDescription>Confidence</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {report?.confidence_score != null
                  ? `${(report.confidence_score * 100).toFixed(0)}%`
                  : "—"}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TargetIcon className="size-5" />
                Outcome split
              </CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={88}
                    stroke={MONO.ink}
                    strokeWidth={2}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.name === "Correct" ? MONO.ink : MONO.light}
                      />
                    ))}
                  </Pie>
                  <Tooltip {...chartTooltip} />
                  <Legend
                    wrapperStyle={{ color: "hsl(var(--foreground))", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {topicData.length > 0 ? (
            <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3Icon className="size-5" />
                  Accuracy by topic
                </CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topicData} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={MONO.light} />
                    <XAxis
                      dataKey="name"
                      tick={axisTick}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis domain={[0, 100]} tick={axisTick} />
                    <Tooltip {...chartTooltip} />
                    <Bar dataKey="accuracy" fill={MONO.ink} radius={[2, 2, 0, 0]} stroke={MONO.ink} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : null}

          {bloomData.length > 0 ? (
            <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
              <CardHeader>
                <CardTitle className="text-lg">By Bloom level</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bloomData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={MONO.light} />
                    <XAxis dataKey="name" tick={axisTick} />
                    <YAxis domain={[0, 100]} tick={axisTick} />
                    <Tooltip {...chartTooltip} />
                    <Bar dataKey="accuracy" fill={MONO.ink} radius={[2, 2, 0, 0]} stroke={MONO.ink} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : null}

          {behaviorData.length > 0 ? (
            <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
              <CardHeader>
                <CardTitle className="text-lg">Behavior tags</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={behaviorData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={MONO.light} />
                    <XAxis type="number" tick={axisTick} />
                    <YAxis dataKey="name" type="category" width={88} tick={axisTick} />
                    <Tooltip {...chartTooltip} />
                    <Bar dataKey="count" fill={MONO.mid} radius={[0, 2, 2, 0]} stroke={MONO.ink} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {report?.time_analytics ? (
          <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClockIcon className="size-5" />
                Time analytics
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["Total attempt time (s)", report.time_analytics.total_attempt_time_seconds],
                ["Avg / question (s)", report.time_analytics.avg_time_per_question_seconds],
                ["Median (s)", report.time_analytics.median_time_seconds],
                ["Avg when correct (s)", report.time_analytics.avg_time_when_correct_seconds],
                ["Avg when wrong (s)", report.time_analytics.avg_time_when_incorrect_seconds],
                ["Min / max (s)", `${report.time_analytics.min_time_seconds ?? "—"} / ${report.time_analytics.max_time_seconds ?? "—"}`],
              ].map(([k, v]) => (
                <div key={String(k)} className="rounded-md border border-border bg-muted/40 px-3 py-2">
                  <p className="text-xs text-muted-foreground">{k}</p>
                  <p className="font-semibold tabular-nums">{v != null ? String(v) : "—"}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-2 border-foreground shadow-[6px_6px_0_0_rgb(0_0_0)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapIcon className="size-5" />
              Weak areas & roadmap
            </CardTitle>
            <CardDescription>
              Topic and sub-topic names below are suitable for roadmap generation—use one combined
              roadmap or drill into a single weak area.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {weakTopics.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No weak areas flagged yet—keep practicing to unlock targeted paths.
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {weakTopics.map((t) => (
                  <li key={t}>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-auto w-full justify-start whitespace-normal border-2 py-2 text-left font-normal"
                    >
                      <Link
                        href={`/roadmap?topic=${encodeURIComponent(t)}${roadmapLearnQs}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t}
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {weakTopics.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  asChild
                  className="border-2 border-foreground font-semibold shadow-[4px_4px_0_0_rgb(0_0_0)]"
                >
                  <Link
                    href={`/roadmap?topic=${encodeURIComponent(combinedRoadmapTopic)}${roadmapLearnQs}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Roadmap for all weak areas
                  </Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {report?.actionable_insights && report.actionable_insights.length > 0 ? (
          <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
            <CardHeader>
              <CardTitle className="text-lg">Insights & next steps</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed">
                {report.actionable_insights.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {report?.question_wise_performance && report.question_wise_performance.length > 0 ? (
          <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
            <CardHeader>
              <CardTitle className="text-lg">Question-level performance</CardTitle>
              <CardDescription>From the adaptive engine attempt log.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-foreground">
                    <th className="py-2 pr-2">Topic</th>
                    <th className="py-2 pr-2">Concept</th>
                    <th className="py-2 pr-2">Bloom</th>
                    <th className="py-2 pr-2">Result</th>
                    <th className="py-2">Time (s)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.question_wise_performance.map((q, i) => (
                    <tr key={`${q.question_id}-${i}`} className="border-b border-border">
                      <td className="py-2 pr-2 align-top">{q.topic}</td>
                      <td className="py-2 pr-2 align-top">{q.concept}</td>
                      <td className="py-2 pr-2 align-top">{q.bloom_level}</td>
                      <td className={cn("py-2 pr-2 font-semibold", q.is_correct ? "text-green-600 dark:text-green-400" : "text-destructive")}>
                        {q.is_correct ? "Correct" : "Incorrect"}
                      </td>
                      <td className="py-2 tabular-nums">{q.time_taken_seconds.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : null}

        <Separator className="bg-foreground" />

        <section>
          <h2 className="mb-4 text-lg font-bold">Stored attempts</h2>
          {attempts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rows in the database for this session.</p>
          ) : (
            <div className="space-y-3">
              {attempts.map((a) => (
                <Card
                  key={a.id}
                  className="border-2 border-border shadow-[2px_2px_0_0_rgb(0_0_0)]"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Q{a.orderIndex + 1}
                      {a.topic ? (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          · {a.topic}
                        </span>
                      ) : null}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Your answer: </span>
                      <span className="font-medium">{a.userAnswer}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Correct: </span>
                      <span className="font-medium">{a.correctAnswer ?? "—"}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.isCorrect ? "Marked correct" : "Marked incorrect"} ·{" "}
                      {a.timeTakenSeconds.toFixed(1)}s
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
