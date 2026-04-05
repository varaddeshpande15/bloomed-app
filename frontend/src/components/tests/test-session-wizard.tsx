"use client";

import {
  appendBloomTestAttempt,
  completeBloomTestSession,
  createBloomTestSessionRecord,
} from "@/actions/bloom-test-session";
import { getLatestPsychologicalReportForUser } from "@/actions/psych-profile";
import {
  bloomGenerateTestPlan,
  bloomSessionAnswer,
  bloomSessionNext,
  bloomSessionReport,
  bloomSessionStart,
  bloomSyllabusUpload,
  totalQuestionsFromPlan,
  type BloomQuestion,
  type BloomTestPlanItem,
} from "@/lib/bloom-api";
import {
  DEFAULT_MARKING_SCHEME,
  EXAM_TYPE_OPTIONS,
  SYLLABUS_TEMPLATES,
} from "@/lib/bloom-templates";
import { mapTraitsFromPsychReport } from "@/lib/map-traits";
import { traitSummaryLine } from "@/lib/trait-copy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  ClockIcon,
  FileUpIcon,
  Loader2Icon,
  SparklesIcon,
  Wand2Icon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

type Step = "upload" | "configure" | "intro" | "question" | "feedback" | "report";

function formatOpts(opts: string[] | null | undefined): string[] {
  if (!opts?.length) return [];
  return opts;
}

function labelForAnswer(opts: string[], answer: string): string {
  const a = answer.trim().toLowerCase();
  const hit = opts.find((o) => o.trim().toLowerCase() === a);
  return hit ?? answer;
}

