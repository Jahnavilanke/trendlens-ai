// Lightweight statistics helpers for marketing significance testing.
// No external deps — implements a normal CDF via the Abramowitz & Stegun erf approximation.

export function normalCdf(z: number): number {
  // erf approximation (max error ~1.5e-7)
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const erf =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-(z * z) / 2);
  const cdf = 0.5 * (1 + (z >= 0 ? erf : -erf));
  return cdf;
}

export type ZTestResult = {
  p1: number; // rate of group 1 (e.g. channel)
  p2: number; // rate of group 2 (e.g. rest of portfolio)
  diffPct: number; // (p1 - p2) in percentage points
  z: number;
  pValue: number; // two-sided
  significant: boolean; // at alpha
  direction: "higher" | "lower" | "flat";
  underpowered: boolean; // sample too small to trust
};

/**
 * Two-proportion z-test.
 * @param x1 successes in group 1 (e.g. conversions)
 * @param n1 trials in group 1 (e.g. clicks)
 * @param x2 successes in group 2
 * @param n2 trials in group 2
 * @param alpha significance level (default 0.05)
 */
export function twoProportionZTest(
  x1: number,
  n1: number,
  x2: number,
  n2: number,
  alpha = 0.05
): ZTestResult {
  const p1 = n1 ? x1 / n1 : 0;
  const p2 = n2 ? x2 / n2 : 0;
  const diffPct = (p1 - p2) * 100;

  // Rule-of-thumb for normal approximation validity.
  const underpowered =
    n1 < 30 || n2 < 30 || x1 < 5 || x2 < 5 || n1 - x1 < 5 || n2 - x2 < 5;

  const pPool = n1 + n2 ? (x1 + x2) / (n1 + n2) : 0;
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / n1 + 1 / n2));
  const z = se ? (p1 - p2) / se : 0;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  const significant = !underpowered && pValue < alpha;

  return {
    p1,
    p2,
    diffPct,
    z,
    pValue,
    significant,
    direction: p1 > p2 ? "higher" : p1 < p2 ? "lower" : "flat",
    underpowered,
  };
}

export type ChannelSignificance = {
  channel: string;
  convRate: number; // %
  test: ZTestResult;
};

/**
 * For each channel, test its conversion rate (conversions/clicks) against the
 * rest of the portfolio combined (leave-one-out).
 */
export function channelConversionSignificance(
  rows: { channel: string; clicks: number; conversions: number }[],
  alpha = 0.05
): ChannelSignificance[] {
  const channels = Array.from(new Set(rows.map((r) => r.channel)));
  const totalClicks = rows.reduce((a, r) => a + r.clicks, 0);
  const totalConv = rows.reduce((a, r) => a + r.conversions, 0);

  return channels
    .map((ch) => {
      const inCh = rows.filter((r) => r.channel === ch);
      const clicks = inCh.reduce((a, r) => a + r.clicks, 0);
      const conv = inCh.reduce((a, r) => a + r.conversions, 0);
      const restClicks = totalClicks - clicks;
      const restConv = totalConv - conv;
      const test = twoProportionZTest(conv, clicks, restConv, restClicks, alpha);
      return { channel: ch, convRate: clicks ? (conv / clicks) * 100 : 0, test };
    })
    .sort((a, b) => b.convRate - a.convRate);
}

export function formatPValue(p: number): string {
  if (p < 0.001) return "p < 0.001";
  if (p < 0.01) return `p = ${p.toFixed(3)}`;
  return `p = ${p.toFixed(2)}`;
}
