/**
 * Mirrors `backend_unified/services/trait_adapter_service.map_traits` so the UI and
 * explain/roadmap flows stay aligned with test-plan adaptation.
 */
export type MappedTraits = {
  learning_style: string;
  interaction_preference: "balanced" | "interactive" | "solitary";
  independence_level: "high" | "moderate" | "low";
  recommended_modes: string[];
};

export function mapTraitsFromPsychReport(
  profile: Record<string, unknown> | null | undefined,
): MappedTraits | null {
  if (!profile || typeof profile !== "object") return null;

  const traits: MappedTraits = {
    learning_style: "standard",
    interaction_preference: "balanced",
    independence_level: "moderate",
    recommended_modes: [],
  };

  const learning_profile = (profile.learning_profile as Record<string, unknown>) ?? {};
  const vark = (learning_profile.vark as Record<string, unknown>) ?? {};
  const big5 = (profile.big5_analysis as Record<string, unknown>) ?? {};

  const primary_vark = String(vark.primary_style ?? "Read/Write").toLowerCase();
  traits.learning_style = primary_vark;

  if (primary_vark === "visual" || primary_vark === "kinesthetic") {
    traits.recommended_modes.push("scenario-based");
  }

  const extraversion_score =
    (big5.extraversion as { score?: number } | undefined)?.score ?? 50;
  if (extraversion_score > 70) {
    traits.interaction_preference = "interactive";
    traits.recommended_modes.push("discussion-style");
  } else if (extraversion_score < 40) {
    traits.interaction_preference = "solitary";
    traits.recommended_modes.push("direct-query");
  }

  const grit =
    typeof learning_profile.grit_score === "number" ? learning_profile.grit_score : 50;
  const conscientiousness =
    (big5.conscientiousness as { score?: number } | undefined)?.score ?? 50;

  if (grit > 75 && conscientiousness > 75) {
    traits.independence_level = "high";
  } else if (grit < 40 || conscientiousness < 40) {
    traits.independence_level = "low";
  }

  return traits;
}

export function parseTraitProfileJson(raw: string | null | undefined): Record<string, unknown> | null {
  if (!raw?.trim()) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
