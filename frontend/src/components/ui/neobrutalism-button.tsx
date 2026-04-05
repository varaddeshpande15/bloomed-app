import * as React from "react";

import { cn } from "@/lib/utils";

type NeobrutalismButtonProps = React.ComponentPropsWithoutRef<"button">;

const NeobrutalismButton = React.forwardRef<
  HTMLButtonElement,
  NeobrutalismButtonProps
>(({ children, className, type = "button", ...props }, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "group/button rounded-lg bg-[#222222] text-black",
        className,
      )}
      {...props}
    >
      <span
        className={
          "block -translate-x-1 -translate-y-1 rounded-lg border-2 border-[#222222] bg-white px-4 py-1 text-sm font-medium tracking-tight transition-all group-hover/button:-translate-y-2 group-active/button:translate-x-0 group-active/button:translate-y-0"
        }
      >
        {children}
      </span>
    </button>
  );
});

NeobrutalismButton.displayName = "NeobrutalismButton";

export default NeobrutalismButton;
