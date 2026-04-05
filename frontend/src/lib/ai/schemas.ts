import { z } from "zod";

export const moduleSchema = z.object({
  moduleName: z.string().min(1),
  moduleDescription: z.string().min(1),
  link: z.string().optional(),
});

/**
 * Array-shaped chapters (not `Record`) so JSON Schema gets `minItems` — models were returning `{}`
 * for open-ended objects. See https://sdk.vercel.ai/docs/ai-sdk-core/generating-structured-data
 */
const chapterBlockSchema = z.object({
  title: z.string().min(1),
  modules: z.array(moduleSchema).min(1),
});

/** Used with `generateObject` — avoid `.refine()` on the schema passed to the model. */
export const roadmapSchema = z.object({
  query: z.string().min(1),
  chapters: z.array(chapterBlockSchema).min(2),
});

export function isRoadmapContentSufficient(
  chapters: Array<{
    title: string;
    modules: Array<{
      moduleName: string;
      moduleDescription: string;
    }>;
  }>,
) {
  if (!Array.isArray(chapters) || chapters.length < 1) return false;
  return chapters.every(
    (ch) =>
      typeof ch.title === "string" &&
      ch.title.trim().length > 0 &&
      Array.isArray(ch.modules) &&
      ch.modules.length > 0 &&
      ch.modules.every(
        (m) =>
          m.moduleName.trim().length > 0 && m.moduleDescription.trim().length > 0,
      ),
  );
}

export const detailsSchema = z.object({
  description: z.string(),
  link: z.string().optional(),
  bulletPoints: z.array(z.string()).optional(),
});

export type RoadmapOutput = z.infer<typeof roadmapSchema>;
export type DetailsOutput = z.infer<typeof detailsSchema>;
