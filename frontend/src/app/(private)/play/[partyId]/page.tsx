import { getQuizPartySnapshot } from "@/actions/quiz-party";
import { QuizPartyRoom } from "@/components/quiz-party/quiz-party-room";
import { notFound } from "next/navigation";

export default async function QuizPartyPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId } = await params;
  const initial = await getQuizPartySnapshot(partyId);
  if (!initial) notFound();

  return <QuizPartyRoom partyId={partyId} initial={initial} />;
}
