import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Papa from "papaparse";
import type { Campaign } from "./types";
import { SAMPLE_CAMPAIGNS } from "./sample-data";

const STORAGE_KEY = "trendlens.campaigns.v1";
const SOURCE_KEY = "trendlens.source.v1";

// Canonical template headers (shown on the Upload page reference table).
export const COLUMN_MAP: Record<string, keyof Campaign> = {
  CampaignID: "campaign_id",
  StartDate: "start_date",
  EndDate: "end_date",
  Channel: "channel",
  Impressions: "impressions",
  Clicks: "clicks",
  Leads: "leads",
  Conversions: "conversions",
  Cost_USD: "cost_usd",
  Revenue_USD: "revenue_usd",
  ROI: "roi",
};

// Forgiving header aliases. Keys are NORMALIZED (lowercase, alphanumeric only).
// Many real marketing exports use different names — this maps them all.
const HEADER_ALIASES: Record<string, keyof Campaign> = {
  campaignid: "campaign_id", campaign: "campaign_id", campaignname: "campaign_id", campaignids: "campaign_id",
  startdate: "start_date", start: "start_date", date: "start_date", begindate: "start_date", datestart: "start_date",
  enddate: "end_date", end: "end_date", finishdate: "end_date", dateend: "end_date", stopdate: "end_date",
  channel: "channel", channelused: "channel", platform: "channel", source: "channel", medium: "channel",
  marketingchannel: "channel", channelname: "channel",
  impressions: "impressions", impression: "impressions", impr: "impressions", views: "impressions", reach: "impressions",
  clicks: "clicks", click: "clicks", linkclicks: "clicks",
  leads: "leads", lead: "leads", leadcount: "leads",
  conversions: "conversions", conversion: "conversions", conv: "conversions",
  purchases: "conversions", orders: "conversions", totalconversions: "conversions", conversioncount: "conversions",
  cost: "cost_usd", costusd: "cost_usd", spend: "cost_usd", spendusd: "cost_usd", adspend: "cost_usd",
  amountspent: "cost_usd", acquisitioncost: "cost_usd", totalcost: "cost_usd", marketingspend: "cost_usd", budgetspent: "cost_usd",
  revenue: "revenue_usd", revenueusd: "revenue_usd", totalrevenue: "revenue_usd", sales: "revenue_usd",
  salesrevenue: "revenue_usd", grossrevenue: "revenue_usd", income: "revenue_usd",
  roi: "roi", returnoninvestment: "roi",
};

const NUMERIC: (keyof Campaign)[] = [
  "impressions", "clicks", "leads", "conversions", "cost_usd", "revenue_usd", "roi",
];

type Source = "sample" | "user";

type Ctx = {
  campaigns: Campaign[];
  loading: boolean;
  isSample: boolean;
  replaceAll: (rows: Campaign[]) => void;
  resetToSample: () => void;
  clearAll: () => void;
};

const CampaignContext = createContext<Ctx | null>(null);

function load(): { rows: Campaign[]; source: Source } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const src = (localStorage.getItem(SOURCE_KEY) as Source) || "sample";
    if (raw) return { rows: JSON.parse(raw) as Campaign[], source: src };
  } catch {
    /* ignore */
  }
  return { rows: SAMPLE_CAMPAIGNS, source: "sample" };
}

function persist(rows: Campaign[], source: Source) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
    localStorage.setItem(SOURCE_KEY, source);
  } catch {
    /* ignore quota errors */
  }
}

export type ParseResult = {
  rows: Campaign[];
  errors: string[]; // fatal — nothing imported
  warnings: string[]; // non-fatal — imported but flagged
  missingHeaders: string[]; // canonical headers not detected (informational)
};

const normalize = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

