"use client";

import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="size-9 border-2 border-border" disabled>
        <span className="size-4" />
      </Button>
    );
  }
  const dark = resolvedTheme === "dark";
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-9 shrink-0 border-2 border-foreground shadow-[3px_3px_0_0_rgb(0_0_0)]"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label="Toggle dark mode"
    >
      {dark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
    </Button>
  );
}
