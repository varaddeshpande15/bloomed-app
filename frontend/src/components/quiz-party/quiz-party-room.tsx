"use client";

import {
  getQuizPartySnapshot,
  hostStartCountdown,
  setQuizPartyReady,
  submitQuizPartyAnswer,
  updateQuizPartyConfig,
} from "@/actions/quiz-party";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useQuizPartyWs } from "@/hooks/use-quiz-party-ws";
import {
  bloomGenerateTestPlan,
  bloomSyllabusUpload,
  totalQuestionsFromPlan,
} from "@/lib/bloom-api";
import {
  DEFAULT_MARKING_SCHEME,
  EXAM_TYPE_OPTIONS,
} from "@/lib/bloom-templates";
import type { QuizPartyPublicSnapshot } from "@/lib/quiz-party-types";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/nextjs";
import {
  CheckCircle2Icon,
  ClockIcon,
  CopyIcon,
  CrownIcon,
  Loader2Icon,
  LockIcon,
  SwordsIcon,
  TrophyIcon,
  XCircleIcon,
} from "lucide-react";
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
import { toast } from "sonner";

function formatOpts(opts: string[] | null | undefined): string[] {
  if (!opts?.length) return [];
  return opts;
}

const TAUNTS = [
  (name: string) => `${name} is on top — buckle up!`,
  (name: string) => `${name} is running away with it — time to focus!`,
  (name: string) => `Heads up: ${name} just grabbed the lead.`,
  (name: string) => `${name} is schooling the room. No mercy.`,
];

const CHART_MONO = {
  ink: "hsl(var(--foreground))",
  light: "hsl(var(--border))",
};

const chartTooltip = {
  contentStyle: {
    backgroundColor: "hsl(var(--background))",
    border: "2px solid hsl(var(--foreground))",
    borderRadius: 6,
    fontSize: 12,
  },
};

function medalEmoji(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "";
}

