import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[var(--radius-md)] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]/90 px-4 py-2 text-sm text-[color:var(--color-text)] outline-none transition placeholder:text-[color:var(--color-text-muted)]/70 focus:border-[color:var(--color-brand)] focus:ring-2 focus:ring-[color:var(--color-brand)]/15",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
