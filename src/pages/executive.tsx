import { useMemo } from "react";
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import { useCampaigns } from "@/lib/store";
import { useFilteredCampaigns } from "@/lib/filters";
import { computeKPIs, channelStats } from "@/lib/kpis";
import { GlobalFilters } from "@/components/global-filters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Badge } from "@/components/ui";
import { fmtMoney, fmtNum, fmtPct, fmtRoas } from "@/lib/format";

export default function ExecutivePage() {
  const { campaigns } = useCampaigns();
  const filtered = useFilteredCampaigns(campaigns);
  const k = useMemo(() => computeKPIs(filtered), [filtered]);
  const stats = useMemo(() => channelStats(filtered), [filtered]);

  const byRoas = [...stats].sort((a, b) => b.roas - a.roas);
  const best = byRoas[0];
  const worst = byRoas[byRoas.length - 1];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Executive Summary
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Portfolio Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A plain-language read on overall marketing performance.
        </p>
      </div>

      <GlobalFilters />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Revenue" value={fmtMoney(k.revenue)} icon={DollarSign} />
        <Stat label="Total Spend" value={fmtMoney(k.cost)} icon={DollarSign} />
        <Stat label="Portfolio ROAS" value={fmtRoas(k.roas)} icon={TrendingUp} />
        <Stat label="Conversions" value={fmtNum(k.conversions)} icon={Target} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>The story in three lines</CardTitle>
          <CardDescription>Auto-generated from the current selection</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed">
          <p>
            Across {fmtNum(k.campaignCount)} campaigns the portfolio spent{" "}
            <strong>{fmtMoney(k.cost)}</strong> and returned <strong>{fmtMoney(k.revenue)}</strong> in
            revenue — a portfolio ROAS of <strong>{fmtRoas(k.roas)}</strong> and ROI of{" "}
            <strong>{fmtPct(k.roi, 1)}</strong>.
          </p>
          <p>
            Engagement sits at a <strong>{fmtPct(k.ctr)}</strong> click-through rate, converting at{" "}
            <strong>{fmtPct(k.convRate)}</strong> for an average cost per acquisition of{" "}
            <strong>{fmtMoney(k.cpa)}</strong>.
          </p>
          {best && worst && (
            <p>
              <strong>{best.channel}</strong> is the standout at {fmtRoas(best.roas)} ROAS, while{" "}
              <strong>{worst.channel}</strong> lags at {fmtRoas(worst.roas)} and is the first place to
              look for optimization.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {best && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Top channel</CardTitle>
                <Badge>
                  <TrendingUp className="mr-1 h-3 w-3" /> Best ROAS
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{best.channel}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {fmtRoas(best.roas)} ROAS · {fmtMoney(best.revenue)} revenue · {fmtPct(best.convRate)} CvR
              </p>
            </CardContent>
          </Card>
        )}
        {worst && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Needs attention</CardTitle>
                <Badge variant="destructive">
                  <TrendingDown className="mr-1 h-3 w-3" /> Lowest ROAS
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{worst.channel}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {fmtRoas(worst.roas)} ROAS · {fmtMoney(worst.cost)} spend · {fmtPct(worst.convRate)} CvR
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
