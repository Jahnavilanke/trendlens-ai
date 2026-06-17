export type Campaign = {
  id: string;
  campaign_id: string;
  start_date: string;
  end_date: string;
  channel: string;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
  cost_usd: number;
  revenue_usd: number;
  roi: number;
};

export type CampaignKPIs = {
  campaignCount: number; // unique campaign_id count
  totalRecords: number; // total row count
  ctr: number;
  cpc: number;
  cpa: number;
  convRate: number;
  roas: number;
  roi: number;
  avgRoi: number;
  cost: number;
  revenue: number;
  profit: number;
  impressions: number;
  clicks: number;
  leads: number;
  conversions: number;
};

export type Insight = {
  title: string;
  body: string;
  tone: "good" | "warn" | "info";
  category: "channel" | "budget" | "conversion" | "revenue" | "risk" | "general";
};
