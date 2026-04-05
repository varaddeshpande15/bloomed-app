"use client";

import { HistoryCard } from "@/components/history/historycard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { RoadmapHistoryItem } from "@/lib/types/history";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";
import Link from "next/link";

function HistorySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-xl border bg-card p-6 shadow"
        >
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="mt-3 h-4 w-1/2" />
          <Skeleton className="mt-4 h-8 w-20" />
          <Skeleton className="mt-6 h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function HistoryPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const queryClient = useQueryClient();

  const { data, isPending, error, isError } = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch("/api/v1/history", {
        credentials: "same-origin",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        items?: RoadmapHistoryItem[];
      };
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to load history");
      }
      return json.items ?? [];
    },
    enabled: Boolean(isLoaded && isSignedIn),
  });

  if (!isLoaded) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:py-20">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
          <History className="size-7 text-muted-foreground" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Your saved roadmaps
        </h1>
        <p className="mt-2 text-muted-foreground">
          Sign in to see roadmaps you&apos;ve saved to your history.
        </p>
        <Button asChild className="mt-8">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }

  const items = data ?? [];

  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-10">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          History
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Roadmaps you&apos;ve saved from the generator. Open one to keep
          learning, or remove it from this list anytime.
        </p>
      </header>

      {isPending ? (
        <HistorySkeleton />
      ) : isError ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error instanceof Error ? error.message : "Something went wrong."}
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/30 px-6 py-14 text-center">
          <p className="font-medium text-foreground">No saved roadmaps yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Generate a roadmap on the roadmap page and use{" "}
            <span className="font-medium">Save</span> to add it here.
          </p>
          <Button asChild className="mt-6" variant="secondary">
            <Link href="/roadmap">Go to roadmap</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 list-none gap-5 md:grid-cols-2 md:gap-6">
          {items.map((item) => (
            <li key={item.savedId}>
              <HistoryCard
                item={item}
                onRemoved={() => {
                  void queryClient.invalidateQueries({ queryKey: ["history"] });
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
