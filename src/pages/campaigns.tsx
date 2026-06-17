import { useMemo, useState } from "react";
import { Search, Download } from "lucide-react";
import { useCampaigns } from "@/lib/store";
import { useFilteredCampaigns } from "@/lib/filters";
import { GlobalFilters } from "@/components/global-filters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Button } from "@/components/ui";
import { fmtMoney, fmtNum, fmtPct, fmtRoas, toCSV, downloadFile } from "@/lib/format";

export default function CampaignsPage() {
  const { campaigns } = useCampaigns();
  const filtered = useFilteredCampaigns(campaigns);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<string>("revenue_usd");

  const rows = useMemo(() => {
    const enriched = filtered.map((r) => {
      const ctr = r.impressions ? (r.clicks / r.impressions) * 100 : 0;
      const convRate = r.clicks ? (r.conversions / r.clicks) * 100 : 0;
      const roas = r.cost_usd ? r.revenue_usd / r.cost_usd : 0;
      return { ...r, ctr, convRate, roas };
    });
    const f = q.trim().toLowerCase();
    const matched = f
      ? enriched.filter(
          (r) => r.campaign_id.toLowerCase().includes(f) || r.channel.toLowerCase().includes(f)
        )
      : enriched;
    return matched.sort((a, b) => (b as any)[sortKey] - (a as any)[sortKey]);
  }, [filtered, q, sortKey]);

  const exportCsv = () => {
    const csv = toCSV(
      rows.map((r) => ({
        CampaignID: r.campaign_id,
        Channel: r.channel,
        StartDate: r.start_date,
        Impressions: r.impressions,
        Clicks: r.clicks,
        Conversions: r.conversions,
        Cost_USD: r.cost_usd,
        Revenue_USD: r.revenue_usd,
        ROI: r.roi,
      }))
    );
    downloadFile("campaign-analysis.csv", csv, "text/csv");
  };

  const headers: { key: string; label: string; fmt?: (n: number) => string; align?: string }[] = [
    { key: "campaign_id", label: "Campaign", align: "left" },
    { key: "channel", label: "Channel", align: "left" },
    { key: "impressions", label: "Impr.", fmt: fmtNum },
    { key: "clicks", label: "Clicks", fmt: fmtNum },
    { key: "ctr", label: "CTR", fmt: (n) => fmtPct(n) },
    { key: "conversions", label: "Conv.", fmt: fmtNum },
    { key: "convRate", label: "CvR", fmt: (n) => fmtPct(n) },
    { key: "cost_usd", label: "Spend", fmt: fmtMoney },
    { key: "revenue_usd", label: "Revenue", fmt: fmtMoney },
    { key: "roas", label: "ROAS", fmt: fmtRoas },
    { key: "roi", label: "ROI", fmt: (n) => fmtPct(n, 1) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Campaign Analysis
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Campaign Explorer</h1>
          <p className="mt-1 text-sm text-muted-foreground">{fmtNum(rows.length)} campaigns shown</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-2 h-4 w-4" /> Export
        </Button>
      </div>

      <GlobalFilters />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Campaigns</CardTitle>
            <CardDescription>Search by ID or channel · click a header to sort</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search campaigns…"
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                {headers.map((h) => (
                  <th
                    key={h.key}
                    onClick={() => setSortKey(h.key)}
                    className={`cursor-pointer select-none px-4 py-3 hover:text-foreground ${
                      h.align === "left" ? "text-left" : "text-right"
                    } ${sortKey === h.key ? "text-foreground" : ""}`}
                  >
                    {h.label}
                    {sortKey === h.key ? " ↓" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                  {headers.map((h) => {
                    const raw = (r as any)[h.key];
                    return (
                      <td
                        key={h.key}
                        className={`px-4 py-2.5 ${h.align === "left" ? "text-left" : "text-right tabular-nums"} ${
                          h.key === "campaign_id" ? "font-medium" : ""
                        }`}
                      >
                        {h.fmt ? h.fmt(raw) : raw}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
