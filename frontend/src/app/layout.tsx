import Providers from "@/components/app/providers";
import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";
import { ShellWithTooltip } from "@/components/app/shell-with-tooltip";
import { syncClerkUserToDb } from "@/actions/sync-user";
import { MainShell } from "@/components/app/main-shell";

const nunito = Nunito({ subsets: ["latin"] });

/** Clerk `currentUser()` + DB sync need request context (not static prerender). */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.airoadmapgenerator.com/"),
  title: {
    default: "BloomEd — Adaptive learning",
    template: "%s · BloomEd",
  },
  description:
    "BloomEd is an AI-based adaptive learning platform with personalized roadmaps and psychological learning profiles.",
  openGraph: {
    url: "https://www.airoadmapgenerator.com/",
    images: "/opengraph-image.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await syncClerkUserToDb();

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${nunito.className} min-h-full antialiased`}>
        <ShellWithTooltip>
          <Providers>
            <NextTopLoader showSpinner={false} color="black" />
            <MainShell>{children}</MainShell>
          </Providers>
        </ShellWithTooltip>
      </body>
    </html>
  );
}
