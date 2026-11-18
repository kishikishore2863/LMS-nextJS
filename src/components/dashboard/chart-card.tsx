"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useRouter } from "next/navigation";
import { Card, CardHeader } from "@/components/ui";
import { EmptyState } from "./index";

type Series = { key: string; label: string; color: string };

const axis = { stroke: "var(--muted)", fontSize: 12, tickLine: false, axisLine: false };
const tooltipStyle = {
  contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--foreground)" },
  cursor: { fill: "var(--primary-soft)", opacity: 0.6 },
};

export function ChartCard({
  title,
  subtitle,
  type,
  data,
  xKey,
  series,
  height = 260,
  unit,
  horizontal,
  linkPrefix,
  linkKey,
}: {
  title: string;
  subtitle?: string;
  type: "line" | "bar" | "stackedBar";
  data: Record<string, string | number>[];
  xKey: string;
  series: Series[];
  height?: number;
  unit?: string;
  horizontal?: boolean;
  /** Clicking a bar navigates to `${linkPrefix}${row[linkKey]}` */
  linkPrefix?: string;
  linkKey?: string;
}) {
  const router = useRouter();
  const empty = data.length === 0 || data.every((d) => series.every((s) => !Number(d[s.key])));
  const onClick = linkPrefix && linkKey
    ? (d: unknown) => {
        const row = (d as { payload?: Record<string, string> })?.payload;
        if (row?.[linkKey]) router.push(`${linkPrefix}${row[linkKey]}`);
      }
    : undefined;

  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <div className="p-4" style={{ height: empty ? undefined : height }}>
        {empty ? (
          <EmptyState title="No data for this period" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {type === "line" ? (
              <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey={xKey} {...axis} minTickGap={24} />
                <YAxis {...axis} allowDecimals={false} unit={unit} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                {series.map((s) => (
                  <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            ) : (
              <BarChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 8, right: 12, left: horizontal ? 8 : -12, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" horizontal={!horizontal} vertical={!!horizontal} />
                {horizontal ? (
                  <>
                    <XAxis type="number" {...axis} allowDecimals={false} unit={unit} />
                    <YAxis type="category" dataKey={xKey} {...axis} width={150} tickFormatter={(v: string) => (v.length > 22 ? v.slice(0, 21) + "…" : v)} />
                  </>
                ) : (
                  <>
                    <XAxis dataKey={xKey} {...axis} tickFormatter={(v: string) => (String(v).length > 14 ? String(v).slice(0, 13) + "…" : v)} />
                    <YAxis {...axis} allowDecimals={false} unit={unit} />
                  </>
                )}
                <Tooltip {...tooltipStyle} />
                {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />}
                {series.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    fill={s.color}
                    stackId={type === "stackedBar" ? "a" : undefined}
                    radius={type === "stackedBar" ? (i === series.length - 1 ? [4, 4, 0, 0] : 0) : horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                    maxBarSize={36}
                    onClick={onClick}
                    cursor={onClick ? "pointer" : undefined}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
