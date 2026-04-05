import { getLatestPsychologicalReportForUser } from "@/actions/psych-profile";
import { mapTraitsFromPsychReport } from "@/lib/map-traits";
import { traitAdaptationBullets, traitSummaryLine } from "@/lib/trait-copy";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BigFiveAnalysisSection } from "@/components/profile/big-five-analysis";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

export default async function ProfilePage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?redirect_url=/profile");

  const psych = await getLatestPsychologicalReportForUser();
  const report = psych?.report as Record<string, unknown> | undefined;

  const mapped = report ? mapTraitsFromPsychReport(report) : null;
  const adaptationLines = mapped ? traitAdaptationBullets(mapped) : [];

  const big5 = report?.big5_analysis as Record<string, Record<string, unknown>> | undefined;
  const learning = report?.learning_profile as Record<string, unknown> | undefined;
  const vark = learning?.vark as Record<string, unknown> | undefined;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your BloomEd account and psychological learning profile.
        </p>
      </div>

      <Card className="border-2 border-foreground shadow-[6px_6px_0_0_rgb(0_0_0)]">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Signed in with Clerk</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Row label="Name" value={user.fullName || user.firstName || "—"} />
          <Row
            label="Email"
            value={user.primaryEmailAddress?.emailAddress ?? "—"}
          />
        </CardContent>
      </Card>

      {!psych && (
        <Card className="border-2 border-dashed border-border">
          <CardHeader>
            <CardTitle>No learning profile yet</CardTitle>
            <CardDescription>
              Complete the onboarding questionnaire to generate your psychological learning
              profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href="/onboarding"
              className="text-sm font-semibold underline underline-offset-4"
            >
              Go to onboarding
            </a>
          </CardContent>
        </Card>
      )}

      {report && mapped && (
        <Card className="border-2 border-foreground bg-muted/20 shadow-[6px_6px_0_0_rgb(0_0_0)]">
          <CardHeader>
            <CardTitle>How BloomEd uses your traits</CardTitle>
            <CardDescription>
              Derived from your onboarding report — same signals as adaptive test planning and expanded
              explanations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium">{traitSummaryLine(mapped)}</p>
            <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
              {adaptationLines.map((line) => (
                <li key={line.slice(0, 48)}>{line}</li>
              ))}
            </ul>
            <a
              href="/tests/new"
              className="inline-block text-sm font-semibold underline underline-offset-4"
            >
              Take a test with this personalization →
            </a>
          </CardContent>
        </Card>
      )}

      {report && (
        <>
          <Card className="border-2 border-foreground shadow-[6px_6px_0_0_rgb(0_0_0)]">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">
                {String(report.summary ?? "")}
              </p>
            </CardContent>
          </Card>

          {big5 && <BigFiveAnalysisSection big5={big5} />}

          {learning && (
            <Card className="border-2 border-foreground shadow-[6px_6px_0_0_rgb(0_0_0)]">
              <CardHeader>
                <CardTitle>Learning profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {vark?.primary_style ? (
                  <Row label="Primary style" value={String(vark.primary_style)} />
                ) : null}
                {typeof learning.growth_mindset_score === "number" ? (
                  <Row
                    label="Growth mindset"
                    value={`${learning.growth_mindset_score}`}
                  />
                ) : null}
                {typeof learning.grit_score === "number" ? (
                  <Row label="Grit" value={`${learning.grit_score}`} />
                ) : null}
                {learning.resilience_level ? (
                  <Row label="Resilience" value={String(learning.resilience_level)} />
                ) : null}
                {vark?.description ? (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {String(vark.description)}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          )}

          {Array.isArray(report.strengths) && report.strengths.length > 0 && (
            <Card className="border-2 border-foreground shadow-[6px_6px_0_0_rgb(0_0_0)]">
              <CardHeader>
                <CardTitle>Strengths</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  {(report.strengths as string[]).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {Array.isArray(report.areas_for_growth) && report.areas_for_growth.length > 0 && (
            <Card className="border-2 border-foreground shadow-[6px_6px_0_0_rgb(0_0_0)]">
              <CardHeader>
                <CardTitle>Areas for growth</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  {(report.areas_for_growth as string[]).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
