import { listBloomTestSessionsForUser } from "@/actions/bloom-test-session";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClipboardListIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { SYLLABUS_TEMPLATES } from "@/lib/bloom-templates";

export default async function TestsPage() {
  const sessions = await listBloomTestSessionsForUser();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tests & reports</h1>
          <p className="text-sm text-muted-foreground">
            Adaptive sessions with syllabus upload and analytics.
          </p>
        </div>
        <Button
          asChild
          className="border-2 border-foreground font-semibold shadow-[4px_4px_0_0_rgb(0_0_0)]"
        >
          <Link href="/tests/new">
            <PlusIcon className="size-4" />
            New test
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {SYLLABUS_TEMPLATES.slice(0, 4).map((t) => (
          <Button key={t.key} asChild variant="outline" size="sm" className="border-2">
            <Link href={`/tests/new?template=${t.key}`}>{t.title}</Link>
          </Button>
        ))}
      </div>

      {sessions.length === 0 ? (
        <Card className="border-2 border-dashed border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ClipboardListIcon className="size-5" />
              <CardTitle>No sessions yet</CardTitle>
            </div>
            <CardDescription>
              Start a test from the dashboard templates or click New test.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sessions.map((s) => (
            <Card
              key={s.id}
              className="border-2 border-foreground shadow-[4px_4px_0_0_rgb(0_0_0)] transition-transform hover:-translate-y-0.5"
            >
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    {s.templateKey ?? "Test"} · {s.examType}
                  </CardTitle>
                  <CardDescription>
                    {s.status} · {s.targetQuestionCount} Q ·{" "}
                    {s.createdAt ? new Date(s.createdAt).toLocaleString() : ""}
                  </CardDescription>
                </div>
                <Button asChild size="sm" className="shrink-0 border-2 border-foreground font-semibold shadow-[3px_3px_0_0_rgb(0_0_0)]">
                  <Link href={`/tests/${s.id}`}>Open</Link>
                </Button>
              </CardHeader>
              {s.reportJson && (
                <CardContent className="text-xs text-muted-foreground">
                  Report saved — open for analytics, charts, and PDF.
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
