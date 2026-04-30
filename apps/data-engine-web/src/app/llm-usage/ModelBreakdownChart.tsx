"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { UsageByModel } from "@/lib/api";

export function ModelBreakdownChart({ data, noDataLabel }: { data: UsageByModel[]; noDataLabel: string }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--color-muted-fg)]">{noDataLabel}</p>;
  }
  const rows = data.map((d) => ({ model: d.model, cost: Number(d.cost_usd), calls: d.calls }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} layout="vertical" margin={{ left: 60 }}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v.toFixed(3)}`} />
        <YAxis dataKey="model" type="category" tick={{ fontSize: 11 }} width={120} />
        <Tooltip formatter={(v: number) => `$${v.toFixed(4)}`} />
        <Bar dataKey="cost" fill="#3b82f6" />
      </BarChart>
    </ResponsiveContainer>
  );
}
