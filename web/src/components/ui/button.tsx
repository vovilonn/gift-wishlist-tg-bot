import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

const buttonVariants = cva("ui-button", {
  variants: {
    variant: {
      default: "ui-button--default",
      secondary: "ui-button--secondary",
      outline: "ui-button--outline",
      destructive: "ui-button--destructive",
      ghost: "ui-button--ghost"
    },
    size: {
      sm: "ui-button--sm",
      md: "ui-button--md",
      lg: "ui-button--lg"
    }
  },
  defaultVariants: {
    variant: "default",
    size: "md"
  }
});

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export const Button = ({ className, variant, size, ...props }: ButtonProps) => (
  <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
);
