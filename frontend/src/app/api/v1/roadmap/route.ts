import { Node } from "@/lib/shared/types/common";
import { capitalize } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { getModel, type Provider } from "@/lib/ai";
import {
  isRoadmapContentSufficient,
  roadmapSchema,
  type RoadmapOutput,
} from "@/lib/ai/schemas";

const SYSTEM_PROMPT = `You are a helpful AI assistant that generates learning roadmaps as structured JSON only.

Rules:
- "query": short label for the roadmap topic.
- "chapters": ARRAY (not an object) of chapters in order beginner → advanced.
- Each chapter has "title" (string) and "modules" (array).
- Each module has "moduleName", "moduleDescription", optional "link" (Wikipedia when relevant).
- Follow the schema min lengths: at least 2 chapters; each chapter needs at least 1 module.

PLEASE REFRAIN FROM GENERATING ANY OBSCENE CONTENT AS THIS PLATFORM IS A LEARNING PLATFORM.`;

const ROADMAP_EXAMPLE = `
Example (replace with content for the user's topic):
{
  "query": "Web Development",
  "chapters": [
    {
      "title": "Foundations",
      "modules": [
        { "moduleName": "How the web works", "moduleDescription": "HTTP, browsers, DNS.", "link": "https://en.wikipedia.org/wiki/HTTP" }
      ]
    },
    {
      "title": "Core skills",
      "modules": [
        { "moduleName": "HTML structure", "moduleDescription": "Semantic markup and accessibility basics." }
      ]
    }
  ]
}`;

function buildRoadmapUserPrompt(topic: string, attempt: number) {
  const base = `Topic: "${topic}".

Return JSON matching the schema. The "chapters" field must be an ARRAY of objects with "title" and "modules" — not an empty object {}.`;

  if (attempt <= 1) {
    return `${base}\n\n${ROADMAP_EXAMPLE}`;
  }
  return `${base}

Your previous output was invalid or empty. Output a full roadmap with at least two chapters.
${ROADMAP_EXAMPLE}`;
}

export const POST = async (req: NextRequest) => {
  try {
    const provider = (req.nextUrl.searchParams.get("provider") ||
      "openai") as Provider;
    const apiKey = req.nextUrl.searchParams.get("apiKey");
    const body = await req.json();
    const query = body.query;

    if (!query) {
      return NextResponse.json(
        { status: false, message: "Please send query." },
        { status: 400 }
      );
    }

    // Get AI model based on provider
    const model = getModel(provider, apiKey);

    // Generate roadmap — retries if post-validation fails (should be rare with array schema + minItems).
    const maxAttempts = 3;
    let json: RoadmapOutput | undefined;
    let lastChaptersSnapshot = "";

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const { object } = await generateObject({
        model,
        schema: roadmapSchema,
        system: SYSTEM_PROMPT,
        prompt: buildRoadmapUserPrompt(query, attempt),
        temperature: attempt === 1 ? 0.25 : 0.55,
      });
      lastChaptersSnapshot = JSON.stringify(object.chapters);
      if (isRoadmapContentSufficient(object.chapters)) {
        json = object;
        break;
      }
    }

    if (!json) {
      return NextResponse.json(
        {
          status: false,
          message:
            "The model returned an empty roadmap after several tries. Try a more specific topic, or try again.",
          detail: `chapters was empty or missing modules. Last payload: ${lastChaptersSnapshot.slice(0, 2000)}`,
        },
        { status: 400 },
      );
    }

    // Transform to tree structure (chapters are an ordered array)
    const tree: Node[] = [
      {
        name: capitalize(json.query),
        children: json.chapters.map((ch) => ({
          name: ch.title,
          children: ch.modules.map(({ moduleName, link, moduleDescription }) => ({
            name: moduleName,
            moduleDescription,
            link,
          })),
        })),
      },
    ];

    return NextResponse.json(
      { status: true, text: json, tree },
      { status: 200 }
    );
  } catch (e) {
    console.error(e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        status: false,
        message:
          "An unexpected error occurred while generating roadmap. Please try again or use a different keyword/query.",
        detail,
      },
      { status: 400 }
    );
  }
};
