import { Link } from "react-router-dom";
import {
  DollarSign,
  MousePointerClick,
  Target,
  TrendingUp,
  Users,
  Percent,
  ArrowUpRight,
  Eye,
  Layers,
  Activity,
  CreditCard,
  Wallet,
  Database,
  Tag,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";

import { useCampaigns } from "@/lib/store";
import { computeKPIs, computeKPIDeltas, generateInsights, channelStats } from "@/lib/kpis";
import { useFilteredCampaigns } from "@/lib/filters";
import { KpiCard } from "@/components/kpi-card";
import { GlobalFilters } from "@/components/global-filters";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
} from "@/components/ui";
import { fmtMoney, fmtMoney2, fmtNum, fmtPct, fmtRoas, fmtDelta } from "@/lib/format";
import { CHANNEL_COLORS, tooltipStyle } from "@/lib/chart";

export default function Dashboard() {
  const { campaigns } = useCampaigns();
  const filtered = useFilteredCampaigns(campaigns);
  const k = computeKPIs(filtered);
  const d = computeKPIDeltas(filtered);
  const insights = generateInsights(filtered).slice(0, 3);

  const byMonth = new Map<string, { month: string; spend: number; revenue: number; conversions: number }>();
  filtered.forEach((r) => {
    const month = (r.start_date || "").slice(0, 7);
    if (!month) return;
    const cur = byMonth.get(month) ?? { month, spend: 0, revenue: 0, conversions: 0 };
    cur.spend += Number(r.cost_usd);
    cur.revenue += Number(r.revenue_usd);
    cur.conversions += Number(r.conversions);
    byMonth.set(month, cur);
  });
  const monthly = Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));

  const channelData = channelStats(filtered).map((c) => ({
    channel: c.channel,
    spend: +c.cost.toFixed(2),
    revenue: +c.revenue.toFixed(2),
    conversions: c.conversions,
    roi: +c.roi.toFixed(2),
  }));

  if (campaigns.length === 0) return <EmptyState />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Executive Dashboard
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Fashion Marketing Performance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmtNum(k.campaignCount)} campaigns · {fmtNum(k.totalRecords)} records · Local dataset
          </p>
        </div>
        <Button asChild>
          <Link to="/upload">Upload new data</Link>
        </Button>
      </div>

      <GlobalFilters />

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No campaigns match the current filters. Try widening the date range or selecting a
            different channel.
          </CardContent>
        </Card>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Volume Metrics
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Total Records" value={fmtNum(k.totalRecords)} icon={Database} />
              <KpiCard label="Unique Campaigns" value={fmtNum(k.campaignCount)} delta={fmtDelta(d.campaignCount)} icon={Layers} />
              <KpiCard label="Total Impressions" value={fmtNum(k.impressions)} delta={fmtDelta(d.impressions)} icon={Eye} />
              <KpiCard label="Total Clicks" value={fmtNum(k.clicks)} delta={fmtDelta(d.clicks)} icon={MousePointerClick} />
              <KpiCard label="Total Leads" value={fmtNum(k.leads)} delta={fmtDelta(d.leads)} icon={Users} />
              <KpiCard label="Total Conversions" value={fmtNum(k.conversions)} delta={fmtDelta(d.conversions)} icon={Target} />
              <KpiCard label="Total Cost" value={fmtMoney(k.cost)} delta={fmtDelta(d.cost)} icon={DollarSign} />
              <KpiCard label="Total Revenue" value={fmtMoney(k.revenue)} delta={fmtDelta(d.revenue)} icon={TrendingUp} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Efficiency Metrics
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <KpiCard label="CTR" value={fmtPct(k.ctr)} icon={Activity} />
              <KpiCard label="Conversion Rate" value={fmtPct(k.convRate)} icon={Target} />
              <KpiCard label="CPC" value={fmtMoney2(k.cpc)} icon={CreditCard} />
              <KpiCard label="CPA" value={fmtMoney2(k.cpa)} icon={Wallet} />
              <KpiCard label="ROAS" value={fmtRoas(k.roas)} icon={TrendingUp} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <KpiCard label="Average ROI" value={fmtPct(k.avgRoi, 1)} delta={fmtDelta(d.avgRoi)} icon={Percent} />
              <KpiCard label="Portfolio ROI" value={fmtPct(k.roi, 1)} icon={Tag} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Channel Breakdown
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <ChannelBarCard title="Revenue by Channel" description="Total revenue generated per channel" data={channelData} dataKey="revenue" valueFormatter={fmtMoney} yTickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
              <ChannelBarCard title="Cost by Channel" description="Total ad spend per channel" data={channelData} dataKey="spend" valueFormatter={fmtMoney} yTickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
              <ChannelBarCard title="Conversions by Channel" description="Total conversions per channel" data={channelData} dataKey="conversions" valueFormatter={fmtNum} yTickFormatter={fmtNum} />
              <ChannelBarCard title="ROI by Channel" description="Average ROI per channel" data={channelData} dataKey="roi" valueFormatter={(v) => fmtPct(v)} yTickFormatter={(v) => `${v}%`} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Monthly Trends
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Revenue Trend</CardTitle>
                  <CardDescription>Revenue aggregated by start month</CardDescription>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthly} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gRevMonth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(160 70% 45%)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="hsl(160 70% 45%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.15)" />
                      <XAxis dataKey="month" fontSize={11} tickMargin={6} />
                      <YAxis fontSize={11} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtMoney(v)} />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(160 70% 45%)" fill="url(#gRevMonth)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Conversion Trend</CardTitle>
                  <CardDescription>Conversions aggregated by start month</CardDescription>
                </CardHeader>
                <CardContent className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthly} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gConvMonth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(340 75% 55%)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="hsl(340 75% 55%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.15)" />
                      <XAxis dataKey="month" fontSize={11} tickMargin={6} />
                      <YAxis fontSize={11} tickFormatter={(v) => fmtNum(v)} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => fmtNum(v)} />
                      <Area type="monotone" dataKey="conversions" stroke="hsl(340 75% 55%)" fill="url(#gConvMonth)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </section>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>AI Insights</CardTitle>
                <CardDescription>Top recommendations based on your fashion marketing data</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/insights">
                  See all <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {insights.map((i, idx) => (
                <div key={idx} className="rounded-lg border bg-card p-4">
                  <Badge
                    variant={i.tone === "good" ? "default" : i.tone === "warn" ? "destructive" : "secondary"}
                    className="mb-2"
                  >
                    {i.tone === "good" ? "Opportunity" : i.tone === "warn" ? "Action needed" : "Tip"}
                  </Badge>
                  <p className="text-sm font-semibold">{i.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{i.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

type ChannelBarCardProps = {
  title: string;
  description: string;
  data: Array<{ channel: string; revenue: number; spend: number; conversions: number; roi: number }>;
  dataKey: "revenue" | "spend" | "conversions" | "roi";
  valueFormatter: (v: number) => string;
  yTickFormatter: (v: number) => string;
};

function ChannelBarCard({ title, description, data, dataKey, valueFormatter, yTickFormatter }: ChannelBarCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.15)" />
            <XAxis dataKey="channel" fontSize={11} tickMargin={6} />
            <YAxis fontSize={11} tickFormatter={yTickFormatter} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} formatter={(v: number) => valueFormatter(v)} />
            <Bar dataKey={dataKey} radius={[6, 6, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="rounded-full bg-primary/10 p-4 text-primary">
        <TrendingUp className="h-8 w-8" />
      </div>
      <h1 className="mt-4 text-2xl font-semibold">No campaign data yet</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Upload a CSV of your fashion marketing campaigns to see KPIs, channel performance, and
        AI-generated recommendations.
      </p>
      <Button asChild className="mt-6">
        <Link to="/upload">Upload campaign data</Link>
      </Button>
    </div>
  );
}