function PlayerStack({
  name,
  imageUrl,
  rank,
  subtitle,
  large,
}: {
  name: string;
  imageUrl: string | null;
  rank: number;
  subtitle: string;
  large?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        large && "sm:scale-105",
      )}
    >
      <span className="text-2xl leading-none sm:text-3xl" aria-hidden>
        {medalEmoji(rank)}
      </span>
      <Avatar className={cn("mt-1", large ? "size-16 sm:size-20" : "size-12 sm:size-14")}>
        {imageUrl ? <AvatarImage src={imageUrl} alt="" /> : null}
        <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <p className="mt-2 max-w-[10rem] truncate text-sm font-semibold">{name}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export function QuizPartyRoom({
  partyId,
  initial,
}: {
  partyId: string;
  initial: QuizPartyPublicSnapshot;
}) {
  const { userId } = useAuth();
  const [snap, setSnap] = React.useState<QuizPartyPublicSnapshot>(initial);
  const [busy, setBusy] = React.useState(false);
  const prevLeader = React.useRef<string | null>(null);

  const [paste, setPaste] = React.useState("");
  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const [examType, setExamType] = React.useState("STANDARD");
  const [markingScheme, setMarkingScheme] = React.useState<Record<string, unknown>>(() => ({
    ...DEFAULT_MARKING_SCHEME,
  }));
  const [topics, setTopics] = React.useState<{ topic: string; subtopics: string[] }[]>([]);
  const [secondsPerQ, setSecondsPerQ] = React.useState(45);
  const [engineMode, setEngineMode] = React.useState<"standard" | "fixed">("standard");

  const [selected, setSelected] = React.useState<string | null>(null);
  const [qStarted, setQStarted] = React.useState<number | null>(null);

  const refresh = React.useCallback(() => {
    void getQuizPartySnapshot(partyId).then((s) => {
      if (s) setSnap(s);
    });
  }, [partyId]);

  useQuizPartyWs(partyId, refresh, true);

  React.useEffect(() => {
    const id = window.setInterval(() => {
      refresh();
    }, 4000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const isHost = snap.members.find((m) => m.userId === userId)?.isHost ?? false;

  const inBetween =
    snap.party.status === "active" &&
    snap.party.betweenQuestionEndsAt != null &&
    new Date(snap.party.betweenQuestionEndsAt).getTime() > Date.now();

  React.useEffect(() => {
    if (snap.party.status !== "active") return;
    const lid = snap.leaderUserId;
    if (!lid || lid === userId) {
      prevLeader.current = lid;
      return;
    }
    if (prevLeader.current !== lid) {
      const name =
        snap.members.find((m) => m.userId === lid)?.displayName ?? "Someone";
      const msg = TAUNTS[Math.floor(Math.random() * TAUNTS.length)](name);
      toast.message(msg, { icon: <SwordsIcon className="size-4" /> });
      prevLeader.current = lid;
    }
  }, [snap.leaderUserId, snap.party.status, snap.members, userId]);

  React.useEffect(() => {
    if (!snap.currentQuestion || inBetween) return;
    setSelected(null);
    setQStarted(Date.now());
  }, [snap.party.currentQuestionIndex, snap.currentQuestion?.id, snap.party.status, inBetween]);

  async function handleParseSyllabus() {
    setBusy(true);
    try {
      const fd = new FormData();
      if (pdfFile && pdfFile.size > 0) {
        fd.append("file", pdfFile, pdfFile.name || "syllabus.pdf");
      } else if (paste.trim().length >= 50) {
        fd.append("text", paste.trim());
      } else {
        toast.error("Upload a PDF or paste at least ~50 characters of syllabus.");
        return;
      }
      const res = await bloomSyllabusUpload(fd);
      setTopics(res.topics ?? []);
      setPdfFile(null);
      toast.success("Topics extracted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveConfigAndPlan() {
    if (!topics.length) {
      toast.error("Parse syllabus first.");
      return;
    }
    setBusy(true);
    try {
      const totalQ = Number(
        markingScheme.total_questions ?? markingScheme.default_questions ?? 10,
      );
      const markingPayload = {
        ...markingScheme,
        total_questions: totalQ,
        default_questions: totalQ,
      };
      const planRes = await bloomGenerateTestPlan({
        topics,
        marking_scheme: markingPayload,
        exam_type: examType,
        trait_profile: null,
      });
      const plan = planRes.test_plan ?? [];
      await updateQuizPartyConfig({
        partyId,
        examType,
        engineMode,
        markingScheme: markingPayload as Record<string, unknown>,
        syllabusTopics: topics,
        testPlan: plan,
        totalQuestions: totalQuestionsFromPlan(plan),
        secondsPerQuestion: secondsPerQ,
        title: "Multiplayer game",
      });
      toast.success("Test plan saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Plan failed");
    } finally {
      setBusy(false);
    }
  }

  async function handlePregenerate() {
    setBusy(true);
    try {
      const res = await fetch("/api/quiz-party/pregenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partyId }),
      });
      const data = (await res.json()) as { detail?: string; totalQuestions?: number };
      if (!res.ok) throw new Error(data.detail ?? "Failed");
      toast.success(`Generated ${data.totalQuestions ?? "?"} questions`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generate failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggleReady(ready: boolean) {
    await setQuizPartyReady(partyId, ready);
    refresh();
  }

  async function startGame() {
    setBusy(true);
    try {
      const r = await hostStartCountdown(partyId);
      if (!r.ok) throw new Error(r.error ?? "Start failed");
      toast.success("Starting in 5…");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Start failed");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!snap.currentQuestion || !selected || qStarted == null) return;
    const t = (Date.now() - qStarted) / 1000;
    setBusy(true);
    try {
      const r = await submitQuizPartyAnswer({
        partyId,
        userAnswer: selected,
        timeTakenSeconds: t,
      });
      if (!r.ok) throw new Error(r.error ?? "Submit failed");
      if (r.feedbackMessage) {
        if (r.isCorrect) {
          toast.success(r.feedbackMessage, {
            icon: <CheckCircle2Icon className="size-4 text-emerald-600" />,
          });
        } else {
          toast.error(r.feedbackMessage, {
            icon: <XCircleIcon className="size-4 text-red-600" />,
          });
        }
      }
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  function copyCode() {
    void navigator.clipboard.writeText(snap.party.code);
    toast.message("Code copied");
  }

  const countdownLeft =
    snap.party.status === "countdown" && snap.party.countdownEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (new Date(snap.party.countdownEndsAt).getTime() - Date.now()) / 1000,
          ),
        )
      : null;

  const questionLeft =
    snap.party.status === "active" &&
    snap.party.questionEndsAt &&
    !inBetween
      ? Math.max(
          0,
          Math.ceil(
            (new Date(snap.party.questionEndsAt).getTime() - Date.now()) / 1000,
          ),
        )
      : null;

  const partyAvg =
    snap.leaderboard.length > 0
      ? snap.leaderboard.reduce((s, r) => s + r.accuracyPct, 0) /
        snap.leaderboard.length
      : 0;
  const me = snap.leaderboard.find((r) => r.userId === userId);

  const barData = snap.leaderboard.slice(0, 8).map((r) => ({
    name:
      r.displayName.length > 10 ? `${r.displayName.slice(0, 8)}…` : r.displayName,
    accuracy: r.accuracyPct,
  }));

  const pieMe =
    me && me.correct + me.wrong > 0
      ? [
          { name: "Correct", value: me.correct },
          { name: "Incorrect", value: me.wrong },
        ]
      : [];

  const top3 = snap.leaderboard.slice(0, 3);
  const orderPodium = [top3[1], top3[0], top3[2]].filter(Boolean) as typeof snap.leaderboard;

  const myAns = snap.myCurrentQuestionAnswer;

  return (
    <div className="relative mx-auto max-w-3xl px-3 py-6 sm:px-4">
      {snap.party.status === "countdown" && countdownLeft !== null ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Starting in
            </p>
            <p className="mt-2 text-8xl font-black tabular-nums text-foreground">
              {countdownLeft > 0 ? countdownLeft : "GO!"}
            </p>
          </div>
        </div>
      ) : null}

      {inBetween && snap.questionTopThree && snap.questionTopThree.length > 0 ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/95 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border-2 border-foreground bg-card p-6 text-center shadow-[8px_8px_0_0_rgb(0_0_0)]">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              This question — top 3
            </p>
            <p className="mt-2 text-lg font-bold">
              Fastest correct answers (or best tie-break)
            </p>
            <div className="mt-8 flex flex-wrap items-end justify-center gap-6 sm:gap-10">
              {snap.questionTopThree.map((row) => (
                <PlayerStack
                  key={row.userId}
                  name={row.displayName}
                  imageUrl={row.imageUrl}
                  rank={row.rank}
                  subtitle={
                    row.isCorrect
                      ? `${row.timeTakenSeconds.toFixed(1)}s`
                      : "Incorrect"
                  }
                  large={row.rank === 1}
                />
              ))}
            </div>
            <p className="mt-8 text-sm text-muted-foreground">
              Next question in about 5 seconds…
            </p>
          </div>
        </div>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">Game room</h1>
          <button
            type="button"
            onClick={() => void copyCode()}
            className="mt-1 inline-flex items-center gap-2 font-mono text-lg font-bold tracking-widest"
          >
            {snap.party.code}
            <CopyIcon className="size-4" />
          </button>
        </div>
        <div className="text-xs text-muted-foreground">
          {snap.party.status === "lobby" && "Lobby"}
          {snap.party.status === "configuring" && "Configuring"}
          {snap.party.status === "countdown" && "Starting…"}
          {snap.party.status === "active" && "Live"}
          {snap.party.status === "finished" && "Finished"}
        </div>
      </div>

      {(snap.party.status === "lobby" || snap.party.status === "configuring") && (
        <div className="space-y-6">
          <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
            <CardHeader>
              <CardTitle className="text-lg">Players</CardTitle>
              <CardDescription>Everyone taps Ready when set.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {snap.members.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center justify-between gap-3 rounded-lg border-2 border-border px-3 py-2"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3 font-medium">
                    <Avatar className="size-9 shrink-0">
                      {m.imageUrl ? <AvatarImage src={m.imageUrl} alt="" /> : null}
                      <AvatarFallback>{m.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="flex min-w-0 items-center gap-2">
                      {m.isHost ? <CrownIcon className="size-4 shrink-0 text-amber-600" /> : null}
                      <span className="truncate">
                        {m.displayName}
                        {m.userId === userId ? " (you)" : ""}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {m.isReady ? "Ready" : "Not ready"}
                  </span>
                </div>
              ))}
              <Button
                type="button"
                variant={snap.members.find((m) => m.userId === userId)?.isReady ? "secondary" : "default"}
                className="w-full border-2 border-foreground"
                onClick={() =>
                  void toggleReady(!snap.members.find((m) => m.userId === userId)?.isReady)
                }
              >
                {snap.members.find((m) => m.userId === userId)?.isReady
                  ? "Unready"
                  : "Ready"}
              </Button>
            </CardContent>
          </Card>

          {isHost ? (
            <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
              <CardHeader>
                <CardTitle className="text-lg">Host: syllabus & test</CardTitle>
                <CardDescription>
                  Upload a PDF or paste text, parse topics, build plan, then generate questions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Paste syllabus (or use PDF below)</Label>
                  <Textarea
                    value={paste}
                    onChange={(e) => setPaste(e.target.value)}
                    rows={4}
                    className="border-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="syllabus-pdf">Upload PDF (optional)</Label>
                  <Input
                    id="syllabus-pdf"
                    type="file"
                    accept="application/pdf,.pdf"
                    className="cursor-pointer border-2"
                    onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
                  />
                  {pdfFile ? (
                    <p className="text-xs text-muted-foreground">Selected: {pdfFile.name}</p>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-2"
                    disabled={busy}
                    onClick={() => void handleParseSyllabus()}
                  >
                    Parse topics
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Exam style</Label>
                  <RadioGroup value={examType} onValueChange={setExamType}>
                    {EXAM_TYPE_OPTIONS.map((o) => (
                      <div key={o.value} className="flex items-center gap-2 border-2 border-border p-2">
                        <RadioGroupItem value={o.value} id={`ex-${o.value}`} />
                        <Label htmlFor={`ex-${o.value}`} className="font-normal">
                          {o.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Total questions</Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={Number(markingScheme.total_questions ?? 10)}
                      onChange={(e) => {
                        const v = Number(e.target.value) || 1;
                        setMarkingScheme((m) => ({
                          ...m,
                          total_questions: v,
                          default_questions: v,
                        }));
                      }}
                      className="border-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Seconds per question</Label>
                    <Input
                      type="number"
                      min={15}
                      max={120}
                      value={secondsPerQ}
                      onChange={(e) => setSecondsPerQ(Number(e.target.value) || 45)}
                      className="border-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Engine</Label>
                  <RadioGroup
                    value={engineMode}
                    onValueChange={(v) => setEngineMode(v as "standard" | "fixed")}
                  >
                    <div className="flex items-center gap-2 border-2 border-border p-2">
                      <RadioGroupItem value="standard" id="eng-s" />
                      <Label htmlFor="eng-s">Adaptive-style mix (shared chain)</Label>
                    </div>
                    <div className="flex items-center gap-2 border-2 border-border p-2">
                      <RadioGroupItem value="fixed" id="eng-f" />
                      <Label htmlFor="eng-f">Fixed exam profile (same exam config)</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={busy || !topics.length}
                    onClick={() => void saveConfigAndPlan()}
                    className="border-2 border-foreground"
                  >
                    Save plan
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void handlePregenerate()}
                    className="border-2 border-foreground"
                  >
                    {busy ? <Loader2Icon className="size-4 animate-spin" /> : null}
                    Generate questions
                  </Button>
                </div>
                {snap.party.hasQuestions ? (
                  <p className="text-sm font-medium text-foreground">
                    Questions ready — everyone Ready, then Start game.
                  </p>
                ) : null}
                <Button
                  type="button"
                  disabled={busy || !snap.party.hasQuestions}
                  onClick={() => void startGame()}
                  className="w-full border-2 border-foreground font-semibold shadow-[4px_4px_0_0_rgb(0_0_0)]"
                >
                  Start game (5s countdown)
                </Button>
              </CardContent>
            </Card>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Waiting for host to configure the test…
            </p>
          )}
        </div>
      )}

      {snap.party.status === "active" && snap.currentQuestion && !inBetween && (
        <Card className="border-2 border-foreground shadow-[6px_6px_0_0_rgb(0_0_0)]">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base">
              Q {snap.party.currentQuestionIndex + 1}/{snap.party.totalQuestions}
            </CardTitle>
            <div className="flex items-center gap-2 rounded-md border-2 border-foreground bg-muted px-2 py-1 font-mono text-sm font-semibold">
              <ClockIcon className="size-4" />
              {questionLeft ?? 0}s
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-medium leading-snug sm:text-base">
              {snap.currentQuestion.question_text}
            </p>

            {myAns ? (
              <div className="space-y-4 rounded-lg border-2 border-dashed border-border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <LockIcon className="size-4" />
                  Answer locked
                </div>
                {myAns.isCorrect ? (
                  <div className="flex gap-3 rounded-md border-2 border-foreground bg-background p-3">
                    <CheckCircle2Icon className="mt-0.5 size-6 shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                        Correct
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {myAns.explanation || "Nice work — that’s the right answer."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3 rounded-md border-2 border-foreground bg-background p-3">
                    <XCircleIcon className="mt-0.5 size-6 shrink-0 text-red-600" />
                    <div>
                      <p className="font-semibold text-red-700 dark:text-red-400">Incorrect</p>
                      <p className="mt-1 text-sm">
                        <span className="text-muted-foreground">Correct answer: </span>
                        <span className="font-medium">{myAns.correctAnswer}</span>
                      </p>
                      {myAns.explanation ? (
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {myAns.explanation}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Waiting for other players or time limit…
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {formatOpts(snap.currentQuestion.options).map((opt, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const active = selected === opt;
                    return (
                      <Button
                        key={`${letter}-${opt.slice(0, 20)}`}
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setSelected(opt)}
                        className={cn(
                          "h-auto min-h-0 justify-start whitespace-normal border-2 py-2 text-left text-xs sm:text-sm",
                          active && "border-foreground bg-muted",
                        )}
                      >
                        <span className="mr-2 font-bold">{letter}.</span>
                        {opt}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  disabled={!selected || busy}
                  onClick={() => void submit()}
                  className="w-full border-2 border-foreground font-semibold"
                >
                  <LockIcon className="mr-2 size-4" />
                  Lock in answer
                </Button>
              </>
            )}
          </CardContent>
          <CardContent className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold text-muted-foreground">Live standings</p>
            <ul className="space-y-2 text-sm">
              {snap.leaderboard.slice(0, 6).map((r, i) => (
                <li key={r.userId} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-5 shrink-0 tabular-nums text-muted-foreground">
                      {i + 1}.
                    </span>
                    <Avatar className="size-7 shrink-0">
                      {r.imageUrl ? <AvatarImage src={r.imageUrl} alt="" /> : null}
                      <AvatarFallback className="text-[10px]">
                        {r.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">
                      {r.displayName}
                      {r.userId === userId ? " (you)" : ""}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {r.correct}/{r.correct + r.wrong} · {r.accuracyPct}%
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {snap.party.status === "finished" && (
        <div className="space-y-6">
          <Card className="border-2 border-foreground shadow-[8px_8px_0_0_rgb(0_0_0)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <TrophyIcon className="size-7" />
                Podium
              </CardTitle>
              <CardDescription>Top three — medals above each player.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end justify-center gap-4 sm:gap-8">
                {orderPodium.map((r) => {
                  const trueRank = snap.leaderboard.findIndex((x) => x.userId === r.userId) + 1;
                  return (
                    <PlayerStack
                      key={r.userId}
                      name={r.displayName}
                      imageUrl={r.imageUrl}
                      rank={trueRank}
                      subtitle={`${r.correct}/${r.correct + r.wrong} · ${r.accuracyPct}%`}
                      large={trueRank === 1}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-foreground shadow-[8px_8px_0_0_rgb(0_0_0)]">
            <CardHeader>
              <CardTitle className="text-xl">Full leaderboard</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {snap.leaderboard.map((r, i) => {
                  const rank = i + 1;
                  return (
                    <li
                      key={r.userId}
                      className={cn(
                        "flex flex-wrap items-center gap-3 rounded-lg border-2 px-3 py-3",
                        rank === 1 ? "border-foreground bg-muted/50" : "border-border",
                      )}
                    >
                      <span className="text-lg" aria-hidden>
                        {rank <= 3 ? medalEmoji(rank) : `${rank}.`}
                      </span>
                      <Avatar className="size-10">
                        {r.imageUrl ? <AvatarImage src={r.imageUrl} alt="" /> : null}
                        <AvatarFallback>{r.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold">
                          {r.displayName}
                          {r.userId === userId ? " (you)" : ""}
                        </span>
                        <p className="text-sm tabular-nums text-muted-foreground">
                          {r.correct}/{r.correct + r.wrong} correct · {r.accuracyPct}% ·{" "}
                          {r.totalTimeSeconds}s total
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>

          {barData.length > 0 ? (
            <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
              <CardHeader>
                <CardTitle className="text-lg">Accuracy by player</CardTitle>
              </CardHeader>
              <CardContent className="h-[280px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={chartTooltip.contentStyle} />
                    <Bar dataKey="accuracy" fill={CHART_MONO.ink} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : null}

          {pieMe.length > 0 ? (
            <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
              <CardHeader>
                <CardTitle className="text-lg">Your correct vs incorrect</CardTitle>
              </CardHeader>
              <CardContent className="mx-auto h-[240px] max-w-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieMe}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      stroke={CHART_MONO.ink}
                      strokeWidth={2}
                    >
                      {pieMe.map((_, index) => (
                        <Cell
                          key={String(index)}
                          fill={index === 0 ? CHART_MONO.ink : CHART_MONO.light}
                        />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltip.contentStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : null}

          {me ? (
            <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
              <CardHeader>
                <CardTitle className="text-lg">Your performance</CardTitle>
                <CardDescription>
                  You scored {me.accuracyPct}% accuracy vs party average{" "}
                  {Math.round(partyAvg * 10) / 10}%.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2Icon className="size-4" />
                  Total time: {me.totalTimeSeconds}s (sum of question times)
                </div>
              </CardContent>
            </Card>
          ) : null}

          {snap.myTopicBreakdown && snap.myTopicBreakdown.length > 0 ? (
            <Card className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
              <CardHeader>
                <CardTitle className="text-lg">Strong & weak areas (you)</CardTitle>
                <CardDescription>
                  Topics from this quiz — lowest accuracy first (review these on your roadmap).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {snap.myTopicBreakdown.map((row) => (
                    <li
                      key={row.topic}
                      className="flex justify-between gap-2 border-b border-border py-2 last:border-0"
                    >
                      <span>{row.topic}</span>
                      <span className="tabular-nums">
                        {row.correct}/{row.total} · {row.accuracyPct}%
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-2 border-dashed border-border bg-muted/20">
            <CardContent className="py-4 text-center text-sm">
              <Button asChild variant="outline" className="border-2 border-foreground">
                <a href="/reports">Open saved game report in Reports</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
