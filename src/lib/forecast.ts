// Revenue forecasting with honest uncertainty quantification.
//
// Method: ordinary least-squares linear trend on monthly revenue, with a 95%
// prediction interval derived from the standard error of historical residuals.
// The interval widens with forecast horizon. We deliberately do NOT fit a
// seasonal model — that needs 2+ full years of data — but we DO surface a
// descriptive seasonal index so the analyst can see which calendar months
// historically over/under-index against trend.

export type MonthlyPoint = { month: string; revenue: number };

export type ForecastPoint = {
  month: string;
  actual: number | null;
  fitted: number;
  lower: number;
  upper: number;
  isForecast: boolean;
};

export type ForecastResult = {
  points: ForecastPoint[];
  slope: number; // $/month trend
  r2: number; // goodness of fit
  residualStd: number;
  horizon: number;
  projectedTotal: number; // sum of forecast months
  reliable: boolean; // enough history to trust
};

export function linreg(y: number[]): { slope: number; intercept: number; r2: number } {
  const n = y.length;
  if (n < 2) return { slope: 0, intercept: y[0] ?? 0, r2: 0 };
  const xs = y.map((_, i) => i);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0,
    den = 0,
    tss = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (y[i] - my);
    den += (xs[i] - mx) ** 2;
    tss += (y[i] - my) ** 2;
  }
  const slope = den ? num / den : 0;
  const intercept = my - slope * mx;
  let rss = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * xs[i];
    rss += (y[i] - pred) ** 2;
  }
  const r2 = tss ? 1 - rss / tss : 0;
  return { slope, intercept, r2 };
}

function addMonths(ym: string, add: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + add, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function forecastRevenue(history: MonthlyPoint[], horizon = 3): ForecastResult {
  const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month));
  const y = sorted.map((m) => m.revenue);
  const n = y.length;
  const { slope, intercept, r2 } = linreg(y);

  // residual standard deviation (with small-sample correction)
  let rss = 0;
  for (let i = 0; i < n; i++) rss += (y[i] - (intercept + slope * i)) ** 2;
  const residualStd = n > 2 ? Math.sqrt(rss / (n - 2)) : 0;
  const z = 1.96; // ~95%

  const points: ForecastPoint[] = sorted.map((m, i) => {
    const fitted = intercept + slope * i;
    return {
      month: m.month,
      actual: m.revenue,
      fitted: +fitted.toFixed(0),
      lower: +Math.max(0, fitted - z * residualStd).toFixed(0),
      upper: +(fitted + z * residualStd).toFixed(0),
      isForecast: false,
    };
  });

  const lastMonth = sorted[n - 1]?.month ?? "2025-01";
  let projectedTotal = 0;
  for (let h = 1; h <= horizon; h++) {
    const idx = n - 1 + h;
    const fitted = Math.max(0, intercept + slope * idx);
    // interval widens with horizon
    const band = z * residualStd * Math.sqrt(1 + h / Math.max(1, n));
    projectedTotal += fitted;
    points.push({
      month: addMonths(lastMonth, h),
      actual: null,
      fitted: +fitted.toFixed(0),
      lower: +Math.max(0, fitted - band).toFixed(0),
      upper: +(fitted + band).toFixed(0),
      isForecast: true,
    });
  }

  return {
    points,
    slope,
    r2,
    residualStd,
    horizon,
    projectedTotal: +projectedTotal.toFixed(0),
    reliable: n >= 6,
  };
}

export type SeasonalIndex = { month: number; label: string; index: number; samples: number };

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Detrended seasonal index: for each calendar month, the average ratio of
 * actual revenue to the fitted trend. index 1.0 = on-trend, 1.3 = +30% vs trend.
 */
export function seasonalIndex(history: MonthlyPoint[]): SeasonalIndex[] {
  const sorted = [...history].sort((a, b) => a.month.localeCompare(b.month));
  const y = sorted.map((m) => m.revenue);
  const { slope, intercept } = linreg(y);

  const buckets = new Map<number, number[]>();
  sorted.forEach((m, i) => {
    const fitted = intercept + slope * i;
    if (fitted <= 0) return;
    const monthNum = Number(m.month.split("-")[1]);
    if (!buckets.has(monthNum)) buckets.set(monthNum, []);
    buckets.get(monthNum)!.push(m.revenue / fitted);
  });

  return Array.from(buckets.entries())
    .map(([month, ratios]) => ({
      month,
      label: MONTH_LABELS[month - 1],
      index: ratios.reduce((a, b) => a + b, 0) / ratios.length,
      samples: ratios.length,
    }))
    .sort((a, b) => a.month - b.month);
}
