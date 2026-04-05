"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { GameReportJson } from "@/lib/game-report-types";
import { cn } from "@/lib/utils";
import {
  ArrowLeftIcon,
  Gamepad2Icon,
  TargetIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  TrophyIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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

function medalIcon(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}

type MyAnswerRow = {
  questionIndex: number;
  userAnswer: string;
  isCorrect: boolean;
  timeTakenSeconds: number;
  topic: string;
  questionText: string;
  correctAnswer: string;
  explanation: string;
};

type TopicAcc = { topic: string; correct: number; total: number; accuracyPct: number };

function topicInsightsFromMyAnswers(rows: MyAnswerRow[]): {
  yourStrong: TopicAcc[];
  yourWeak: TopicAcc[];
  yourMixed: TopicAcc[];
} {
  const map = new Map<string, { c: number; n: number }>();
  for (const a of rows) {
    const t = (a.topic || "General").trim() || "General";
    const x = map.get(t) ?? { c: 0, n: 0 };
    x.n += 1;
    if (a.isCorrect) x.c += 1;
    map.set(t, x);
  }
  const all: TopicAcc[] = [...map.entries()].map(([topic, v]) => ({
    topic,
    correct: v.c,
    total: v.n,
    accuracyPct: v.n ? Math.round((v.c / v.n) * 1000) / 10 : 0,
  }));
  const yourStrong = all
    .filter((r) => r.total >= 1 && r.accuracyPct >= 70)
    .sort((a, b) => b.accuracyPct - a.accuracyPct);
  const yourWeak = all
    .filter((r) => r.total >= 1 && r.accuracyPct < 50)
    .sort((a, b) => a.accuracyPct - b.accuracyPct);
  const yourMixed = all.filter((r) => r.accuracyPct >= 50 && r.accuracyPct < 70);
  return { yourStrong, yourWeak, yourMixed };
}

export function GameReportDetail({
  report,
  myAnswers,
  partyCode,
  finishedAt,
}: {
  report: GameReportJson;
  myAnswers: MyAnswerRow[];
  partyCode: string;
  finishedAt: string | null;
}) {
  const correct = myAnswers.filter((a) => a.isCorrect).length;
  const wrong = Math.max(0, myAnswers.length - correct);
  const pieData = [
    { name: "Correct", value: correct },
    { name: "Incorrect", value: wrong },
  ];

  const topicMap = new Map<string, { c: number; n: number }>();
  for (const a of myAnswers) {
    const x = topicMap.get(a.topic) ?? { c: 0, n: 0 };
    x.n += 1;
    if (a.isCorrect) x.c += 1;
    topicMap.set(a.topic, x);
  }
  const topicData = [...topicMap.entries()].map(([full, v]) => ({
    name: full.length > 14 ? `${full.slice(0, 12)}…` : full,
    full,
    accuracy: v.n ? Math.round((v.c / v.n) * 1000) / 10 : 0,
  }));

  const { yourStrong, yourWeak, yourMixed } = topicInsightsFromMyAnswers(myAnswers);

  const partyTopicChart =
    report.partyTopicStats?.map((s) => ({
      name: s.topic.length > 14 ? `${s.topic.slice(0, 12)}…` : s.topic,
      full: s.topic,
      accuracy: s.accuracyPct,
    })) ?? [];

  const barData = report.leaderboard.slice(0, 8).map((r) => ({
    name:
      r.displayName.length > 10 ? `${r.displayName.slice(0, 8)}…` : r.displayName,
    accuracy: r.accuracyPct,
  }));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="outline" size="sm" className="border-2" asChild>
          <Link href="/reports">
            <ArrowLeftIcon className="size-4" />
            Reports
          </Link>
        </Button>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Gamepad2Icon className="size-8" />
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {report.title}
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Code {partyCode} · {report.examType} · {report.totalQuestions} questions ·{" "}
          {finishedAt ? new Date(finishedAt).toLocaleString() : "—"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Party average accuracy: {report.partyAvgAccuracy}%
        </p>
      </div>

      {myAnswers.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)] sm:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUpIcon className="size-5" />
                Your strong areas
              </CardTitle>
              <CardDescription>Topics at ≥70% accuracy (you).</CardDescription>
            </CardHeader>
            <CardContent>
              {yourStrong.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {yourStrong.map((r) => (
                    <li
                      key={r.topic}
                      className="flex justify-between gap-2 border-b border-border pb-2 last:border-0"
                    >
                      <span className="min-w-0 truncate font-medium">{r.topic}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {r.correct}/{r.total} · {r.accuracyPct}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)] sm:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TargetIcon className="size-5" />
                Mixed (you)
              </CardTitle>
              <CardDescription>50–69% — room to improve.</CardDescription>
            </CardHeader>
            <CardContent>
              {yourMixed.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {yourMixed.map((r) => (
                    <li
                      key={r.topic}
                      className="flex justify-between gap-2 border-b border-border pb-2 last:border-0"
                    >
                      <span className="min-w-0 truncate font-medium">{r.topic}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {r.correct}/{r.total} · {r.accuracyPct}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)] sm:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDownIcon className="size-5" />
                Your weak areas
              </CardTitle>
              <CardDescription>Topics below 50% — prioritize review.</CardDescription>
            </CardHeader>
            <CardContent>
              {yourWeak.length === 0 ? (
                <p className="text-sm text-muted-foreground">—</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {yourWeak.map((r) => (
                    <li
                      key={r.topic}
                      className="flex justify-between gap-2 border-b border-border pb-2 last:border-0"
                    >
                      <span className="min-w-0 truncate font-medium">{r.topic}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {r.correct}/{r.total} · {r.accuracyPct}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {(report.partyTopicStats?.length ?? 0) > 0 ? (
        <Card className="border-2 border-foreground shadow-[6px_6px_0_0_rgb(0_0_0)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UsersIcon className="size-6" />
              Whole room — topics
            </CardTitle>
            <CardDescription>
              Combined attempts from all players.{" "}
              {report.partyWeakTopics?.length ? (
                <span className="text-foreground">
                  Hardest: {report.partyWeakTopics.slice(0, 4).join(", ")}
                  {report.partyWeakTopics.length > 4 ? "…" : ""}
                </span>
              ) : null}
              {report.partyStrongTopics?.length ? (
                <>
                  {" "}
                  <span className="text-foreground">
                    Strongest: {report.partyStrongTopics.slice(0, 4).join(", ")}
                    {report.partyStrongTopics.length > 4 ? "…" : ""}
                  </span>
                </>
              ) : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[min(360px,50vh)] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={partyTopicChart}
                layout="vertical"
                margin={{ left: 4, right: 12, top: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={MONO.light} horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={axisTick} />
                <YAxis type="category" dataKey="name" width={100} tick={axisTick} />
                <Tooltip
                  contentStyle={chartTooltip.contentStyle}
                  formatter={(value) => [`${Number(value ?? 0)}%`, "Room accuracy"]}
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as { full?: string } | undefined;
                    return p?.full ?? "";
                  }}
                />
                <Bar dataKey="accuracy" fill={MONO.ink} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-2 border-foreground shadow-[6px_6px_0_0_rgb(0_0_0)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrophyIcon className="size-6" />
            Final standings
          </CardTitle>
          <CardDescription>Ranked by correct answers, then total time.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-4">
            {report.leaderboard.map((r, i) => {
              const rank = i + 1;
              const showMedal = rank <= 3;
              return (
                <li
                  key={r.userId}
                  className={cn(
                    "flex flex-wrap items-center gap-3 rounded-lg border-2 px-3 py-3",
                    rank === 1 ? "border-foreground bg-muted/40" : "border-border",
                  )}
                >
                  <div className="flex flex-col items-center gap-1">
                    {showMedal ? (
                      <span className="text-lg leading-none" aria-hidden>
                        {medalIcon(rank)}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-muted-foreground">
                        #{rank}
                      </span>
                    )}
                    <Avatar className="size-11" size="lg">
                      {r.imageUrl ? (
                        <AvatarImage src={r.imageUrl} alt="" />
                      ) : null}
                      <AvatarFallback>
                        {r.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{r.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.correct}/{r.correct + r.wrong} · {r.accuracyPct}% ·{" "}
                      {r.totalTimeSeconds}s total
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
          <CardHeader>
            <CardTitle className="text-lg">Your correct vs incorrect</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={72}
                  stroke={MONO.ink}
                  strokeWidth={2}
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={String(index)}
                      fill={index === 0 ? MONO.ink : MONO.light}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltip.contentStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
          <CardHeader>
            <CardTitle className="text-lg">Accuracy by topic (you)</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={MONO.light} vertical={false} />
                <XAxis dataKey="name" tick={axisTick} interval={0} angle={-20} height={56} />
                <YAxis domain={[0, 100]} tick={axisTick} width={32} />
                <Tooltip
                  contentStyle={chartTooltip.contentStyle}
                  formatter={(value) => [`${Number(value ?? 0)}%`, "Accuracy"]}
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as { full?: string } | undefined;
                    return p?.full ?? "";
                  }}
                />
                <Bar dataKey="accuracy" fill={MONO.ink} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
        <CardHeader>
          <CardTitle className="text-lg">Room accuracy (top players)</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={MONO.light} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={axisTick} />
              <YAxis type="category" dataKey="name" width={88} tick={axisTick} />
              <Tooltip contentStyle={chartTooltip.contentStyle} />
              <Bar dataKey="accuracy" fill={MONO.ink} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
        <CardHeader>
          <CardTitle className="text-lg">Your questions</CardTitle>
          <CardDescription>Each answer you submitted in this game.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {myAnswers.map((a) => (
            <div
              key={a.questionIndex}
              className="rounded-lg border-2 border-border p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-muted-foreground">
                  Q{a.questionIndex + 1} · {a.topic}
                </span>
                <span
                  className={cn(
                    "rounded border px-2 py-0.5 text-xs font-semibold",
                    a.isCorrect
                      ? "border-foreground bg-muted"
                      : "border-border bg-background",
                  )}
                >
                  {a.isCorrect ? "Correct" : "Incorrect"}
                </span>
              </div>
              <p className="mt-2 leading-snug">{a.questionText}</p>
              <p className="mt-2 text-muted-foreground">
                Your answer: <span className="text-foreground">{a.userAnswer}</span>
              </p>
              {!a.isCorrect ? (
                <p className="mt-1 text-muted-foreground">
                  Correct: <span className="text-foreground">{a.correctAnswer}</span>
                </p>
              ) : null}
              {a.explanation ? (
                <p className="mt-2 border-t border-border pt-2 text-muted-foreground">
                  {a.explanation}
                </p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
