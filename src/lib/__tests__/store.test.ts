import { describe, it, expect } from "vitest";
import { parseCsvText } from "../store";

describe("parseCsvText — canonical template", () => {
  it("imports the standard template headers", () => {
    const csv = [
      "CampaignID,StartDate,EndDate,Channel,Impressions,Clicks,Leads,Conversions,Cost_USD,Revenue_USD,ROI",
      "CMP-1,2025-06-01,2025-06-30,Google Ads,20000,420,80,38,540.50,2300,325.5",
    ].join("\n");
    const r = parseCsvText(csv);
    expect(r.errors).toHaveLength(0);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].channel).toBe("Google Ads");
    expect(r.rows[0].cost_usd).toBe(540.5);
  });
});

describe("parseCsvText — real-world variations", () => {
  it("accepts aliased headers (Spend/Sales/Platform/Date)", () => {
    const csv = [
      "Campaign,Date,Platform,Impressions,Clicks,Conversions,Spend,Sales",
      "Spring Drop,2025-03-01,Meta,15000,300,25,250,1000",
    ].join("\n");
    const r = parseCsvText(csv);
    expect(r.errors).toHaveLength(0);
    expect(r.rows[0].channel).toBe("Meta");
    expect(r.rows[0].cost_usd).toBe(250);
    expect(r.rows[0].revenue_usd).toBe(1000);
    // ROI derived from cost & revenue
    expect(r.rows[0].roi).toBeCloseTo(300, 0);
  });

  it("strips currency symbols and thousands separators", () => {
    const csv = ["Channel,Cost,Revenue", 'Email,"$1,250.00","$7,500.00"'].join("\n");
    const r = parseCsvText(csv);
    expect(r.errors).toHaveLength(0);
    expect(r.rows[0].cost_usd).toBe(1250);
    expect(r.rows[0].revenue_usd).toBe(7500);
  });

  it("normalizes US-style MM/DD/YYYY dates", () => {
    const csv = ["Channel,Date,Cost,Revenue", "TikTok,06/15/2025,100,400"].join("\n");
    const r = parseCsvText(csv);
    expect(r.rows[0].start_date).toBe("2025-06-15");
  });

  it("fills missing channel and campaign id with safe defaults", () => {
    const csv = ["Cost,Revenue", "100,400"].join("\n");
    const r = parseCsvText(csv);
    expect(r.errors).toHaveLength(0);
    expect(r.rows[0].channel).toBe("Unknown");
    expect(r.rows[0].campaign_id).toMatch(/^CMP-/);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("errors clearly when no cost or revenue column exists", () => {
    const csv = ["Channel,Clicks", "Meta,500"].join("\n");
    const r = parseCsvText(csv);
    expect(r.rows).toHaveLength(0);
    expect(r.errors[0]).toMatch(/cost or revenue/i);
  });
});
