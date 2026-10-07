import React from "react";
import { cn } from "@/lib/utils";

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn("inline-flex items-center justify-center rounded-md text-sm font-medium", className)} {...props} />
  )
);
Button.displayName = "Button";
