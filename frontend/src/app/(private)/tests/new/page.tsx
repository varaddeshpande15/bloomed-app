import { TestSessionWizard } from "@/components/tests/test-session-wizard";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

type Props = { searchParams: Promise<{ template?: string }> };

export default async function NewTestPage({ searchParams }: Props) {
  const user = await currentUser();
  if (!user) redirect("/sign-in?redirect_url=/tests/new");

  const sp = await searchParams;
  const template = sp.template?.trim() ?? null;

  return <TestSessionWizard templateKey={template} />;
}