export function TestSessionWizard({
  templateKey,
}: {
  templateKey?: string | null;
}) {
  const preset = SYLLABUS_TEMPLATES.find((t) => t.key === templateKey);

  const [step, setStep] = React.useState<Step>("upload");
  const [file, setFile] = React.useState<File | null>(null);
  const [paste, setPaste] = React.useState("");
  const [topics, setTopics] = React.useState<{ topic: string; subtopics: string[] }[]>(
    [],
  );
  const [examType, setExamType] = React.useState(preset?.examType ?? "STANDARD");
  const [markingScheme, setMarkingScheme] = React.useState<Record<string, unknown>>(() => ({
    ...DEFAULT_MARKING_SCHEME,
  }));
  const [traitSnapshot, setTraitSnapshot] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [testPlan, setTestPlan] = React.useState<BloomTestPlanItem[]>([]);
  const [dbSessionId, setDbSessionId] = React.useState<string | null>(null);
  const [totalQs, setTotalQs] = React.useState(5);
  const [qIndex, setQIndex] = React.useState(0);
  const [currentQ, setCurrentQ] = React.useState<BloomQuestion | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [startedAt, setStartedAt] = React.useState<number | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const [lastEval, setLastEval] = React.useState<{
    is_correct: boolean;
    explanation: string;
    insight: Record<string, string>;
    correct_answer: string;
    user_answer: string;
  } | null>(null);
  const [moreExplain, setMoreExplain] = React.useState<string | null>(null);
  const [explainBusy, setExplainBusy] = React.useState(false);
  const [report, setReport] = React.useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    void getLatestPsychologicalReportForUser().then((r) => {
      if (r?.report) setTraitSnapshot(r.report as Record<string, unknown>);
    });
  }, []);

  const mappedFromProfile = React.useMemo(
    () => (traitSnapshot ? mapTraitsFromPsychReport(traitSnapshot) : null),
    [traitSnapshot],
  );

  const roadmapLearnQs = React.useMemo(() => {
    if (!mappedFromProfile?.learning_style) return "";
    return `&learn=${encodeURIComponent(mappedFromProfile.learning_style)}`;
  }, [mappedFromProfile]);

  React.useEffect(() => {
    if (step !== "question" || !startedAt) return;
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [step, startedAt]);

  async function handleUpload() {
    setBusy(true);
    try {
      const fd = new FormData();
      if (file) fd.append("file", file);
      else if (paste.trim().length >= 50) fd.append("text", paste.trim());
      else {
        toast.error("Add a PDF or at least ~50 characters of syllabus text.");
        return;
      }
      const res = await bloomSyllabusUpload(fd);
      setTopics(res.topics ?? []);
      if (!res.topics?.length) {
        toast.error("No topics extracted — try clearer syllabus text.");
        return;
      }
      setStep("configure");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleGeneratePlanAndStart() {
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
        trait_profile: traitSnapshot,
      });
      const plan = planRes.test_plan ?? [];
      setTestPlan(plan);
      const n = totalQuestionsFromPlan(plan);
      setTotalQs(Math.max(1, n));

      const plainTopics = JSON.parse(JSON.stringify(topics)) as typeof topics;
      const sid = await createBloomTestSessionRecord({
        templateKey: preset?.key ?? templateKey ?? null,
        examType,
        markingScheme: {
          ...markingScheme,
          total_questions: totalQ,
          default_questions: totalQ,
        } as Record<string, unknown>,
        syllabusTopics: plainTopics,
        testPlan: plan,
        traitProfile: traitSnapshot,
        targetQuestionCount: n,
      });
      setDbSessionId(sid);
      if (!sid) {
        toast.warning(
          "Could not save this session to the database (add BloomTestSession in Supabase or check logs). You can still take the test.",
        );
      }

      await bloomSessionStart({
        test_plan: plan,
        exam_type: examType,
      });

      setStep("intro");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start");
    } finally {
      setBusy(false);
    }
  }

  async function beginQuestions() {
    setBusy(true);
    try {
      const { question } = await bloomSessionNext();
      setCurrentQ(question);
      setSelected(null);
      setLastEval(null);
      setStartedAt(Date.now());
      setElapsed(0);
      setStep("question");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Next question failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer() {
    if (!currentQ || !selected) return;
    const t = startedAt ? (Date.now() - startedAt) / 1000 : 0;
    setBusy(true);
    try {
      const ev = await bloomSessionAnswer({
        question_id: currentQ.id,
        user_answer: selected,
        time_taken: t,
      });
      if (dbSessionId) {
        await appendBloomTestAttempt({
          sessionId: dbSessionId,
          questionId: currentQ.id,
          topic: currentQ.topic,
          userAnswer: selected,
          correctAnswer: ev.correct_answer,
          isCorrect: ev.is_correct,
          timeTakenSeconds: t,
          explanation: ev.explanation,
          orderIndex: qIndex,
          insight: ev.insight,
        });
      }
      setMoreExplain(null);
      setLastEval({
        is_correct: ev.is_correct,
        explanation: ev.explanation,
        insight: ev.insight,
        correct_answer: ev.correct_answer,
        user_answer: selected,
      });
      setStep("feedback");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setBusy(false);
    }
  }

  async function continueAfterFeedback() {
    const isLast = qIndex >= totalQs - 1;
    if (isLast) {
      setBusy(true);
      try {
        const rep = await bloomSessionReport();
        setReport(rep);
        if (dbSessionId) {
          await completeBloomTestSession({ sessionId: dbSessionId, report: rep });
        }
        setStep("report");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Report failed");
      } finally {
        setBusy(false);
      }
      return;
    }
    setBusy(true);
    try {
      const { question } = await bloomSessionNext();
      setQIndex((x) => x + 1);
      setCurrentQ(question);
      setSelected(null);
      setLastEval(null);
      setStartedAt(Date.now());
      setElapsed(0);
      setStep("question");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Next failed");
    } finally {
      setBusy(false);
    }
  }

  const weakHint =
    (report?.weak_concepts as string[] | undefined)?.filter(Boolean).join(", ") ||
    (report?.roadmap as string[] | undefined)?.[0] ||
    topics[0]?.topic ||
    "your focus topics";

  const compactTestStep = step === "question" || step === "feedback";

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-3xl px-3 sm:px-4",
        compactTestStep
          ? "flex min-h-[calc(100dvh-6rem)] flex-col justify-center space-y-2 py-2 sm:min-h-[calc(100dvh-5rem)]"
          : "space-y-8 py-8",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center gap-2 text-muted-foreground",
          compactTestStep ? "text-xs" : "text-sm",
        )}
      >
        <SparklesIcon className={compactTestStep ? "size-3.5" : "size-4"} />
        {preset ? (
          <span>
            Template: <strong>{preset.title}</strong>
          </span>
        ) : (
          <span>Adaptive test</span>
        )}
      </div>

      <AnimatePresence mode="wait">
        {step === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Card className="border-2 border-foreground shadow-[6px_6px_0_0_rgb(0_0_0)]">
              <CardHeader>
                <CardTitle className="text-xl">Upload your syllabus</CardTitle>
                <CardDescription>
                  PDF, or paste text (images: extract text first). Content is sent to the syllabus
                  pipeline to extract topics.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>PDF file</Label>
                  <Input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Or paste syllabus / topic outline</Label>
                  <Textarea
                    value={paste}
                    onChange={(e) => setPaste(e.target.value)}
                    rows={6}
                    placeholder="Minimum length required by the engine (~50+ chars)…"
                    className="border-2 border-border"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  disabled={busy}
                  onClick={() => void handleUpload()}
                  className="border-2 border-foreground font-semibold shadow-[4px_4px_0_0_rgb(0_0_0)]"
                >
                  {busy ? <Loader2Icon className="size-4 animate-spin" /> : <FileUpIcon />}
                  Parse syllabus
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}

        {step === "configure" && (
          <motion.div
            key="configure"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Card className="border-2 border-foreground shadow-[6px_6px_0_0_rgb(0_0_0)]">
              <CardHeader>
                <CardTitle>Exam & marking</CardTitle>
                <CardDescription>
                  Your BloomEd psych profile steers question mix and pacing when available.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {mappedFromProfile ? (
                  <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4 text-sm leading-relaxed shadow-[3px_3px_0_0_rgb(0_0_0)]">
                    <p className="font-semibold text-foreground">Active personalization</p>
                    <p className="mt-1 text-muted-foreground">{traitSummaryLine(mappedFromProfile)}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      The test plan API applies these signals to question types (e.g. scenario-based
                      where the syllabus fits). Expanded explanations use the same profile.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                    No psych profile on file —{" "}
                    <Link href="/onboarding" className="font-semibold underline underline-offset-4">
                      complete onboarding
                    </Link>{" "}
                    for adaptive bias, or continue with default pacing.
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Exam style</Label>
                  <RadioGroup value={examType} onValueChange={setExamType}>
                    {EXAM_TYPE_OPTIONS.map((o) => (
                      <div
                        key={o.value}
                        className="flex items-center space-x-2 rounded-lg border-2 border-border p-3"
                      >
                        <RadioGroupItem value={o.value} id={o.value} />
                        <Label htmlFor={o.value} className="cursor-pointer font-normal">
                          <span className="font-semibold">{o.label}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{o.hint}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Total questions (split across all syllabus units)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={40}
                      value={Number(
                        markingScheme.total_questions ??
                          markingScheme.default_questions ??
                          10,
                      )}
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
                    <p className="text-xs text-muted-foreground">
                      Example: 20 questions with 4 extracted units → ~5 per unit.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Marks / question</Label>
                    <Input
                      type="number"
                      min={1}
                      value={Number(markingScheme.marks_per_question ?? 4)}
                      onChange={(e) =>
                        setMarkingScheme((m) => ({
                          ...m,
                          marks_per_question: Number(e.target.value) || 4,
                        }))
                      }
                      className="border-2"
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-dashed bg-muted/40 p-3 text-sm">
                  <strong>Extracted topics:</strong>{" "}
                  {topics.map((t) => t.topic).join(" · ") || "—"}
                </div>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setStep("upload")}>
                  Back
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => void handleGeneratePlanAndStart()}
                  className="border-2 border-foreground font-semibold shadow-[4px_4px_0_0_rgb(0_0_0)]"
                >
                  {busy ? <Loader2Icon className="size-4 animate-spin" /> : null}
                  Build test & initialize session
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}

        {step === "intro" && (
          <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card className="border-2 border-foreground shadow-[6px_6px_0_0_rgb(0_0_0)]">
              <CardHeader>
                <CardTitle>Ready when you are</CardTitle>
                <CardDescription>
                  {totalQs} adaptive questions · timer tracks time per question for analytics.
                </CardDescription>
                {mappedFromProfile ? (
                  <p className="pt-2 text-sm leading-relaxed text-foreground">
                    <span className="font-semibold">Personalized for you: </span>
                    {traitSummaryLine(mappedFromProfile)}. “More explanation” after each answer will
                    match this style.
                  </p>
                ) : null}
              </CardHeader>
              <CardFooter>
                <Button
                  disabled={busy}
                  onClick={() => void beginQuestions()}
                  className="border-2 border-foreground font-semibold shadow-[4px_4px_0_0_rgb(0_0_0)]"
                >
                  Start test
                  <ArrowRightIcon className="size-4" />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}

        {step === "question" && currentQ && (
          <motion.div
            key="q"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex min-h-0 w-full flex-1 flex-col justify-center"
          >
            <Card className="flex max-h-[min(100dvh-7rem,720px)] w-full flex-col overflow-hidden border-2 border-foreground shadow-[6px_6px_0_0_rgb(0_0_0)]">
              <CardHeader className="shrink-0 space-y-0 px-4 pb-2 pt-4 sm:px-5">
                <div className="flex flex-row flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-bold leading-tight sm:text-lg">
                      Question {qIndex + 1} / {totalQs}
                    </CardTitle>
                    <CardDescription className="mt-0.5 line-clamp-1 text-xs">
                      {currentQ.topic} · {currentQ.difficulty} · {currentQ.type}
                    </CardDescription>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 rounded-md border-2 border-foreground bg-muted px-2.5 py-1 font-mono text-xs font-semibold tabular-nums shadow-[2px_2px_0_0_rgb(0_0_0)] sm:text-sm">
                    <ClockIcon className="size-3.5 sm:size-4" />
                    {elapsed}s
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 pb-3 sm:px-5">
                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <p className="text-sm font-medium leading-snug text-foreground sm:text-[0.9375rem]">
                    {currentQ.question_text}
                  </p>
                </div>
                <div className="grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2">
                  {formatOpts(currentQ.options).map((opt, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const active = selected === opt;
                    return (
                      <Button
                        key={`${letter}-${opt.slice(0, 12)}`}
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => setSelected(opt)}
                        className={cn(
                          "h-auto min-h-0 justify-start whitespace-normal border-2 py-2.5 text-left text-xs font-normal leading-snug shadow-[2px_2px_0_0_rgb(0_0_0)] sm:py-3 sm:text-sm",
                          active && "border-foreground bg-muted ring-2 ring-foreground/20",
                        )}
                      >
                        <span className="mr-1.5 shrink-0 font-bold">{letter}.</span>
                        <span className="text-left">{opt}</span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
              <CardFooter className="shrink-0 border-t border-border px-4 py-3 sm:px-5">
                <Button
                  disabled={!selected || busy}
                  onClick={() => void submitAnswer()}
                  size="default"
                  className="w-full border-2 border-foreground font-semibold shadow-[3px_3px_0_0_rgb(0_0_0)] sm:w-auto"
                >
                  Submit answer
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}

        {step === "feedback" && lastEval && currentQ && (
          <motion.div
            key="fb"
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex min-h-0 w-full flex-1 flex-col justify-center"
          >
            <Card
              className={cn(
                "flex max-h-[min(100dvh-7rem,720px)] w-full flex-col overflow-hidden border-2 shadow-[6px_6px_0_0_rgb(0_0_0)]",
                lastEval.is_correct ? "border-foreground" : "border-foreground",
              )}
            >
              <CardHeader className="min-h-0 flex-1 space-y-3 overflow-hidden px-4 pt-4 sm:px-5">
                <div className="flex items-center gap-2">
                  {lastEval.is_correct ? (
                    <CheckCircle2Icon className="size-8 shrink-0 text-foreground" />
                  ) : (
                    <XCircleIcon className="size-8 shrink-0 text-foreground" />
                  )}
                  <CardTitle className="text-lg sm:text-xl">
                    {lastEval.is_correct ? "Correct" : "Not quite"}
                  </CardTitle>
                </div>
                <div className="grid gap-2 rounded-lg border-2 border-border bg-muted/40 p-3 text-xs sm:text-sm">
                  <div>
                    <span className="font-semibold text-muted-foreground">Your answer: </span>
                    <span className="font-medium">
                      {labelForAnswer(formatOpts(currentQ.options), lastEval.user_answer)}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-muted-foreground">Correct answer: </span>
                    <span className="font-medium underline decoration-foreground/30 underline-offset-2">
                      {labelForAnswer(formatOpts(currentQ.options), lastEval.correct_answer)}
                    </span>
                  </div>
                </div>
                <div className="min-h-0 max-h-[28vh] overflow-y-auto text-sm leading-snug text-foreground">
                  {lastEval.explanation}
                </div>
                {moreExplain && (
                  <div className="max-h-[22vh] overflow-y-auto rounded-lg border-2 border-dashed border-border bg-card p-3 text-xs leading-relaxed whitespace-pre-wrap sm:text-sm">
                    {moreExplain}
                  </div>
                )}
              </CardHeader>
              <CardFooter className="flex shrink-0 flex-col gap-2 border-t border-border px-4 py-3 sm:flex-row sm:flex-wrap sm:px-5">
                <Button
                  type="button"
                  variant="outline"
                  disabled={explainBusy}
                  className="border-2 border-foreground"
                  onClick={async () => {
                    setExplainBusy(true);
                    try {
                      const res = await fetch("/api/bloom/explain", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          questionText: currentQ.question_text,
                          correctAnswer: lastEval.correct_answer,
                          explanation: lastEval.explanation,
                          mappedTraits: mappedFromProfile,
                        }),
                      });
                      const data = (await res.json()) as { text?: string; detail?: string };
                      if (!res.ok) throw new Error(data.detail ?? "Failed");
                      setMoreExplain(data.text ?? "");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Could not expand");
                    } finally {
                      setExplainBusy(false);
                    }
                  }}
                >
                  {explainBusy ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <Wand2Icon className="size-4" />
                  )}
                  More explanation
                </Button>
                <Button variant="outline" asChild className="border-2 border-foreground">
                  <Link
                    href={`/roadmap?topic=${encodeURIComponent(currentQ.topic)}${roadmapLearnQs}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <BookOpenIcon className="size-4" />
                    Roadmap for this topic
                  </Link>
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => void continueAfterFeedback()}
                  className="border-2 border-foreground font-semibold shadow-[3px_3px_0_0_rgb(0_0_0)] sm:ml-auto"
                >
                  {busy ? <Loader2Icon className="size-4 animate-spin" /> : null}
                  {qIndex >= totalQs - 1 ? "View report" : "Next question"}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}

        {step === "report" && report && (
          <motion.div key="rep" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-2 border-foreground shadow-[8px_8px_0_0_rgb(0_0_0)]">
              <CardHeader>
                <CardTitle className="text-2xl">Session report</CardTitle>
                <CardDescription>
                  Accuracy, behaviors, and suggested next steps from the adaptive engine.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border-2 border-border bg-muted/30 p-3">
                    <div className="text-xs text-muted-foreground">Overall accuracy</div>
                    <div className="text-2xl font-bold">
                      {String(
                        (report.session_totals as { overall_accuracy_pct?: number } | undefined)
                          ?.overall_accuracy_pct ?? "—",
                      )}
                      {(report.session_totals as { overall_accuracy_pct?: number } | undefined)
                        ?.overall_accuracy_pct != null
                        ? "%"
                        : ""}
                    </div>
                  </div>
                  <div className="rounded-lg border-2 border-border bg-muted/30 p-3">
                    <div className="text-xs text-muted-foreground">Learning DNA</div>
                    <div className="font-semibold">
                      {String(
                        (report.learning_dna as { behavior?: string } | undefined)?.behavior ??
                          "—",
                      )}
                    </div>
                  </div>
                </div>
                {Array.isArray(report.actionable_insights) &&
                  (report.actionable_insights as string[]).length > 0 && (
                    <div>
                      <h4 className="mb-2 font-semibold">Insights</h4>
                      <ul className="list-inside list-disc space-y-1">
                        {(report.actionable_insights as string[]).map((x) => (
                          <li key={x.slice(0, 40)}>{x}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button asChild className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)]">
                    <Link
                      href={`/roadmap?topic=${encodeURIComponent(weakHint)}${roadmapLearnQs}`}
                    >
                      Personalized roadmap (weak areas)
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="border-2">
                    <Link href="/dashboard">Dashboard</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
