import type { Campaign, CampaignKPIs, Insight } from "./types";

export function computeKPIs(rows: Campaign[]): CampaignKPIs {
  const impressions = sum(rows, "impressions");
  const clicks = sum(rows, "clicks");
  const leads = sum(rows, "leads");
  const conversions = sum(rows, "conversions");
  const cost = sum(rows, "cost_usd");
  const revenue = sum(rows, "revenue_usd");
  const uniqueIds = new Set(rows.map((r) => r.campaign_id));
  return {
    campaignCount: uniqueIds.size,
    totalRecords: rows.length,
    impressions,
    clicks,
    leads,
    conversions,
    cost,
    revenue,
    profit: revenue - cost,
    ctr: impressions ? (clicks / impressions) * 100 : 0,
    cpc: clicks ? cost / clicks : 0,
    cpa: conversions ? cost / conversions : 0,
    convRate: clicks ? (conversions / clicks) * 100 : 0,
    roas: cost ? revenue / cost : 0,
    roi: cost ? ((revenue - cost) / cost) * 100 : 0,
    avgRoi: rows.length ? rows.reduce((a, r) => a + (Number(r.roi) || 0), 0) / rows.length : 0,
  };
}

function sum<K extends keyof Campaign>(rows: Campaign[], key: K): number {
  return rows.reduce((a, r) => a + (Number(r[key]) || 0), 0);
}

