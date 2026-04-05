import { SignUp } from "@clerk/nextjs";

type Props = { searchParams: Promise<{ redirect_url?: string }> };

export default async function Page({ searchParams }: Props) {
  const { redirect_url } = await searchParams;
  const next = redirect_url?.trim() || "/dashboard";
  return <SignUp forceRedirectUrl={next} />;
}
