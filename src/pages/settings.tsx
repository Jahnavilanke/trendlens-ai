import { useState } from "react";
import { Database, Trash2, RotateCcw, Download, Sparkles, Eye, EyeOff, Check } from "lucide-react";
import { useCampaigns } from "@/lib/store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Select,
  Option,
} from "@/components/ui";
import { toCSV, downloadFile, fmtNum } from "@/lib/format";
import {
  getApiKey,
  setApiKey,
  getProvider,
  setProvider,
  getModel,
  setModel,
  DEFAULT_MODEL,
  PROVIDER_LABEL,
  KEY_PREFIX,
  type Provider,
} from "@/lib/llm-config";

export default function SettingsPage() {
  const { campaigns, resetToSample, clearAll } = useCampaigns();
  const [confirmClear, setConfirmClear] = useState(false);

  const [provider, setProviderState] = useState<Provider>(getProvider());
  const [key, setKeyState] = useState(getApiKey());
  const [model, setModelState] = useState(getModel());
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveAi = () => {
    setProvider(provider);
    setApiKey(key.trim());
    setModel(model.trim() || DEFAULT_MODEL[provider]);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const onProviderChange = (p: string) => {
    const prov = p as Provider;
    setProviderState(prov);
    setModelState(DEFAULT_MODEL[prov]);
  };

  const exportAll = () => {
    const csv = toCSV(
      campaigns.map((r) => ({
        CampaignID: r.campaign_id,
        StartDate: r.start_date,
        EndDate: r.end_date,
        Channel: r.channel,
        Impressions: r.impressions,
        Clicks: r.clicks,
        Leads: r.leads,
        Conversions: r.conversions,
        Cost_USD: r.cost_usd,
        Revenue_USD: r.revenue_usd,
        ROI: r.roi,
      }))
    );
    downloadFile("trendlens-export.csv", csv, "text/csv");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your local dataset.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" /> AI Insights Provider
          </CardTitle>
          <CardDescription>
            Bring your own key to power the live AI recommendations. The key is stored only in this
            tab's session memory and sent directly to the provider — never to any server of ours.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Provider</Label>
              <div>
                <Select value={provider} onValueChange={onProviderChange} className="w-full">
                  <Option value="groq">{PROVIDER_LABEL.groq}</Option>
                  <Option value="anthropic">{PROVIDER_LABEL.anthropic}</Option>
                  <Option value="openai">{PROVIDER_LABEL.openai}</Option>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Model</Label>
              <Input value={model} onChange={(e) => setModelState(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">API key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  value={key}
                  onChange={(e) => setKeyState(e.target.value)}
                  placeholder={KEY_PREFIX[provider]}
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button size="sm" onClick={saveAi}>
                {saved ? <Check className="mr-1.5 h-4 w-4" /> : null}
                {saved ? "Saved" : "Save"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Note: browser-side API calls expose the key to the page and may be rate-limited by CORS.
              For production, proxy requests through a backend. Without a key, the app falls back to the
              deterministic rule engine.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" /> Dataset
          </CardTitle>
          <CardDescription>
            {fmtNum(campaigns.length)} records stored locally in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={exportAll} disabled={!campaigns.length}>
            <Download className="mr-2 h-4 w-4" /> Export all data
          </Button>
          <Button variant="outline" size="sm" onClick={resetToSample}>
            <RotateCcw className="mr-2 h-4 w-4" /> Reset to sample data
          </Button>
          {confirmClear ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                clearAll();
                setConfirmClear(false);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Confirm clear
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear all data
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About this build</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            This is a self-contained rebuild of the Lovable “Campaign Insights Hub / trendlens-ai”
            project. The original used a Supabase backend; this version stores data locally so it runs
            with no cloud setup.
          </p>
          <p>
            All KPI math and the AI insight engine are identical to the original implementation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
