import DotPattern from "@/components/ui/dot-pattern";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  LineChartIcon,
  SparklesIcon,
  BookOpenIcon,
  ShieldCheckIcon,
  CheckCircle2Icon,
  LayersIcon,
  ZapIcon,
  MapIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const features = [
  {
    title: "Bloom-aligned items",
    description:
      "Items are calibrated for cognitive load—from recall to synthesis—so practice builds durable understanding, not noise.",
    icon: BookOpenIcon,
  },
  {
    title: "Actionable reports",
    description:
      "Go beyond scores. See patterns by topic and attempt so you know what to revisit and why it matters.",
    icon: LineChartIcon,
  },
  {
    title: "Personalized roadmaps",
    description:
      "Paths that evolve with your syllabus and performance—priorities stay clear as you improve.",
    icon: MapIcon,
  },
];

const steps = [
  {
    step: "01",
    title: "Profile & syllabus",
    body: "Sign in, complete a quick learning profile, and attach your syllabus or pick a template.",
    icon: LayersIcon,
    visual: "dashboard" as const,
  },
  {
    step: "02",
    title: "Adaptive test run",
    body: "Bloom-tagged questions adapt to your responses and timing, building a rich attempt log.",
    icon: ZapIcon,
    visual: "mesh" as const,
  },
  {
    step: "03",
    title: "Reports & roadmaps",
    body: "Review accuracy by topic, weak areas, and AI roadmaps targeted to what you missed.",
    icon: CheckCircle2Icon,
    visual: "chart" as const,
  },
];

const faq = [
  {
    q: "What makes BloomEd different from static question banks?",
    a: "Questions adapt to your responses and time patterns, and every session can produce analytics you can act on—not just a score.",
  },
  {
    q: "Do I need to upload a syllabus?",
    a: "You can start from exam-style templates or bring your own syllabus for tighter topic alignment.",
  },
  {
    q: "Is my data used responsibly?",
    a: "We designed onboarding and profiling to be minimal and purposeful; you control your account via standard sign-in.",
  },
];

/** Primary CTA: default light surface; hover = solid dark fill + white label (not theme `primary`, which can be light in dark mode). */
const ctaPrimaryClass =
  "h-12 border-2 border-foreground bg-background px-8 text-base font-semibold uppercase tracking-wide text-foreground shadow-[4px_4px_0_0_rgb(0_0_0)] transition-all hover:-translate-y-0.5 hover:border-neutral-950 hover:bg-neutral-950 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const ctaOutlineClass =
  "h-12 border-2 border-foreground bg-transparent px-8 text-base font-semibold uppercase tracking-wide text-foreground shadow-[4px_4px_0_0_rgb(0_0_0)] transition-all hover:-translate-y-0.5 hover:border-neutral-950 hover:bg-neutral-950 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const ctaOnDarkClass =
  "h-12 border-2 border-background bg-background px-8 text-base font-semibold uppercase tracking-wide text-foreground shadow-[4px_4px_0_0_rgb(255_255_255)] transition-all hover:-translate-y-0.5 hover:border-neutral-950 hover:bg-neutral-950 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/40 focus-visible:ring-offset-2 focus-visible:ring-offset-foreground";

function HeroGraphic() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
      <div className="overflow-hidden rounded-2xl border-2 border-foreground bg-black shadow-[8px_8px_0_0_rgb(0_0_0)]">
        <div className="relative aspect-square w-full [&_img]:select-none">
          <Image
            src="/images/bloom-taxonomy-pyramid.png"
            alt="Bloom's Taxonomy: Remember, Understand, Apply, Analyze, Evaluate, Create — six levels shown as a stepped pyramid."
            fill
            className="object-contain p-2 sm:p-3"
            sizes="(max-width: 1024px) 100vw, 420px"
            priority
          />
        </div>
      </div>
    </div>
  );
}

