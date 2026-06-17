import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useCampaigns } from "@/lib/store";
import { useFilteredCampaigns } from "@/lib/filters";
import { computeKPIs, channelStats } from "@/lib/kpis";
import { GlobalFilters } from "@/components/global-filters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";
import { fmtNum, fmtPct } from "@/lib/format";
import { tooltipStyle } from "@/lib/chart";

export default function AudiencePage() {
  const { campaigns } = useCampaigns();
  const filtered = useFilteredCampaigns(campaigns);
  const k = useMemo(() => computeKPIs(filtered), [filtered]);
  const stats = useMemo(() => channelStats(filtered), [filtered]);

  const funnel = [
    { stage: "Impressions", value: k.impressions },
    { stage: "Clicks", value: k.clicks },
    { stage: "Leads", value: k.leads },
    { stage: "Conversions", value: k.conversions },
  ];

  const byChannel = stats.map((s) => ({
    channel: s.channel,
    clicks: s.clicks,
    leads: s.leads,
    conversions: s.conversions,
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Audience Insights
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Funnel & Engagement</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How audiences move from impression to conversion.
        </p>
      </div>

      <GlobalFilters />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {funnel.map((f, i) => {
          const prev = i === 0 ? f.value : funnel[i - 1].value;
          const rate = i === 0 ? 100 : prev ? (f.value / prev) * 100 : 0;
          return (
            <Card key={f.stage}>
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{f.stage}</p>
                <p className="mt-2 text-2xl font-semibold">{fmtNum(f.value)}</p>
                {i > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fmtPct(rate)} of {funnel[i - 1].stage.toLowerCase()}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Engagement by Channel</CardTitle>
          <CardDescription>Clicks, leads and conversions side by side</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byChannel} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.15)" />
              <XAxis dataKey="channel" fontSize={11} tickMargin={6} />
              <YAxis fontSize={11} tickFormatter={fmtNum} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtNum(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="clicks" fill="hsl(220 90% 56%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="leads" fill="hsl(45 90% 50%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="conversions" fill="hsl(160 70% 45%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
