import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Card, CardHeader } from "@/components/ui";
import { cn } from "@/lib/utils";

export function StatCard({ label, value, delta, icon: Icon, hint }: { label: string; value: ReactNode; delta?: string; icon?: LucideIcon; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{label}</span>
        {Icon && <Icon className="size-4" aria-hidden />}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div>
      {(delta || hint) && <div className="mt-1 text-xs text-muted">{delta ?? hint}</div>}
    </Card>
  );
}

export function KpiRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5 [&:has(>:nth-child(4):last-child)]:xl:grid-cols-4">{children}</div>;
}

export function ProgressBar({ value, className, tone = "primary" }: { value: number; className?: string; tone?: "primary" | "success" | "danger" }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const color = { primary: "bg-primary", success: "bg-success", danger: "bg-danger" }[v === 100 ? "success" : tone];
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn("h-full rounded-full", color)} style={{ width: `${v}%` }} />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-muted">{v}%</span>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <Inbox className="size-8 text-muted" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-border/60", className)} />;
}

export function ChartSkeleton() {
  return (
    <Card>
      <div className="border-b border-border px-5 py-3.5"><Skeleton className="h-4 w-40" /></div>
      <div className="p-5"><Skeleton className="h-56 w-full" /></div>
    </Card>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="p-5 space-y-3">
      <Skeleton className="h-4 w-48" />
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
    </Card>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

export type Column<T> = { header: string; cell: (row: T) => ReactNode; className?: string };

/** Server-rendered table. Pagination is link based (cursor in the URL). */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  empty = "Nothing here yet",
  footer,
}: {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  empty?: string;
  footer?: ReactNode;
}) {
  if (data.length === 0) return <EmptyState title={empty} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
            {columns.map((c) => (
              <th key={c.header} scope="col" className={cn("px-5 py-2.5 font-medium", c.className)}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={rowKey(row)} className="border-b border-border last:border-0 hover:bg-primary-soft/40">
              {columns.map((c) => (
                <td key={c.header} className={cn("px-5 py-2.5 align-middle", c.className)}>{c.cell(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {footer && <div className="border-t border-border px-5 py-3">{footer}</div>}
    </div>
  );
}

export function TableCard<T>(props: Parameters<typeof DataTable<T>>[0] & { title: ReactNode; action?: ReactNode; subtitle?: ReactNode }) {
  const { title, action, subtitle, ...rest } = props;
  return (
    <Card>
      <CardHeader title={title} action={action} subtitle={subtitle} />
      <DataTable {...rest} />
    </Card>
  );
}