function StepVisual({ kind }: { kind: "dashboard" | "mesh" | "chart" }) {
  if (kind === "dashboard") {
    return (
      <div
        className="relative aspect-[16/11] w-full overflow-hidden rounded-xl border-2 border-foreground bg-gradient-to-br from-muted/80 to-background shadow-[6px_6px_0_0_rgb(0_0_0)] dark:from-muted/40"
        aria-hidden
      >
        <div className="absolute left-3 right-3 top-3 flex h-8 items-center gap-2 border-b-2 border-foreground/15 pb-2">
          <div className="h-6 w-6 rounded border border-foreground/30 bg-primary/10" />
          <div className="h-2 flex-1 rounded bg-foreground/15" />
        </div>
        <div className="absolute bottom-4 left-4 right-4 top-16 grid grid-cols-3 gap-2">
          <div className="col-span-2 rounded-lg border border-foreground/20 bg-background/80 p-2 shadow-sm">
            <div className="mb-2 h-1.5 w-1/3 rounded bg-foreground/20" />
            <div className="space-y-1.5">
              <div className="h-1 rounded bg-muted-foreground/25" />
              <div className="h-1 rounded bg-muted-foreground/20" />
              <div className="h-1 w-4/5 rounded bg-muted-foreground/15" />
            </div>
          </div>
          <div className="rounded-lg border border-foreground/20 bg-background/60 p-2">
            <div className="mx-auto mb-2 size-8 rounded-full border-2 border-foreground/25" />
            <div className="h-1 rounded bg-muted-foreground/20" />
          </div>
        </div>
      </div>
    );
  }
  if (kind === "mesh") {
    return (
      <div
        className="relative aspect-[16/11] w-full overflow-hidden rounded-xl border-2 border-foreground bg-muted/40 shadow-[6px_6px_0_0_rgb(0_0_0)] dark:bg-muted/25"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(90deg, hsl(var(--foreground) / 0.06) 1px, transparent 1px),
            linear-gradient(hsl(var(--foreground) / 0.06) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
      >
        <div className="absolute inset-0 opacity-40">
          <svg className="size-full" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M20 100 L60 40 L100 90 L140 30 L180 80"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-foreground"
            />
            <path
              d="M10 50 L50 110 L90 50 L130 100 L190 50"
              stroke="currentColor"
              strokeWidth="1"
              className="text-muted-foreground"
            />
            <circle cx="60" cy="40" r="4" className="fill-foreground" />
            <circle cx="100" cy="90" r="4" className="fill-foreground" />
            <circle cx="140" cy="30" r="4" className="fill-foreground" />
          </svg>
        </div>
      </div>
    );
  }
  return (
    <div
      className="relative aspect-[16/11] w-full overflow-hidden rounded-xl border-2 border-foreground bg-background shadow-[6px_6px_0_0_rgb(0_0_0)]"
      aria-hidden
    >
      <div className="absolute inset-4 flex flex-col gap-3">
        <div className="flex h-28 items-end justify-between gap-2 border-b-2 border-foreground/10 px-1 pb-2">
          {[40, 65, 35, 80, 55, 90, 48].map((h, i) => (
            <div
              key={i}
              className="w-full rounded-t border-2 border-foreground bg-primary/25 dark:bg-primary/35"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="grid flex-1 grid-cols-2 gap-2">
          <div className="rounded border border-foreground/20 p-2">
            <div className="mb-2 h-1 w-2/3 bg-foreground/15" />
            <div className="space-y-1">
              <div className="h-0.5 w-full bg-muted-foreground/20" />
              <div className="h-0.5 w-4/5 bg-muted-foreground/15" />
            </div>
          </div>
          <div className="rounded border border-foreground/20 p-2">
            <div className="mb-2 h-1 w-1/2 bg-foreground/15" />
            <div className="space-y-1">
              <div className="h-0.5 w-full bg-muted-foreground/20" />
              <div className="h-0.5 w-3/4 bg-muted-foreground/15" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BloomEdLanding() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.25),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.15),transparent)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/10 via-transparent to-transparent dark:from-primary/5" />
      <DotPattern
        className={cn(
          "mask-[radial-gradient(700px_circle_at_center,white,transparent)] opacity-30 dark:opacity-20",
        )}
      />

      <header className="sticky top-0 z-50 border-b-2 border-foreground bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
        <nav
          className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8"
          aria-label="Primary"
        >
          <Link
            href="/"
            className="text-lg font-extrabold tracking-tight text-foreground transition-opacity hover:opacity-80"
          >
            BloomEd
          </Link>
          <div className="order-3 flex w-full flex-wrap items-center justify-center gap-6 text-sm font-semibold text-muted-foreground sm:order-none sm:w-auto sm:flex-1 sm:justify-center">
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#faq" className="transition-colors hover:text-foreground">
              FAQ
            </a>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/sign-in?redirect_url=/dashboard"
              className="text-sm font-semibold text-foreground underline-offset-4 hover:underline"
            >
              Log in
            </Link>
            <Button asChild size="lg" variant="outline" className={cn(ctaPrimaryClass, "h-11 px-5 text-sm")}>
              <Link href="/sign-in?redirect_url=/onboarding">Get started</Link>
            </Button>
          </div>
        </nav>
      </header>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-20 px-4 pb-24 pt-10 sm:px-6 sm:gap-24 lg:gap-28 lg:px-8 lg:pb-32 lg:pt-16">
        {/* Hero */}
        <section className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16 xl:gap-20">
          <div className="flex flex-col gap-8">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-foreground bg-muted/50 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-[4px_4px_0_0_rgb(0_0_0)] dark:bg-muted/35">
              <SparklesIcon className="size-3.5 shrink-0" aria-hidden />
              AI-based adaptive learning
            </div>
            <div className="space-y-5">
              <h1 className="text-balance text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-[4.25rem] lg:leading-[1.05]">
                BloomEd
              </h1>
              <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl sm:leading-relaxed">
                The adaptive learning platform that meets you where you are—then scales with you.
                Surface strengths, close gaps, and study with clarity.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button asChild size="lg" variant="outline" className={cn(ctaPrimaryClass, "w-full sm:w-auto")}>
                <Link href="/sign-in?redirect_url=/onboarding">Get started</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className={cn(ctaOutlineClass, "w-full sm:w-auto")}>
                <Link href="#how-it-works">See how it works</Link>
              </Button>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              New here? Sign in securely, complete a short onboarding profile, then open your dashboard.
            </p>
          </div>
          <HeroGraphic />
        </section>

        {/* Features */}
        <section id="features" aria-labelledby="features-heading" className="scroll-mt-28">
          <div className="mb-12 text-center lg:mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Platform</p>
            <h2
              id="features-heading"
              className="mt-3 text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl"
            >
              Everything you need to learn smarter
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
              One stack for assessment, insight, and next steps—without noisy dashboards.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {features.map((f) => (
              <Card
                key={f.title}
                className="flex h-full flex-col border-2 border-foreground bg-card/85 shadow-[6px_6px_0_0_rgb(0_0_0)] backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-[8px_8px_0_0_rgb(0_0_0)] dark:bg-card/55"
              >
                <CardHeader className="gap-4 pb-2">
                  <div className="flex size-11 items-center justify-center rounded-lg border-2 border-foreground bg-primary text-primary-foreground shadow-[3px_3px_0_0_rgb(0_0_0)]">
                    <f.icon className="size-5" aria-hidden />
                  </div>
                  <CardTitle className="text-xl font-bold tracking-tight">{f.title}</CardTitle>
                  <CardDescription className="text-base leading-relaxed">{f.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* How it works — Z-pattern */}
        <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-28">
          <div className="mb-14 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Workflow</p>
            <h2 id="how-heading" className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              Three clear steps from first login to review you can act on.
            </p>
          </div>
          <div className="flex flex-col gap-16 lg:gap-24">
            {steps.map((s, i) => {
              const isOdd = i % 2 === 0;
              return (
                <div
                  key={s.title}
                  className={cn(
                    "grid items-center gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-20",
                    !isOdd && "lg:[&>div:first-child]:order-2",
                  )}
                >
                  <div className={cn("space-y-5", !isOdd && "lg:order-2")}>
                    <span className="inline-block border-2 border-foreground bg-muted/50 px-3 py-1 text-xs font-black uppercase tracking-widest text-foreground shadow-[3px_3px_0_0_rgb(0_0_0)] dark:bg-muted/30">
                      Step {s.step}
                    </span>
                    <div className="flex items-center gap-3">
                      <s.icon className="size-7 shrink-0 text-primary" aria-hidden />
                      <h3 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{s.title}</h3>
                    </div>
                    <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">{s.body}</p>
                  </div>
                  <StepVisual kind={s.visual} />
                </div>
              );
            })}
          </div>
        </section>

        {/* Why BloomEd — dark band */}
        <section
          className="relative -mx-4 border-y-2 border-foreground bg-foreground px-4 py-16 text-background sm:-mx-6 sm:px-8 lg:-mx-[max(0px,calc((100vw-72rem)/2+1rem))] lg:px-16 lg:py-20"
          aria-labelledby="why-heading"
        >
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_minmax(0,20rem)] lg:items-center lg:gap-16">
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm font-semibold text-background/90">
                <ShieldCheckIcon className="size-4 shrink-0" aria-hidden />
                Built for learners & educators
              </div>
              <h2 id="why-heading" className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">
                Why BloomEd
              </h2>
              <p className="max-w-xl text-base leading-relaxed text-background/85 sm:text-lg">
                Conversational profiling, structured content, and adaptive assessment in one place—so every session
                compounds, whether you&apos;re exam-focused or building long-term mastery.
              </p>
              <Button asChild variant="outline" size="lg" className={cn(ctaOnDarkClass, "w-full sm:w-auto")}>
                <Link href="/sign-up?redirect_url=/onboarding">Start learning</Link>
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:gap-5">
              <div className="border-2 border-background/35 bg-background/5 p-6 shadow-[4px_4px_0_0_rgb(255_255_255/0.15)] sm:p-8">
                <p className="text-4xl font-black tabular-nums tracking-tight sm:text-5xl">94%</p>
                <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-background/75">
                  Felt more prepared
                </p>
                <p className="mt-3 text-sm leading-relaxed text-background/65">
                  Learners report stronger confidence after structured adaptive runs.*
                </p>
              </div>
              <div className="border-2 border-background/35 bg-background/5 p-6 shadow-[4px_4px_0_0_rgb(255_255_255/0.15)] sm:p-8">
                <p className="text-4xl font-black tabular-nums tracking-tight sm:text-5xl">3.2×</p>
                <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-background/75">
                  Study efficiency
                </p>
                <p className="mt-3 text-sm leading-relaxed text-background/65">
                  Targeted practice vs. unfocused review—in pilot cohorts.*
                </p>
              </div>
            </div>
          </div>
          <p className="mx-auto mt-10 max-w-6xl text-xs text-background/50">
            *Illustrative metrics for positioning; replace with your validated numbers when available.
          </p>
        </section>

        {/* FAQ */}
        <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-28">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">FAQ</p>
            <h2 id="faq-heading" className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Common questions
            </h2>
          </div>
          <Accordion type="single" collapsible className="mx-auto max-w-3xl border-y-2 border-foreground">
            {faq.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-b-2 border-foreground last:border-b-0">
                <AccordionTrigger className="py-5 text-left text-base font-semibold hover:no-underline sm:py-6 sm:text-lg">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-base leading-relaxed text-muted-foreground sm:pb-6">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden rounded-2xl border-2 border-foreground bg-primary/10 p-10 text-center shadow-[8px_8px_0_0_rgb(0_0_0)] sm:p-14 dark:bg-primary/5">
          <div
            className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full border-2 border-foreground/20 bg-primary/20 blur-2xl"
            aria-hidden
          />
          <p className="relative text-xs font-semibold uppercase tracking-widest text-muted-foreground">Get started</p>
          <h2 className="relative mt-3 text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Ready to learn with signal—not noise?
          </h2>
          <p className="relative mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Adaptive tests, reports you can use, and roadmaps aligned to how you think—without the clutter.
          </p>
          <div className="relative mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Button asChild variant="outline" size="lg" className={cn(ctaPrimaryClass, "w-full sm:w-auto sm:min-w-[12rem]")}>
              <Link href="/sign-up?redirect_url=/onboarding">Get started free</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className={cn(ctaOutlineClass, "w-full sm:w-auto sm:min-w-[10rem]")}>
              <Link href="/sign-in?redirect_url=/dashboard">Sign in</Link>
            </Button>
          </div>
        </section>

        {/* Footer — full-bleed muted band */}
        <footer className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen border-t-2 border-foreground bg-muted/50 py-12 dark:bg-muted/20 sm:py-14">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:gap-12 lg:px-8">
            <div className="space-y-3">
              <p className="text-lg font-extrabold tracking-tight text-foreground">BloomEd</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Adaptive learning with Bloom-aligned practice and clear next steps.
              </p>
              <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} BloomEd. All rights reserved.</p>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-foreground">Product</p>
              <ul className="space-y-3 text-sm font-medium text-muted-foreground">
                <li>
                  <a href="#how-it-works" className="transition-colors hover:text-foreground">
                    How it works
                  </a>
                </li>
                <li>
                  <a href="#features" className="transition-colors hover:text-foreground">
                    Features
                  </a>
                </li>
                <li>
                  <Link href="/roadmap" className="transition-colors hover:text-foreground">
                    Roadmaps
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-foreground">Help</p>
              <ul className="space-y-3 text-sm font-medium text-muted-foreground">
                <li>
                  <Link href="/dashboard" className="transition-colors hover:text-foreground">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/explore" className="transition-colors hover:text-foreground">
                    Explore
                  </Link>
                </li>
                <li>
                  <Link href="/profile" className="transition-colors hover:text-foreground">
                    Profile
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-foreground">Connect</p>
              <ul className="space-y-3 text-sm font-medium text-muted-foreground">
                <li>
                  <a href="https://twitter.com" className="transition-colors hover:text-foreground" target="_blank" rel="noopener noreferrer">
                    Twitter / X
                  </a>
                </li>
                <li>
                  <a href="https://linkedin.com" className="transition-colors hover:text-foreground" target="_blank" rel="noopener noreferrer">
                    LinkedIn
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
