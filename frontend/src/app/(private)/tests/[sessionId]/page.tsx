import {
  getBloomTestAttemptsForSession,
  getBloomTestSessionById,
} from "@/actions/bloom-test-session";
import { BloomReportDetail } from "@/components/reports/bloom-report-detail";
import { mapTraitsFromPsychReport, parseTraitProfileJson } from "@/lib/map-traits";
import { notFound } from "next/navigation";

export default async function TestSessionDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await getBloomTestSessionById(sessionId);
  if (!session) notFound();

  const attempts = await getBloomTestAttemptsForSession(sessionId);

  const traitParsed = parseTraitProfileJson(session.traitProfileJson);
  const mappedAtSession = traitParsed ? mapTraitsFromPsychReport(traitParsed) : null;

  return (
    <BloomReportDetail
      session={{
        id: session.id,
        templateKey: session.templateKey,
        examType: session.examType,
        targetQuestionCount: session.targetQuestionCount,
        status: session.status,
        createdAt: session.createdAt ? new Date(session.createdAt).toISOString() : null,
        reportJson: session.reportJson,
        markingSchemeJson: session.markingSchemeJson,
      }}
      attempts={attempts.map((a) => ({
        id: a.id,
        topic: a.topic,
        userAnswer: a.userAnswer,
        correctAnswer: a.correctAnswer,
        isCorrect: a.isCorrect,
        timeTakenSeconds: a.timeTakenSeconds,
        orderIndex: a.orderIndex,
      }))}
      mappedAtSession={mappedAtSession}
      backHref="/tests"
    />
  );
}