function parseNumber(v: string | undefined): number {
  if (v === undefined || v === null) return 0;
  const cleaned = String(v).replace(/[$£€,%\s]/g, "");
  if (cleaned === "") return 0;
  const n = Number(cleaned);
  return Number.isNaN(n) ? NaN : n;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(v: string | undefined): { iso: string; ok: boolean } {
  if (!v) return { iso: "", ok: true };
  const s = v.trim();
  if (ISO_RE.test(s)) return { iso: s, ok: true };
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // MM/DD/YYYY (US)
  if (m) {
    const [, mm, dd, yyyy] = m;
    return { iso: `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`, ok: true };
  }
  m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/); // YYYY/MM/DD
  if (m) {
    const [, yyyy, mm, dd] = m;
    return { iso: `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`, ok: true };
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return { iso: new Date(t).toISOString().slice(0, 10), ok: true };
  return { iso: s, ok: false };
}

export function parseCsvText(text: string): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const presentHeaders = parsed.meta?.fields ?? [];

  // Resolve each canonical field to an actual header in the file (first match wins).
  const resolved: Partial<Record<keyof Campaign, string>> = {};
  for (const header of presentHeaders) {
    const field = HEADER_ALIASES[normalize(header)];
    if (field && !resolved[field]) resolved[field] = header;
  }

  const missingHeaders = Object.values(COLUMN_MAP).filter(
    (f, idx, arr) => arr.indexOf(f) === idx && !resolved[f]
  ).map((f) => f);

  // Hard requirement: we need at least cost or revenue to compute anything meaningful.
  if (!resolved.cost_usd && !resolved.revenue_usd) {
    errors.push(
      `Couldn't find a cost or revenue column. Detected headers: ${presentHeaders.join(", ") || "(none)"}.`
    );
    return { rows: [], errors, warnings, missingHeaders };
  }

  const rows: Campaign[] = [];
  const seen = new Map<string, number>();
  let negativeCount = 0;
  let convertedDates = 0;
  let badDateCount = 0;
  let roiComputed = 0;

  (parsed.data || []).forEach((raw, i) => {
    const line = i + 2;
    const get = (f: keyof Campaign) => (resolved[f] ? raw[resolved[f]!] : undefined);

    const row: Partial<Campaign> = { id: `csv-${Date.now()}-${i}` };

    row.campaign_id = (get("campaign_id") ?? "").trim() || `CMP-${String(i + 1).padStart(3, "0")}`;
    row.channel = (get("channel") ?? "").trim() || "Unknown";

    const sd = parseDate(get("start_date"));
    const ed = parseDate(get("end_date"));
    if (!sd.ok) badDateCount++;
    else if (get("start_date") && !ISO_RE.test(String(get("start_date")).trim())) convertedDates++;
    row.start_date = sd.iso;
    row.end_date = ed.iso;

    for (const f of NUMERIC) {
      const n = parseNumber(get(f));
      if (Number.isNaN(n)) {
        warnings.push(`Row ${line}: "${resolved[f]}" = "${get(f)}" isn't a number — treated as 0.`);
        (row as any)[f] = 0;
      } else {
        if (n < 0) negativeCount++;
        (row as any)[f] = n;
      }
    }

    // Derive ROI if the column is absent but cost is present.
    if (!resolved.roi && (row.cost_usd ?? 0) > 0) {
      row.roi = (((row.revenue_usd ?? 0) - (row.cost_usd ?? 0)) / (row.cost_usd ?? 1)) * 100;
      roiComputed++;
    }

    seen.set(row.campaign_id, (seen.get(row.campaign_id) ?? 0) + 1);
    rows.push(row as Campaign);
  });

  if (rows.length === 0) {
    errors.push("No data rows found in the file.");
    return { rows, errors, warnings, missingHeaders };
  }

  // Informational warnings (do NOT block import).
  if (!resolved.channel) warnings.push("No channel column detected — all rows labeled “Unknown”.");
  if (!resolved.campaign_id) warnings.push("No campaign-ID column detected — generated sequential IDs.");
  if (!resolved.start_date) warnings.push("No date column detected — monthly trends and date filters will be limited.");
  if (!resolved.conversions) warnings.push("No conversions column detected — conversion-based metrics will read 0.");
  if (!resolved.clicks) warnings.push("No clicks column detected — CTR/CPC will read 0.");
  if (roiComputed) warnings.push(`ROI not in file — computed from cost & revenue for ${roiComputed} row(s).`);
  if (convertedDates) warnings.push(`${convertedDates} date(s) converted to YYYY-MM-DD format.`);
  if (badDateCount) warnings.push(`${badDateCount} date(s) couldn't be parsed — left as-is.`);
  if (negativeCount) warnings.push(`${negativeCount} negative value(s) detected — verify these are intentional.`);
  const dupes = Array.from(seen.entries()).filter(([, c]) => c > 1);
  if (dupes.length) warnings.push(`${dupes.length} campaign ID(s) repeat (e.g. ${dupes[0][0]}) — kept as separate rows.`);
  if (parsed.errors?.length) {
    parsed.errors.slice(0, 3).forEach((e) => warnings.push(`Parser note (row ${e.row}): ${e.message}`));
  }

  return { rows, errors, warnings, missingHeaders };
}

export function CampaignProvider({ children }: { children: ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isSample, setIsSample] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { rows, source } = load();
    setCampaigns(rows);
    setIsSample(source === "sample");
    setLoading(false);
  }, []);

  const replaceAll = (rows: Campaign[]) => {
    setCampaigns(rows);
    setIsSample(false);
    persist(rows, "user");
  };

  const resetToSample = () => {
    setCampaigns(SAMPLE_CAMPAIGNS);
    setIsSample(true);
    persist(SAMPLE_CAMPAIGNS, "sample");
  };

  const clearAll = () => {
    setCampaigns([]);
    setIsSample(false);
    persist([], "user");
  };

  return (
    <CampaignContext.Provider value={{ campaigns, loading, isSample, replaceAll, resetToSample, clearAll }}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaigns() {
  const ctx = useContext(CampaignContext);
  if (!ctx) throw new Error("useCampaigns must be used within CampaignProvider");
  return ctx;
}