export function computeKPIDeltas(rows: Campaign[]): Partial<Record<keyof CampaignKPIs, number>> {
  if (rows.length < 4) return {};
  const sorted = [...rows].sort(
    (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
  );
  const mid = Math.floor(sorted.length / 2);
  const first = sorted.slice(0, mid);
  const second = sorted.slice(mid);
  const k1 = computeKPIs(first);
  const k2 = computeKPIs(second);
  const delta = (a: number, b: number) => (a === 0 ? 0 : ((b - a) / a) * 100);
  return {
    campaignCount: delta(k1.campaignCount, k2.campaignCount),
    impressions: delta(k1.impressions, k2.impressions),
    clicks: delta(k1.clicks, k2.clicks),
    leads: delta(k1.leads, k2.leads),
    conversions: delta(k1.conversions, k2.conversions),
    cost: delta(k1.cost, k2.cost),
    revenue: delta(k1.revenue, k2.revenue),
    avgRoi: delta(k1.avgRoi, k2.avgRoi),
  };
}

export type ChannelStat = ReturnType<typeof channelStats>[number];

export function channelStats(rows: Campaign[]) {
  const byChannel = new Map<string, Campaign[]>();
  rows.forEach((r) => {
    if (!byChannel.has(r.channel)) byChannel.set(r.channel, []);
    byChannel.get(r.channel)!.push(r);
  });
  return Array.from(byChannel.entries()).map(([channel, rs]) => ({
    channel,
    ...computeKPIs(rs),
  }));
}

export function generateInsights(rows: Campaign[]): Insight[] {
  if (rows.length === 0) return [];
  const k = computeKPIs(rows);
  const stats = channelStats(rows);
  const insights: Insight[] = [];

  const byRoas = [...stats].sort((a, b) => b.roas - a.roas);
  const byRoi = [...stats].sort((a, b) => b.roi - a.roi);
  const byRevenue = [...stats].sort((a, b) => b.revenue - a.revenue);
  const byConv = [...stats].sort((a, b) => b.convRate - a.convRate);

  const best = byRoas[0];
  const worst = byRoas[byRoas.length - 1];
  const topRoi = byRoi[0];
  const lowRoi = byRoi[byRoi.length - 1];
  const topRev = byRevenue[0];

  if (best) {
    insights.push({
      tone: "good",
      category: "channel",
      title: `${best.channel} is your top-performing fashion channel`,
      body: `${best.channel} delivers ${best.roas.toFixed(2)}x ROAS on $${best.cost.toFixed(0)} spend and drove $${best.revenue.toFixed(0)} in revenue. Lean into this channel for upcoming collection launches.`,
    });
  }
  if (worst && stats.length > 1 && worst.channel !== best?.channel) {
    insights.push({
      tone: "warn",
      category: "channel",
      title: `${worst.channel} is underperforming`,
      body: `${worst.channel} returned only ${worst.roas.toFixed(2)}x ROAS with a ${worst.convRate.toFixed(2)}% conversion rate. Refresh creatives, audiences, and product feeds before next drop.`,
    });
  }
  if (topRoi && lowRoi && topRoi.channel !== lowRoi.channel) {
    insights.push({
      tone: "info",
      category: "budget",
      title: "Budget reallocation opportunity",
      body: `Shift 15–25% of ${lowRoi.channel} spend (ROI ${lowRoi.roi.toFixed(1)}%) into ${topRoi.channel} (ROI ${topRoi.roi.toFixed(1)}%). Projected lift on incremental revenue: $${Math.max(0, lowRoi.cost * 0.2 * (topRoi.roi / 100)).toFixed(0)}.`,
    });
  }
  if (byConv[0]) {
    insights.push({
      tone: "info",
      category: "conversion",
      title: `Optimize conversion paths via ${byConv[0].channel}`,
      body: `${byConv[0].channel} converts at ${byConv[0].convRate.toFixed(2)}% — well above the ${k.convRate.toFixed(2)}% portfolio average. Replicate its landing pages and product imagery across weaker channels.`,
    });
  }
  if (topRev) {
    insights.push({
      tone: "good",
      category: "revenue",
      title: "Revenue growth opportunity",
      body: `${topRev.channel} generated $${topRev.revenue.toFixed(0)} (${((topRev.revenue / Math.max(1, k.revenue)) * 100).toFixed(1)}% of total). Scale spend 20% during seasonal peaks (sales, fashion week, holiday).`,
    });
  }
  const riskChannels = stats.filter((s) => s.roas < 1);
  if (riskChannels.length) {
    insights.push({
      tone: "warn",
      category: "risk",
      title: "Campaign performance risk",
      body: `${riskChannels.length} channel${riskChannels.length === 1 ? "" : "s"} (${riskChannels.map((c) => c.channel).join(", ")}) ${riskChannels.length === 1 ? "is" : "are"} losing money (ROAS < 1x). Pause or rebuild creative immediately to protect margin.`,
    });
  }
  if (k.ctr < 1.5) {
    insights.push({
      tone: "warn",
      category: "conversion",
      title: "Engagement below fashion benchmarks",
      body: `Portfolio CTR is ${k.ctr.toFixed(2)}% — fashion benchmark is 1.5–3%. Test editorial imagery, model-on-figure shots, and shoppable video to lift engagement.`,
    });
  } else {
    insights.push({
      tone: "good",
      category: "general",
      title: "Strong creative performance",
      body: `Portfolio CTR of ${k.ctr.toFixed(2)}% beats the typical fashion ecommerce benchmark. Lock in winning creatives and document for the next collection.`,
    });
  }
  if (k.cpa > 0) {
    insights.push({
      tone: "info",
      category: "budget",
      title: "Lower CPA with audience layering",
      body: `Average CPA is $${k.cpa.toFixed(2)}. Layer in lookalikes of recent buyers and exclude existing customers to reduce CPA by an estimated 10–20%.`,
    });
  }
  if (k.roi !== 0) {
    insights.push({
      tone: k.roi > 0 ? "good" : "warn",
      category: "general",
      title: `Portfolio ROI is ${k.roi.toFixed(1)}%`,
      body:
        k.roi > 0
          ? `You earn $${(k.roi / 100).toFixed(2)} in profit for every $1 spent across the marketing portfolio. Double down on top channels heading into peak season.`
          : `The portfolio is unprofitable overall. Audit underperforming campaigns and re-baseline budgets before scaling.`,
    });
  }
  return insights;
}
