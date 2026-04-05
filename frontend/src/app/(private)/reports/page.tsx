import { listCompletedBloomReportsForUser } from "@/actions/bloom-test-session";
import { listCompletedGameReportsForUser } from "@/actions/quiz-party";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { parseBloomSessionReport } from "@/lib/bloom-report-types";
import { parseGameReport } from "@/lib/game-report-types";
import { ArrowRightIcon, FileTextIcon, Gamepad2Icon } from "lucide-react";
import Link from "next/link";

export default async function ReportsPage() {
  const rows = await listCompletedBloomReportsForUser();
  const games = await listCompletedGameReportsForUser();
  const hasAny = rows.length > 0 || games.length > 0;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">All reports</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Completed tests and multiplayer games with saved analytics. Open any report for charts and
          breakdowns.
        </p>
      </div>

      {!hasAny ? (
        <Card className="border-2 border-dashed border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileTextIcon className="size-5" />
              <CardTitle>No reports yet</CardTitle>
            </div>
            <CardDescription>
              Finish a test or multiplayer game to generate a report, then return here to review
              analytics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="border-2 border-foreground font-semibold shadow-[4px_4px_0_0_rgb(0_0_0)]">
              <Link href="/tests/new">
                Start a test
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-10">
          {games.length > 0 ? (
            <section className="grid gap-4">
              <h2 className="text-lg font-semibold tracking-tight">Multiplayer games</h2>
              {games.map((g) => {
                const gr = parseGameReport(g.reportJson);
                return (
                  <Card
                    key={g.id}
                    className="border-2 border-foreground shadow-[6px_6px_0_0_rgb(0_0_0)] transition-transform hover:-translate-y-0.5"
                  >
                    <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 pb-2">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Gamepad2Icon className="size-5" />
                          {g.title ?? "Multiplayer game"}
                        </CardTitle>
                        <CardDescription>
                          Code {g.code} · {g.examType} ·{" "}
                          {g.finishedAt ? new Date(g.finishedAt).toLocaleString() : "—"} ·{" "}
                          {g.totalQuestions} questions
                        </CardDescription>
                      </div>
                      <Button
                        asChild
                        className="shrink-0 border-2 border-foreground font-semibold shadow-[4px_4px_0_0_rgb(0_0_0)]"
                      >
                        <Link href={`/reports/game/${g.id}`}>
                          Open report
                          <ArrowRightIcon className="size-4" />
                        </Link>
                      </Button>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {gr?.partyAvgAccuracy != null ? (
                        <span className="rounded-md border border-border bg-muted/50 px-2 py-1 font-semibold text-foreground">
                          Party avg {gr.partyAvgAccuracy}%
                        </span>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}
            </section>
          ) : null}

          {rows.length > 0 ? (
            <section className="grid gap-4">
              <h2 className="text-lg font-semibold tracking-tight">Adaptive tests</h2>
              <div className="grid gap-4">
          {rows.map((s) => {
            const report = parseBloomSessionReport(s.reportJson);
            const acc =
              report?.session_totals?.overall_accuracy_pct ??
              (report?.learning_dna?.accuracy != null ? report.learning_dna.accuracy : null);
            return (
              <Card
                key={s.id}
                className="border-2 border-foreground shadow-[6px_6px_0_0_rgb(0_0_0)] transition-transform hover:-translate-y-0.5"
              >
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 pb-2">
                  <div>
                    <CardTitle className="text-lg">
                      {s.templateKey ?? "Adaptive test"} · {s.examType}
                    </CardTitle>
                    <CardDescription>
                      Updated {s.updatedAt ? new Date(s.updatedAt).toLocaleString() : "—"} ·{" "}
                      {s.targetQuestionCount} questions planned
                    </CardDescription>
                  </div>
                  <Button
                    asChild
                    className="shrink-0 border-2 border-foreground font-semibold shadow-[4px_4px_0_0_rgb(0_0_0)]"
                  >
                    <Link href={`/tests/${s.id}`}>
                      Open report
                      <ArrowRightIcon className="size-4" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {acc != null ? (
                    <span className="rounded-md border border-border bg-muted/50 px-2 py-1 font-semibold text-foreground">
                      Accuracy {typeof acc === "number" && acc <= 100 ? `${acc.toFixed(1)}%` : `${acc}%`}
                    </span>
                  ) : null}
                  {report?.weak_concepts?.length ? (
                    <span>
                      Weak areas: {report.weak_concepts.slice(0, 4).join(", ")}
                      {report.weak_concepts.length > 4 ? "…" : ""}
                    </span>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
