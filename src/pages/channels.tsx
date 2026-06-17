import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { useCampaigns } from "@/lib/store";
import { useFilteredCampaigns } from "@/lib/filters";
import { channelStats } from "@/lib/kpis";
import { channelConversionSignificance, formatPValue } from "@/lib/stats";
import { GlobalFilters } from "@/components/global-filters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from "@/components/ui";
import { fmtMoney, fmtNum, fmtPct, fmtRoas } from "@/lib/format";
import { CHANNEL_COLORS, tooltipStyle } from "@/lib/chart";

type Col = { key: string; label: string; fmt: (n: number) => string };
const COLS: Col[] = [
  { key: "cost", label: "Spend", fmt: fmtMoney },
  { key: "revenue", label: "Revenue", fmt: fmtMoney },
  { key: "conversions", label: "Conversions", fmt: fmtNum },
  { key: "convRate", label: "Conv. Rate", fmt: (n) => fmtPct(n) },
  { key: "ctr", label: "CTR", fmt: (n) => fmtPct(n) },
  { key: "roas", label: "ROAS", fmt: fmtRoas },
  { key: "roi", label: "ROI", fmt: (n) => fmtPct(n, 1) },
];

export default function ChannelsPage() {
  const { campaigns } = useCampaigns();
  const filtered = useFilteredCampaigns(campaigns);
  const stats = useMemo(() => channelStats(filtered), [filtered]);
  const significance = useMemo(() => channelConversionSignificance(filtered), [filtered]);
  const [sortKey, setSortKey] = useState("revenue");

  const sorted = [...stats].sort((a, b) => (b as any)[sortKey] - (a as any)[sortKey]);
  const chartData = sorted.map((s) => ({ channel: s.channel, roas: +s.roas.toFixed(2) }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Channel Performance
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Channel Comparison</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Efficiency and return across all marketing channels.
        </p>
      </div>

      <GlobalFilters />

      <Card>
        <CardHeader>
          <CardTitle>ROAS by Channel</CardTitle>
          <CardDescription>Return on ad spend, sorted high to low</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.15)" />
              <XAxis dataKey="channel" fontSize={11} tickMargin={6} />
              <YAxis fontSize={11} tickFormatter={(v) => `${v}x`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtRoas(v)} />
              <Bar dataKey="roas" radius={[6, 6, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversion-Rate Significance</CardTitle>
          <CardDescription>
            Two-proportion z-test of each channel's conversion rate vs. the rest of the portfolio
            (α = 0.05). Significance means the difference is unlikely to be noise — not that it is large.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3">Channel</th>
                <th className="px-4 py-3 text-right">Conv. Rate</th>
                <th className="px-4 py-3 text-right">vs Portfolio</th>
                <th className="px-4 py-3 text-right">Significance</th>
              </tr>
            </thead>
            <tbody>
              {significance.map((s) => {
                const t = s.test;
                const verdict = t.underpowered
                  ? { label: "Too few clicks", variant: "outline" as const }
                  : t.significant
                  ? t.direction === "higher"
                    ? { label: `Significantly higher (${formatPValue(t.pValue)})`, variant: "default" as const }
                    : { label: `Significantly lower (${formatPValue(t.pValue)})`, variant: "destructive" as const }
                  : { label: `Not significant (${formatPValue(t.pValue)})`, variant: "secondary" as const };
                return (
                  <tr key={s.channel} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-6 py-2.5 font-medium">{s.channel}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtPct(s.convRate)}</td>
                    <td
                      className={`px-4 py-2.5 text-right tabular-nums ${
                        t.diffPct > 0 ? "text-emerald-600" : t.diffPct < 0 ? "text-rose-600" : ""
                      }`}
                    >
                      {t.diffPct >= 0 ? "+" : ""}
                      {t.diffPct.toFixed(2)} pp
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Badge variant={verdict.variant}>{verdict.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Channel Metrics</CardTitle>
          <CardDescription>Click a column header to sort</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-3">Channel</th>
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => setSortKey(c.key)}
                    className={`cursor-pointer select-none px-4 py-3 text-right hover:text-foreground ${
                      sortKey === c.key ? "text-foreground" : ""
                    }`}
                  >
                    {c.label}
                    {sortKey === c.key ? " ↓" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s.channel} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="px-6 py-3 font-medium">
                    <span
                      className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                      style={{ background: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }}
                    />
                    {s.channel}
                  </td>
                  {COLS.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-right tabular-nums">
                      {c.fmt((s as any)[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
