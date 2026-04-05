import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MappedTraits } from "@/lib/map-traits";
import { traitAdaptationBullets, traitSummaryLine } from "@/lib/trait-copy";
import { SparklesIcon } from "lucide-react";
import Link from "next/link";

export function TraitAdaptationCard({
  mapped,
  updatedAt,
}: {
  mapped: MappedTraits;
  updatedAt: Date | string | null;
}) {
  const bullets = traitAdaptationBullets(mapped);
  const when =
    updatedAt == null
      ? ""
      : typeof updatedAt === "string"
        ? new Date(updatedAt).toLocaleDateString()
        : updatedAt.toLocaleDateString();

  return (
    <Card className="border-2 border-foreground bg-gradient-to-br from-primary/10 via-background to-background shadow-[8px_8px_0_0_rgb(0_0_0)] dark:from-primary/5">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-lg border-2 border-foreground bg-primary/15">
            <SparklesIcon className="size-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Your learning profile in BloomEd</CardTitle>
            <CardDescription>
              We use this to shape adaptive tests, expanded explanations, and roadmap hints.
              {when ? ` · Profile from ${when}` : ""}
            </CardDescription>
          </div>
        </div>
        <p className="text-sm font-medium leading-snug text-foreground/90">{traitSummaryLine(mapped)}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="border border-border font-normal">
            Style: {mapped.learning_style}
          </Badge>
          <Badge variant="secondary" className="border border-border font-normal">
            {mapped.interaction_preference}
          </Badge>
          <Badge variant="secondary" className="border border-border font-normal">
            {mapped.independence_level} independence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          {bullets.map((line, i) => (
            <li key={i} className="border-l-4 border-primary pl-3">
              {line}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="border-2 border-foreground">
            <Link href="/profile">Full profile</Link>
          </Button>
          <Button asChild size="sm" className="border-2 border-foreground font-semibold shadow-[3px_3px_0_0_rgb(0_0_0)]">
            <Link href="/tests/new">Take a personalized test</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function TraitOnboardingCtaCard() {
  return (
    <Card className="border-2 border-dashed border-foreground/60 bg-muted/30 shadow-[4px_4px_0_0_rgb(0_0_0)]">
      <CardHeader>
        <CardTitle className="text-lg">Unlock adaptive personalization</CardTitle>
        <CardDescription>
          Complete the short learning-profile questionnaire so tests, explanations, and roadmaps can
          match your style.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="border-2 border-foreground font-semibold shadow-[4px_4px_0_0_rgb(0_0_0)]">
          <Link href="/onboarding">Start onboarding</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
