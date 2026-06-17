import { describe, it, expect } from "vitest";
import { normalCdf, twoProportionZTest, channelConversionSignificance } from "../stats";

describe("normalCdf", () => {
  it("is 0.5 at zero", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 3);
  });
  it("matches known quantiles", () => {
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 2);
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 2);
  });
});

describe("twoProportionZTest", () => {
  it("detects a clear, well-powered difference as significant", () => {
    // 10% vs 5% on large samples
    const r = twoProportionZTest(1000, 10000, 500, 10000);
    expect(r.significant).toBe(true);
    expect(r.direction).toBe("higher");
    expect(r.pValue).toBeLessThan(0.05);
  });

  it("does not flag identical rates as significant", () => {
    const r = twoProportionZTest(500, 10000, 500, 10000);
    expect(r.significant).toBe(false);
    expect(r.diffPct).toBeCloseTo(0, 5);
  });

  it("marks tiny samples as underpowered rather than significant", () => {
    const r = twoProportionZTest(2, 10, 1, 10);
    expect(r.underpowered).toBe(true);
    expect(r.significant).toBe(false);
  });
});

describe("channelConversionSignificance", () => {
  it("tests each channel leave-one-out vs the rest", () => {
    const rows = [
      { channel: "A", clicks: 10000, conversions: 1500 },
      { channel: "B", clicks: 10000, conversions: 500 },
    ];
    const res = channelConversionSignificance(rows);
    expect(res).toHaveLength(2);
    const a = res.find((r) => r.channel === "A")!;
    expect(a.test.direction).toBe("higher");
    expect(a.test.significant).toBe(true);
  });
});
