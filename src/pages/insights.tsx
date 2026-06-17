import { useMemo, useState } from "react";
import { Sparkles, Download, Wand2, Loader2, AlertTriangle, Settings as SettingsIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useCampaigns } from "@/lib/store";
import { useFilteredCampaigns } from "@/lib/filters";
import { generateInsights } from "@/lib/kpis";
import { generateAiInsights } from "@/lib/llm";
import { hasApiKey, getProvider, getModel } from "@/lib/llm-config";
import { GlobalFilters } from "@/components/global-filters";
import { Card, CardContent, Button, Badge, Select, Option } from "@/components/ui";
import { toCSV, downloadFile } from "@/lib/format";
import type { Insight } from "@/lib/types";

const CATEGORIES = ["all", "channel", "budget", "conversion", "revenue", "risk", "general"] as const;

export default function InsightsPage() {
  const { campaigns } = useCampaigns();
  const filtered = useFilteredCampaigns(campaigns);
  const [cat, setCat] = useState<string>("all");
  const [mode, setMode] = useState<"rules" | "ai">("rules");
  const [aiInsights, setAiInsights] = useState<Insight[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ruleInsights = useMemo(() => generateInsights(filtered), [filtered]);
  const active = mode === "ai" && aiInsights ? aiInsights : ruleInsights;
  const shown = cat === "all" ? active : active.filter((i) => i.category === cat);

  const runAi = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await generateAiInsights(filtered);
      setAiInsights(res);
      setMode("ai");
    } catch (e: any) {
      if (e?.message === "NO_KEY") {
        setError("Add an AI provider key in Settings to generate live insights.");
      } else {
        setError(e?.message || "Generation failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const csv = toCSV(
      active.map((i) => ({ category: i.category, tone: i.tone, title: i.title, recommendation: i.body })),
      ["category", "tone", "title", "recommendation"]
    );
    downloadFile("ai-recommendations.csv", csv, "text/csv");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            AI Recommendations
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Sparkles className="h-7 w-7 text-primary" /> Actionable Insights
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {active.length} recommendations ·{" "}
            {mode === "ai" && aiInsights
              ? `generated live by ${getProvider()} (${getModel()})`
              : "deterministic analytics engine"}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Select value={cat} onValueChange={setCat} className="w-[150px]">
            {CATEGORIES.map((c) => (
              <Option key={c} value={c}>
                {c === "all" ? "All categories" : c[0].toUpperCase() + c.slice(1)}
              </Option>
            ))}
          </Select>
          {aiInsights && (
            <Select value={mode} onValueChange={(v) => setMode(v as "rules" | "ai")} className="w-[150px]">
              <Option value="ai">AI engine</Option>
              <Option value="rules">Rule engine</Option>
            </Select>
          )}
          <Button size="sm" onClick={runAi} disabled={loading || filtered.length === 0}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            {loading ? "Analyzing…" : "Generate with AI"}
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!active.length}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> {error}
          </span>
          {!hasApiKey() && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/settings">
                <SettingsIcon className="mr-1.5 h-3.5 w-3.5" /> Open Settings
              </Link>
            </Button>
          )}
        </div>
      )}

      <GlobalFilters />

      {shown.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No recommendations for this selection.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shown.map((i, idx) => (
            <Card key={idx}>
              <CardContent className="p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant={i.tone === "good" ? "default" : i.tone === "warn" ? "destructive" : "secondary"}>
                    {i.tone === "good" ? "Opportunity" : i.tone === "warn" ? "Action needed" : "Tip"}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {i.category}
                  </Badge>
                </div>
                <p className="font-semibold">{i.title}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{i.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
