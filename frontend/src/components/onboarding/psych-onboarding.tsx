"use client";

import {
  savePsychProfileReport,
  upsertPsychProfileHistory,
  type ChatMessageRow,
} from "@/actions/psych-profile";
import { bloomProfileChat, bloomProfileReport, bloomProfileStart } from "@/lib/bloom-api";
import { parsePsychMcq, shouldOfferReport } from "@/lib/parse-psych-mcq";
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
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

type Phase = "intro" | "quiz" | "splash";

function mapHistory(
  raw: { role: string; content: string; timestamp?: number }[],
): ChatMessageRow[] {
  return raw.map((m) => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp,
  }));
}

function lastAssistant(
  history: { role: string; content: string }[],
): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "assistant") return history[i].content;
  }
  return null;
}

export function PsychOnboarding({ userName }: { userName: string }) {
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>("intro");
  const introText = React.useMemo(
    () =>
      `Hi ${userName}, welcome to BloomEd — let's get to know more about you`,
    [userName],
  );
  const words = React.useMemo(() => introText.split(/\s+/), [introText]);
  const [visibleWords, setVisibleWords] = React.useState(0);

  React.useEffect(() => {
    if (phase !== "intro") return;
    if (visibleWords >= words.length) return;
    const id = window.setTimeout(() => {
      setVisibleWords((v) => v + 1);
    }, 220);
    return () => window.clearTimeout(id);
  }, [phase, visibleWords, words.length]);

  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [history, setHistory] = React.useState<
    { role: string; content: string; timestamp?: number }[]
  >([]);
  const [loading, setLoading] = React.useState(false);
  const [starting, setStarting] = React.useState(false);

  const introDone = visibleWords >= words.length && phase === "intro";

  async function handleContinueFromIntro() {
    setStarting(true);
    try {
      const s = await bloomProfileStart();
      setSessionId(s.session_id);
      setHistory(s.history);
      await upsertPsychProfileHistory(s.session_id, mapHistory(s.history));
      setPhase("quiz");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start profile session");
    } finally {
      setStarting(false);
    }
  }

  async function sendUserMessage(text: string) {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await bloomProfileChat(sessionId, text);
      setHistory(res.history);
      await upsertPsychProfileHistory(sessionId, mapHistory(res.history));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Message failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateReport() {
    if (!sessionId) return;
    setLoading(true);
    try {
      const chatRes = await bloomProfileChat(sessionId, "report");
      setHistory(chatRes.history);
      const report = await bloomProfileReport(sessionId);
      await savePsychProfileReport(sessionId, report, mapHistory(chatRes.history));
      setPhase("splash");
      window.setTimeout(() => {
        router.push("/dashboard");
      }, 2800);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Report failed");
    } finally {
      setLoading(false);
    }
  }

  const assistantText = lastAssistant(history);
  const offerReport = assistantText ? shouldOfferReport(assistantText) : false;
  const mcq =
    assistantText && !offerReport ? parsePsychMcq(assistantText) : null;

  if (phase === "splash") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="flex size-24 items-center justify-center rounded-full border-4 border-foreground bg-primary/15 shadow-[8px_8px_0_0_rgb(0_0_0)]"
        >
          <CheckCircle2Icon className="size-14 text-primary" strokeWidth={2.5} />
        </motion.div>
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight">Personality profile saved</h2>
          <p className="mt-2 max-w-md text-muted-foreground">
            Your responses were synthesized into a learning profile. Taking you to your dashboard…
          </p>
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="mx-auto flex min-h-[75vh] max-w-4xl flex-col justify-center gap-10 px-4 py-12 sm:px-6">
        <p className="min-h-[4.5rem] text-balance text-center text-2xl font-semibold leading-snug tracking-tight sm:text-3xl md:text-4xl">
          {words.slice(0, visibleWords).join(" ")}
          {visibleWords < words.length ? (
            <span className="ml-1 inline-block h-8 w-0.5 animate-pulse bg-foreground align-middle" />
          ) : null}
        </p>
        <div className="flex justify-center sm:justify-start">
          <Button
            size="lg"
            disabled={!introDone || starting}
            onClick={() => void handleContinueFromIntro()}
            className="min-w-[10rem] border-2 border-foreground px-8 font-semibold shadow-[4px_4px_0_0_rgb(0_0_0)]"
          >
            {starting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Starting…
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[75vh] w-full max-w-4xl flex-col justify-center px-4 py-10 sm:px-6">
      <Card className="border-2 border-foreground shadow-[8px_8px_0_0_rgb(0_0_0)]">
        <CardHeader className="space-y-2 px-6 pt-8 sm:px-10 sm:pt-10">
          <CardTitle className="text-center text-2xl sm:text-3xl">Learning profile</CardTitle>
          <CardDescription className="text-center text-base">
            Answer each question by choosing the option that fits you best. There are about 5–8
            short questions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 px-6 pb-8 sm:px-10 sm:pb-10">
          {!assistantText && (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}
          {assistantText && (
            <div className="space-y-4">
              {mcq ? (
                <>
                  <p className="text-balance text-center text-lg font-semibold leading-relaxed sm:text-xl">
                    {mcq.question}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {mcq.options.map((opt) => (
                      <Button
                        key={opt.key}
                        type="button"
                        variant="outline"
                        disabled={loading}
                        className={cn(
                          "h-auto min-h-[3.25rem] justify-start whitespace-normal border-2 border-foreground px-4 py-4 text-left text-base font-normal shadow-[4px_4px_0_0_rgb(0_0_0)] sm:min-h-14",
                        )}
                        onClick={() =>
                          void sendUserMessage(`${opt.key}) ${opt.label}`)
                        }
                      >
                        <span className="mr-2 font-bold">{opt.key}.</span>
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {assistantText}
                  </p>
                  {!offerReport && (
                    <p className="text-xs text-muted-foreground">
                      If you don&apos;t see choices, type your answer in your own words (not
                      recommended).
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
        {offerReport && (
          <CardFooter className="flex flex-col items-stretch gap-2 border-t border-border pt-6 sm:flex-row sm:justify-end">
            <Button
              disabled={loading}
              onClick={() => void handleGenerateReport()}
              className="border-2 border-foreground font-semibold shadow-[4px_4px_0_0_rgb(0_0_0)]"
            >
              {loading ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Building profile…
                </>
              ) : (
                "Generate my profile"
              )}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
