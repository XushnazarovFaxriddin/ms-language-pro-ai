"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { UsageTimeBucket } from "@/lib/api";

type Row = { bucket: string; [purpose: string]: number | string };

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export function TimeseriesChart({ data }: { data: UsageTimeBucket[] }) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-[var(--color-muted-fg)]">Ma&apos;lumot yo&apos;q</p>;
  }
  const purposes = Array.from(new Set(data.map((d) => d.purpose))).sort();
  const buckets = Array.from(new Set(data.map((d) => d.bucket))).sort();
  const rows: Row[] = buckets.map((b) => {
    const r: Row = { bucket: b };
    for (const p of purposes) r[p] = 0;
    return r;
  });
  const idx = new Map(rows.map((r, i) => [r.bucket, i]));
  for (const d of data) {
    const i = idx.get(d.bucket);
    if (i !== undefined) (rows[i]![d.purpose] as number) = Number(d.cost_usd);
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="bucket"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => new Date(v).toLocaleDateString("uz-UZ", { month: "short", day: "numeric" })}
        />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v.toFixed(3)}`} />
        <Tooltip
          formatter={(v: number) => `$${v.toFixed(4)}`}
          labelFormatter={(v: string) => new Date(v).toLocaleString("uz-UZ")}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {purposes.map((p, i) => (
          <Area
            key={p}
            type="monotone"
            dataKey={p}
            stackId="1"
            stroke={COLORS[i % COLORS.length]}
            fill={COLORS[i % COLORS.length]}
            fillOpacity={0.4}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
