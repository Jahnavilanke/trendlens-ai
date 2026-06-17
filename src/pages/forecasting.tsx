import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Info } from "lucide-react";
import { useCampaigns } from "@/lib/store";
import { useFilteredCampaigns } from "@/lib/filters";
import { forecastRevenue, seasonalIndex, type MonthlyPoint } from "@/lib/forecast";
import { GlobalFilters } from "@/components/global-filters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from "@/components/ui";
import { fmtMoney } from "@/lib/format";
import { tooltipStyle } from "@/lib/chart";

export default function ForecastingPage() {
  const { campaigns } = useCampaigns();
  const filtered = useFilteredCampaigns(campaigns);

  const history: MonthlyPoint[] = useMemo(() => {
    const byMonth = new Map<string, number>();
    filtered.forEach((r) => {
      const m = (r.start_date || "").slice(0, 7);
      if (!m) return;
      byMonth.set(m, (byMonth.get(m) ?? 0) + Number(r.revenue_usd));
    });
    return Array.from(byMonth.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [filtered]);

  const fc = useMemo(() => forecastRevenue(history, 3), [history]);
  const seasonal = useMemo(() => seasonalIndex(history), [history]);

  // chart wants band as [lower, upper-lower] stacked areas; simpler: plot lower & upper lines + fitted
  const chartData = fc.points.map((p) => ({
    month: p.month,
    actual: p.actual,
    fitted: p.fitted,
    lower: p.lower,
    range: p.upper - p.lower,
  }));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Forecasting
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Revenue Projection</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          OLS linear trend with a 95% prediction interval from historical residuals.
        </p>
      </div>

      <GlobalFilters />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Projected · next {fc.horizon} months
            </p>
            <p className="mt-2 text-3xl font-semibold">{fmtMoney(fc.projectedTotal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Central estimate (trend line)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Trend</p>
            <p className="mt-2 text-3xl font-semibold">
              {fc.slope >= 0 ? "+" : ""}
              {fmtMoney(fc.slope)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Change in revenue per month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Model fit (R²)</p>
            <p className="mt-2 text-3xl font-semibold">{fc.r2.toFixed(2)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {fc.r2 > 0.6 ? "Strong linear trend" : fc.r2 > 0.3 ? "Moderate trend" : "Weak/noisy trend"}
            </p>
          </CardContent>
        </Card>
      </div>

      {!fc.reliable && (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          <Info className="h-4 w-4" />
          Fewer than 6 months of history — treat this projection as illustrative only.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Actual vs. Forecast</CardTitle>
          <CardDescription>
            Shaded band = 95% prediction interval · dashed line = trend/forecast
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.15)" />
              <XAxis dataKey="month" fontSize={11} tickMargin={6} />
              <YAxis fontSize={11} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, name: string) =>
                  name === "Interval base" ? "" : fmtMoney(v)
                }
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {/* invisible base + visible range = shaded prediction band */}
              <Area dataKey="lower" name="Interval base" stackId="band" stroke="none" fill="transparent" />
              <Area
                dataKey="range"
                name="95% interval"
                stackId="band"
                stroke="none"
                fill="hsl(220 90% 56%)"
                fillOpacity={0.12}
              />
              <Line type="monotone" dataKey="actual" name="Actual" stroke="hsl(220 90% 56%)" strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
              <Line type="monotone" dataKey="fitted" name="Trend / forecast" stroke="hsl(340 75% 55%)" strokeDasharray="5 4" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seasonal Index</CardTitle>
          <CardDescription>
            Average revenue relative to trend for each calendar month present in the data. Above 1.0 =
            historically over-indexes vs trend. Descriptive only — true seasonal modeling needs 2+ years.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {seasonal.map((s) => {
              const pct = (s.index - 1) * 100;
              const variant = pct > 8 ? "default" : pct < -8 ? "destructive" : "secondary";
              return (
                <Badge key={s.month} variant={variant as any} className="text-xs">
                  {s.label}: {pct >= 0 ? "+" : ""}
                  {pct.toFixed(0)}%
                </Badge>
              );
            })}
            {seasonal.length === 0 && (
              <span className="text-sm text-muted-foreground">Not enough data to compute.</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
