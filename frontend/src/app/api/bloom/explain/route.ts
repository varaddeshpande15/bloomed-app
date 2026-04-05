import { auth } from "@clerk/nextjs/server";
import { generateText } from "ai";
import { getModel } from "@/lib/ai";
import type { MappedTraits } from "@/lib/map-traits";
import { explainAdaptationInstructions } from "@/lib/trait-copy";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GROQ_API_KEY?.trim()) {
    return NextResponse.json(
      { detail: "GROQ_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const questionText = String((body as { questionText?: string }).questionText ?? "");
  const correctAnswer = String((body as { correctAnswer?: string }).correctAnswer ?? "");
  const explanation = String((body as { explanation?: string }).explanation ?? "");
  const mappedTraits = (body as { mappedTraits?: MappedTraits | null }).mappedTraits ?? null;

  if (!questionText.trim()) {
    return NextResponse.json({ detail: "questionText required" }, { status: 400 });
  }

  try {
    const adaptation = explainAdaptationInstructions(mappedTraits);

    const { text } = await generateText({
      model: getModel("groq"),
      prompt: `You are a patient tutor. The student is reviewing this multiple-choice question.

Personalization (follow closely):
${adaptation}

Question:
${questionText}

Correct option/answer: ${correctAnswer}

Existing short explanation:
${explanation || "(none)"}

Write a deeper explanation (200–400 words): why the correct answer is right, common misconceptions, and one concrete study tip. Use clear headings with markdown (##).`,
    });

    return NextResponse.json({ text });
  } catch (e) {
    console.error("explain route:", e);
    return NextResponse.json(
      { detail: e instanceof Error ? e.message : "Generation failed" },
      { status: 500 },
    );
  }
}
