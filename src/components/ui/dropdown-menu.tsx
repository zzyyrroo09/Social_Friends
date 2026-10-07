import React from "react";

export const DropdownMenu = ({ children }: { children: React.ReactNode }) => <div className="relative inline-block text-left">{children}</div>;
export const DropdownMenuTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }>(
  ({ asChild, ...props }, ref) => (
    <button ref={ref} {...props} />
  )
);
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";
export const DropdownMenuContent = ({ children, className }: { children: React.ReactNode; className?: string; align?: string }) => (
  <div className={`absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none ${className}`}>{children}</div>
);
export const DropdownMenuItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { disabled?: boolean }>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={`block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 ${className}`} {...props} />
  )
);
DropdownMenuItem.displayName = "DropdownMenuItem";

