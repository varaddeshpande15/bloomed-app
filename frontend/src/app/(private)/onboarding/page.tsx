import { PsychOnboarding } from "@/components/onboarding/psych-onboarding";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getLatestPsychologicalReportForUser } from "@/actions/psych-profile";

export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in?redirect_url=/onboarding");

  const existing = await getLatestPsychologicalReportForUser();
  if (existing) redirect("/dashboard");

  const name =
    user.firstName ||
    user.username ||
    user.emailAddresses[0]?.emailAddress?.split("@")[0] ||
    "there";

  return (
    <div className="min-h-screen bg-background">
      <PsychOnboarding userName={name} />
    </div>
  );
}
