import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const base = process.env.BLOOM_API_URL ?? process.env.NEXT_PUBLIC_BLOOM_API_URL;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
  }
  if (!base) {
    return NextResponse.json(
      { detail: "BLOOM_API_URL is not configured" },
      { status: 500 },
    );
  }

  const incoming = await req.formData();
  const file = incoming.get("file");
  const fd = new FormData();
  if (file instanceof File && file.size > 0) {
    fd.append("file", file, file.name || "syllabus.bin");
  } else {
    const text = incoming.get("text");
    if (typeof text === "string" && text.trim().length > 0) {
      fd.append(
        "file",
        new Blob([text], { type: "text/plain" }),
        "syllabus.txt",
      );
    } else {
      return NextResponse.json(
        { detail: "Provide a file or non-empty text" },
        { status: 400 },
      );
    }
  }

  const r = await fetch(`${base.replace(/\/$/, "")}/api/syllabus/upload-syllabus`, {
    method: "POST",
    body: fd,
  });
  const data = await r.json().catch(() => ({}));
  return NextResponse.json(data, { status: r.status });
}
