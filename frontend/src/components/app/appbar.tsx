"use client";

import { AppBarClerkAuth } from "@/components/app/app-bar-clerk-auth";
import { ModeToggle } from "@/components/app/mode-toggle";
import { Badge } from "@/components/ui/badge";
import { UserButton, useUser } from "@clerk/nextjs";
import { Coins } from "lucide-react";
import { Link } from "next-view-transitions";
import * as React from "react";

import { getUserCredits } from "@/actions/users";
import { isClerkConfigured } from "@/lib/clerk-config";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import MobileDrawer from "@/components/app/mobile-drawer";
import NeobrutalismButton from "@/components/ui/neobrutalism-button";

function AppBar() {
  const { user, isLoaded } = useUser();
  const [userCredits, setUserCredits] = React.useState<number | undefined>();
  /** Avoid Clerk SSR/client mismatch: `isLoaded` is often false on server and true on first client paint. */
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!user) {
      setUserCredits(undefined);
      return;
    }
    void getUserCredits().then(setUserCredits);
  }, [user]);

  if (!isClerkConfigured()) {
    return (
      <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-3 p-2">
          <Link href="/">
            <NeobrutalismButton>
              <span className="text-xl font-bold sm:text-2xl">BloomEd</span>
            </NeobrutalismButton>
          </Link>
          <ModeToggle />
        </div>
      </div>
    );
  }

  /** Server + first client paint: stable guest-shaped shell (matches post-hydration loading state layout). */
  if (!mounted) {
    return (
      <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-3 p-2">
          <Link href="/">
            <NeobrutalismButton>
              <span className="text-xl font-bold sm:text-2xl">BloomEd</span>
            </NeobrutalismButton>
          </Link>
          <ModeToggle />
          <div className="h-9 w-32 shrink-0" aria-hidden />
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-3 p-2">
          <Link href="/">
            <NeobrutalismButton>
              <span className="text-xl font-bold sm:text-2xl">BloomEd</span>
            </NeobrutalismButton>
          </Link>
          <ModeToggle />
          <div
            className="h-9 w-32 shrink-0 animate-pulse rounded-md bg-muted"
            aria-busy
          />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-3 p-2">
          <Link href="/">
            <NeobrutalismButton>
              <span className="text-xl font-bold sm:text-2xl">BloomEd</span>
            </NeobrutalismButton>
          </Link>
          <ModeToggle />
          <AppBarClerkAuth />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3 p-2">
        <div className="flex w-10 shrink-0 items-center md:w-12">
          <span className="md:hidden">
            <MobileDrawer />
          </span>
        </div>
        <div className="flex min-w-0 flex-1 justify-center px-2">
          <Link href="/" className="inline-flex max-w-full">
            <NeobrutalismButton>
              <span className="truncate px-2 text-xl font-bold tracking-tight sm:px-4 sm:text-2xl">
                BloomEd
              </span>
            </NeobrutalismButton>
          </Link>
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <ModeToggle />
          <TooltipProvider>
            <Tooltip delayDuration={250}>
              <TooltipTrigger asChild>
                <Badge
                  className="cursor-default"
                  variant={
                    userCredits !== undefined && userCredits > 0
                      ? "outline"
                      : "destructive"
                  }
                >
                  {userCredits ?? "—"} <Coins size={16} />
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Credits Remaining</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <UserButton />
        </div>
      </div>
    </div>
  );
}

export default AppBar;
