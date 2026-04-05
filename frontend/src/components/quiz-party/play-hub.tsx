"use client";

import { createQuizParty, joinQuizPartyByCode } from "@/actions/quiz-party";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gamepad2Icon, Loader2Icon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

export function PlayHub() {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function handleCreate() {
    setBusy(true);
    try {
      const r = await createQuizParty();
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success(`Party created! Code ${r.code}`);
      router.push(`/play/${r.id}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await joinQuizPartyByCode(code);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success("Joined the party!");
      router.push(`/play/${r.partyId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 px-4 py-10">
      <div className="text-center">
        <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-xl border-2 border-foreground bg-primary/15 shadow-[4px_4px_0_0_rgb(0_0_0)]">
          <Gamepad2Icon className="size-7" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">Play game</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Host a multiplayer quiz or join friends with a room code. Same questions, live leaderboard,
          bragging rights.
        </p>
      </div>

      <Card className="border-2 border-foreground shadow-[6px_6px_0_0_rgb(0_0_0)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UsersIcon className="size-5" />
            Create a room
          </CardTitle>
          <CardDescription>You become the host — share the code after setup.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            disabled={busy}
            onClick={() => void handleCreate()}
            className="w-full border-2 border-foreground font-semibold shadow-[4px_4px_0_0_rgb(0_0_0)]"
          >
            {busy ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Create party
          </Button>
        </CardContent>
      </Card>

      <Card className="border-2 border-foreground shadow-[6px_6px_0_0_rgb(0_0_0)]">
        <CardHeader>
          <CardTitle className="text-lg">Join with code</CardTitle>
          <CardDescription>Enter the 6-character code your host shared.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleJoin(e)} className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1 space-y-2">
              <Label htmlFor="code">Room code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="AB12X4"
                maxLength={8}
                className="border-2 font-mono text-lg tracking-widest"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={busy || code.trim().length < 4}
                variant="outline"
                className="w-full border-2 border-foreground sm:w-auto"
              >
                Join
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/dashboard" className="underline underline-offset-4">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
