import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-[color,background-color,border-color,box-shadow,transform] duration-100 active:translate-x-px active:translate-y-px disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "border-2 border-ink bg-primary text-primary-fg shadow-[3px_3px_0_0_var(--ink)] hover:bg-primary-hover active:shadow-[1px_1px_0_0_var(--ink)]",
  secondary: "border-2 border-ink bg-surface text-fg hover:bg-accent-soft",
  ghost: "text-fg underline-offset-4 hover:bg-surface-2 hover:underline",
  danger: "border-2 border-ink bg-danger text-danger-fg shadow-[3px_3px_0_0_var(--ink)] hover:opacity-90 active:shadow-[1px_1px_0_0_var(--ink)]",
  success: "border-2 border-ink bg-success text-success-fg shadow-[3px_3px_0_0_var(--ink)] hover:opacity-90 active:shadow-[1px_1px_0_0_var(--ink)]",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base tracking-wide",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
