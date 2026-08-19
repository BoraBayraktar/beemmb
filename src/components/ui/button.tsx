import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-md)] text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]/40 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-[color:var(--color-brand)] text-white hover:bg-[color:var(--color-brand-strong)]",
        secondary: "border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)]",
        outline:
          "border border-[color:var(--color-border)] bg-transparent text-[color:var(--color-text)] hover:bg-[color:var(--color-bg-soft)]",
        ghost: "text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-bg-soft)] hover:text-[color:var(--color-text)]",
        destructive: "bg-[color:var(--destructive)] text-[color:var(--destructive-foreground)] hover:opacity-95",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-5",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
