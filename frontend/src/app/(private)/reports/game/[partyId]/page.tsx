import { getGameReportDetailForViewer } from "@/actions/quiz-party";
import { GameReportDetail } from "@/components/reports/game-report-detail";
import { notFound } from "next/navigation";

export default async function GameReportPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId } = await params;
  const data = await getGameReportDetailForViewer(partyId);
  if (!data?.report) notFound();

  return (
    <GameReportDetail
      report={data.report}
      myAnswers={data.myAnswers}
      partyCode={data.party.code}
      finishedAt={data.party.finishedAt?.toISOString() ?? null}
    />
  );
}
