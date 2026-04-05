"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";
import { neobrutalism } from "@clerk/themes";
import { ThemeProvider } from "next-themes";
import { ViewTransitions } from "next-view-transitions";
import Script from "next/script";
import { ClerkUserSync } from "@/components/app/clerk-user-sync";

const queryClient = new QueryClient();

function Providers({ children }: { children: React.ReactNode }) {
  const clerkPk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const shell = (
    <ViewTransitions>
      <Toaster position="bottom-right" richColors duration={4000} />
      {children}
      {process.env.NEXT_PUBLIC_GA_ID ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
                `}
          </Script>
        </>
      ) : null}
    </ViewTransitions>
  );

  const themed = (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      {shell}
    </ThemeProvider>
  );

  return (
    <QueryClientProvider client={queryClient}>
      {clerkPk ? (
        <ClerkProvider
          publishableKey={clerkPk}
          afterSignOutUrl="/"
          appearance={{
            baseTheme: neobrutalism,
            variables: {
              colorPrimary: "hsl(var(--foreground))",
            },
          }}
        >
          <ClerkUserSync />
          {themed}
        </ClerkProvider>
      ) : (
        themed
      )}
    </QueryClientProvider>
  );
}

export default Providers;
