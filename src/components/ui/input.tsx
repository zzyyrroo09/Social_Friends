import React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input type={type} className={cn("flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm", className)} ref={ref} {...props} />
  )
);
Input.displayName = "Input";

