import { describe, it, expect } from "vitest";
import { computeKPIs, channelStats, generateInsights } from "../kpis";
import type { Campaign } from "../types";

const row = (over: Partial<Campaign>): Campaign => ({
  id: "x",
  campaign_id: "CMP-1",
  start_date: "2025-01-01",
  end_date: "2025-01-31",
  channel: "Google Ads",
  impressions: 10000,
  clicks: 200,
  leads: 50,
  conversions: 20,
  cost_usd: 400,
  revenue_usd: 1600,
  roi: 300,
  ...over,
});

describe("computeKPIs", () => {
  it("computes core efficiency metrics correctly", () => {
    const k = computeKPIs([row({})]);
    expect(k.ctr).toBeCloseTo(2.0, 5); // 200/10000
    expect(k.cpc).toBeCloseTo(2.0, 5); // 400/200
    expect(k.cpa).toBeCloseTo(20.0, 5); // 400/20
    expect(k.convRate).toBeCloseTo(10.0, 5); // 20/200
    expect(k.roas).toBeCloseTo(4.0, 5); // 1600/400
    expect(k.roi).toBeCloseTo(300, 5); // (1600-400)/400*100
    expect(k.profit).toBe(1200);
  });

  it("returns zeros (no NaN/Infinity) for empty input", () => {
    const k = computeKPIs([]);
    for (const v of Object.values(k)) {
      expect(Number.isFinite(v)).toBe(true);
    }
    expect(k.ctr).toBe(0);
    expect(k.roas).toBe(0);
  });

  it("guards divide-by-zero when denominators are zero", () => {
    const k = computeKPIs([row({ clicks: 0, impressions: 0, conversions: 0, cost_usd: 0 })]);
    expect(k.ctr).toBe(0);
    expect(k.cpc).toBe(0);
    expect(k.cpa).toBe(0);
    expect(k.roas).toBe(0);
  });

  it("counts unique campaigns separately from records", () => {
    const k = computeKPIs([row({ campaign_id: "A" }), row({ campaign_id: "A" }), row({ campaign_id: "B" })]);
    expect(k.totalRecords).toBe(3);
    expect(k.campaignCount).toBe(2);
  });

  it("aggregates across rows", () => {
    const k = computeKPIs([row({ cost_usd: 100, revenue_usd: 300 }), row({ cost_usd: 100, revenue_usd: 100 })]);
    expect(k.cost).toBe(200);
    expect(k.revenue).toBe(400);
    expect(k.roas).toBeCloseTo(2.0, 5);
  });
});

describe("channelStats", () => {
  it("groups by channel and computes per-channel KPIs", () => {
    const stats = channelStats([
      row({ channel: "Meta", cost_usd: 100, revenue_usd: 400 }),
      row({ channel: "TikTok", cost_usd: 100, revenue_usd: 50 }),
    ]);
    expect(stats).toHaveLength(2);
    const meta = stats.find((s) => s.channel === "Meta")!;
    expect(meta.roas).toBeCloseTo(4.0, 5);
  });
});

describe("generateInsights", () => {
  it("returns no insights for empty data", () => {
    expect(generateInsights([])).toEqual([]);
  });

  it("flags a losing channel (ROAS < 1) as a risk", () => {
    const insights = generateInsights([
      row({ channel: "Display", cost_usd: 1000, revenue_usd: 500 }),
    ]);
    expect(insights.some((i) => i.category === "risk")).toBe(true);
  });
});
