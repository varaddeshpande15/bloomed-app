"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import * as React from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

export type Big5TraitEntry = {
  score?: number;
  level?: string;
  description?: string;
};

/** OCEAN order matching common Big Five radar layouts (top → clockwise). */
const BIG5_ORDER = [
  { key: "openness", label: "Openness", axisShort: "OPENNESS" },
  { key: "conscientiousness", label: "Conscientiousness", axisShort: "CONSCIENTIOUSNESS" },
  { key: "extraversion", label: "Extraversion", axisShort: "EXTRAVERSION" },
  { key: "agreeableness", label: "Agreeableness", axisShort: "AGREEABLENESS" },
  { key: "neuroticism", label: "Neuroticism", axisShort: "NEUROTICISM" },
] as const;

function normalizeScore(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/** How spread out the five scores are — complements a radar “shape” read. */
function spectralDivergenceLabel(scores: number[]): "LOW" | "MODERATE" | "HIGH" {
  if (scores.length < 2) return "LOW";
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((s, x) => s + (x - mean) ** 2, 0) / scores.length;
  const sd = Math.sqrt(variance);
  if (sd < 14) return "LOW";
  if (sd < 24) return "MODERATE";
  return "HIGH";
}

export function BigFiveAnalysisSection({
  big5,
}: {
  big5: Record<string, Big5TraitEntry>;
}) {
  const rows = React.useMemo(() => {
    return BIG5_ORDER.map(({ key, label, axisShort }) => {
      const raw = big5[key] ?? {};
      const score = normalizeScore(raw.score);
      return {
        key,
        label,
        axisShort,
        score,
        level: raw.level,
        description: raw.description,
      };
    });
  }, [big5]);

  const chartData = rows.map((r) => ({
    trait: r.axisShort,
    score: r.score,
  }));

  const divergence = spectralDivergenceLabel(rows.map((r) => r.score));

  return (
    <Card className="overflow-hidden border-2 border-foreground shadow-[6px_6px_0_0_rgb(0_0_0)]">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">
          Big Five Analysis
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed sm:text-base">
          The fundamental dimensions of personality — from your onboarding profile (0–100).
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
        <div className="flex min-w-0 flex-col">
          <div className="relative overflow-hidden rounded-xl border-2 border-border bg-muted/50 shadow-[4px_4px_0_0_rgb(0_0_0)] dark:bg-muted/25">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12] dark:opacity-[0.08]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)",
                backgroundSize: "18px 18px",
              }}
              aria-hidden
            />
            <div className="relative mx-auto aspect-square max-h-[340px] w-full p-3 sm:p-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="78%" data={chartData}>
                  <PolarGrid
                    stroke="hsl(var(--border))"
                    strokeDasharray="4 4"
                    radialLines
                  />
                  <PolarAngleAxis
                    dataKey="trait"
                    tick={{
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 8,
                      fontWeight: 600,
                    }}
                    tickLine={false}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                    angle={90}
                  />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <p className="mt-4 text-center text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Spectral divergence: {divergence}
          </p>
          <p className="mt-1.5 text-center text-[11px] leading-snug text-muted-foreground">
            How much your five scores differ — lower means a more even profile across traits.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:gap-4">
          {rows.map((r) => (
            <div
              key={r.key}
              className="rounded-xl border-2 border-border bg-card p-4 shadow-[4px_4px_0_0_rgb(0_0_0)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{r.label}</p>
                  {r.level ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{r.level}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-lg font-black tabular-nums text-foreground">
                  {r.score}%
                </span>
              </div>
              <div
                className="mt-3 h-3 w-full overflow-hidden rounded-full border border-border bg-muted"
                role="progressbar"
                aria-valuenow={r.score}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${r.label} ${r.score} percent`}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary via-primary to-primary/85"
                  style={{ width: `${r.score}%` }}
                />
              </div>
              {r.description ? (
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                  {r.description}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
