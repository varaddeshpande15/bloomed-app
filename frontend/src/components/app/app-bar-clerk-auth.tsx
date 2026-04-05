"use client";

import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import NeobrutalismButton from "@/components/ui/neobrutalism-button";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Client auth strip: avoids Sign-In modal when already signed in (Clerk single-session / no-op modal).
 * Uses full-page sign-in via redirect; refreshes the route after sign-in so the server AppBar can show nav + credits.
 */
export function AppBarClerkAuth() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const refreshedAfterSignIn = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || refreshedAfterSignIn.current) return;
    refreshedAfterSignIn.current = true;
    router.refresh();
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="ml-auto flex items-center gap-2">
      <SignedOut>
        <SignInButton mode="redirect" forceRedirectUrl="/">
          <NeobrutalismButton type="button">
            <span className="font-medium">Sign in</span>
          </NeobrutalismButton>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  );
}
