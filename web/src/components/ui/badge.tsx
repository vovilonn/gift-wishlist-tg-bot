import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "../../lib/cn";

const badgeVariants = cva("ui-badge", {
  variants: {
    variant: {
      neutral: "ui-badge--neutral",
      success: "ui-badge--success",
      warning: "ui-badge--warning",
      accent: "ui-badge--accent",
      muted: "ui-badge--muted"
    }
  },
  defaultVariants: {
    variant: "neutral"
  }
});

type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);
