import React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea className={cn("flex min-h-[60px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm", className)} ref={ref} {...props} />
  )
);
Textarea.displayName = "Textarea";

