"use client";

import { TooltipProvider } from "@/components/ui/tooltip";

export function ShellWithTooltip({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TooltipProvider delayDuration={0}>{children}</TooltipProvider>;
}
