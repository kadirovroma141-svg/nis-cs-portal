import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "@/components/icons";
import { cn } from "@/lib/cn";

const styles = {
  info: { box: "border-info bg-info-soft text-info", Icon: Info },
  success: { box: "border-success bg-success-soft text-success", Icon: CheckCircle2 },
  warning: { box: "border-warning bg-warning-soft text-warning", Icon: AlertTriangle },
  danger: { box: "border-danger bg-danger-soft text-danger", Icon: XCircle },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: keyof typeof styles;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const { box, Icon } = styles[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-sm border-l-4 px-4 py-3 text-sm", box, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" weight="fill" aria-hidden />
      <div className="min-w-0 space-y-1">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className="text-fg/90">{children}</div>}
      </div>
    </div>
  );
}
