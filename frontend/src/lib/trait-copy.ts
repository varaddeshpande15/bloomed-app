import type { MappedTraits } from "@/lib/map-traits";

/** Short, honest copy for “how we use your profile” (matches backend plan + explain tuning). */
export function traitAdaptationBullets(m: MappedTraits): string[] {
  const lines: string[] = [
    `Test plans weight question types toward your ${m.learning_style} preference and ${m.interaction_preference} study rhythm.`,
  ];
  for (const mode of m.recommended_modes) {
    lines.push(
      `Where the syllabus fits, we add ${mode} emphasis in generation and pacing.`,
    );
  }
  lines.push(
    `Expanded explanations (“More explanation”) follow your ${m.independence_level} independence — ${independenceBlurb(m.independence_level)}`,
  );
  return lines;
}

function independenceBlurb(level: MappedTraits["independence_level"]): string {
  if (level === "low") return "more scaffolding and smaller steps in “More explanation”.";
  if (level === "high") return "tighter, denser walkthroughs when you expand a solution.";
  return "balanced detail in expanded explanations.";
}

export function traitSummaryLine(m: MappedTraits): string {
  const modes = m.recommended_modes.length ? m.recommended_modes.join(", ") : "balanced mix";
  return `${m.learning_style} learner · ${m.interaction_preference} · ${m.independence_level} independence · ${modes}`;
}

/** Prompt addendum for /api/bloom/explain — keep in sync with user-facing copy. */
export function explainAdaptationInstructions(m: MappedTraits | null): string {
  if (!m) {
    return "Adapt explanation length to a general audience; clear and structured.";
  }
  const chunks: string[] = [
    `Learner profile: ${m.learning_style} modality; ${m.interaction_preference} interaction preference; ${m.independence_level} independence.`,
    `Recommended emphasis from profiling: ${m.recommended_modes.join(", ") || "standard mix"}.`,
  ];
  if (m.independence_level === "low") {
    chunks.push(
      "Use a supportive, step-by-step structure with numbered steps; avoid jumping to conclusions.",
    );
  } else if (m.independence_level === "high") {
    chunks.push(
      "Be concise and information-dense; optional brief extension for advanced nuance.",
    );
  } else {
    chunks.push("Balance intuition and rigor; one short analogy is enough.");
  }
  if (m.learning_style === "visual") {
    chunks.push("Include a brief visual analogy or describe a diagram that would clarify the idea.");
  }
  if (m.learning_style === "kinesthetic" || m.recommended_modes.includes("scenario-based")) {
    chunks.push("Anchor the explanation in a concrete scenario or worked example.");
  }
  if (m.learning_style === "auditory" || m.interaction_preference === "interactive") {
    chunks.push("Use conversational framing (e.g. ‘Notice that…’) where natural.");
  }
  if (m.interaction_preference === "solitary") {
    chunks.push("Prefer direct, minimal small-talk; focus on the logic chain.");
  }
  return chunks.join(" ");
}
