import { describe, it, expect } from "vitest";
import { linreg, forecastRevenue, seasonalIndex, type MonthlyPoint } from "../forecast";

describe("linreg", () => {
  it("recovers a perfect linear relationship", () => {
    const { slope, intercept, r2 } = linreg([2, 4, 6, 8]); // y = 2x + 2
    expect(slope).toBeCloseTo(2, 5);
    expect(intercept).toBeCloseTo(2, 5);
    expect(r2).toBeCloseTo(1, 5);
  });
});

describe("forecastRevenue", () => {
  const history: MonthlyPoint[] = [
    { month: "2025-01", revenue: 1000 },
    { month: "2025-02", revenue: 1200 },
    { month: "2025-03", revenue: 1400 },
    { month: "2025-04", revenue: 1600 },
    { month: "2025-05", revenue: 1800 },
    { month: "2025-06", revenue: 2000 },
  ];

  it("projects the requested horizon beyond history", () => {
    const fc = forecastRevenue(history, 3);
    const forecasts = fc.points.filter((p) => p.isForecast);
    expect(forecasts).toHaveLength(3);
    expect(forecasts[0].month).toBe("2025-07");
    expect(forecasts[2].month).toBe("2025-09");
  });

  it("continues an upward trend upward", () => {
    const fc = forecastRevenue(history, 1);
    const next = fc.points.find((p) => p.isForecast)!;
    expect(next.fitted).toBeGreaterThan(2000);
    expect(fc.slope).toBeCloseTo(200, 0);
    expect(fc.reliable).toBe(true);
  });

  it("keeps prediction bounds ordered (lower <= fitted <= upper)", () => {
    const fc = forecastRevenue(history, 3);
    for (const p of fc.points) {
      expect(p.lower).toBeLessThanOrEqual(p.fitted + 1);
      expect(p.upper).toBeGreaterThanOrEqual(p.fitted - 1);
      expect(p.lower).toBeGreaterThanOrEqual(0);
    }
  });

  it("flags short histories as unreliable", () => {
    const fc = forecastRevenue(history.slice(0, 3), 3);
    expect(fc.reliable).toBe(false);
  });
});

describe("seasonalIndex", () => {
  it("produces an index near 1.0 for an on-trend series", () => {
    const history: MonthlyPoint[] = [
      { month: "2025-01", revenue: 1000 },
      { month: "2025-02", revenue: 1100 },
      { month: "2025-03", revenue: 1200 },
    ];
    const idx = seasonalIndex(history);
    expect(idx).toHaveLength(3);
    idx.forEach((s) => expect(s.index).toBeGreaterThan(0.9));
  });
});
