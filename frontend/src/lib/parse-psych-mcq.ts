/**
 * Parse PsychAgent MCQ assistant messages (A–D lines) for button UI.
 */
export function parsePsychMcq(assistantText: string): {
  question: string;
  options: { key: string; label: string }[];
} | null {
  const text = assistantText.trim();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const optionRe = /^([A-D])[\).\:\s]\s*(.+)$/i;
  const options: { key: string; label: string }[] = [];
  const questionParts: string[] = [];
  for (const line of lines) {
    const m = line.match(optionRe);
    if (m) {
      options.push({ key: m[1].toUpperCase(), label: m[2].trim() });
    } else if (options.length === 0) {
      questionParts.push(line);
    }
  }
  if (options.length >= 2) {
    return { question: questionParts.join(" "), options };
  }

  // Fallback: inline options on one line
  const inline = text.matchAll(/\b([A-D])[\).]\s*([^A-D]+?)(?=\s+[A-D][\).]|$)/gi);
  const inlineOpts = [...inline];
  if (inlineOpts.length >= 2) {
    const opts = inlineOpts.map((m) => ({
      key: m[1].toUpperCase(),
      label: m[2].trim(),
    }));
    const question = text
      .replace(/\b[A-D][\).][\s\S]*$/, "")
      .replace(/\s+[A-D][\).][\s\S]*$/, "")
      .trim();
    return { question: question || text, options: opts };
  }

  return null;
}

export function shouldOfferReport(assistantText: string): boolean {
  const t = assistantText.toLowerCase();
  return (
    t.includes("type 'report'") ||
    t.includes('type "report"') ||
    t.includes("type report whenever") ||
    t.includes("whenever you're ready") ||
    t.includes("when youre ready")
  );
}
