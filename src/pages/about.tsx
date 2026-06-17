import { Sparkle, BarChart3, Database, Sparkles, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui";

const features = [
  { icon: BarChart3, title: "KPI dashboard", body: "CTR, CPC, CPA, conversion rate, ROAS and ROI computed live across the portfolio." },
  { icon: Database, title: "Channel & campaign analysis", body: "Sortable breakdowns by channel and a searchable campaign explorer." },
  { icon: Sparkles, title: "AI recommendations", body: "Rule-based insight engine that surfaces opportunities, risks and budget moves." },
  { icon: Upload, title: "CSV import", body: "Bring your own data with a documented template — parsed entirely in the browser." },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
          <Sparkle className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">trendlens-ai</h1>
          <p className="text-sm text-muted-foreground">Fashion Marketing Intelligence Platform</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>About the project</CardTitle>
          <CardDescription>What this app does and how it was built</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            trendlens-ai lets fashion marketing teams upload campaign performance data and instantly
            see how their channels and campaigns are doing — efficiency metrics, channel comparisons,
            monthly trends, audience funnels, revenue forecasts, and AI-generated recommendations.
          </p>
          <p>
            This is a portable rebuild of a project originally created in Lovable. The original ran on a
            TanStack Start + Supabase stack; this version reuses the exact KPI and insight logic but
            runs fully client-side with React, Vite, Tailwind, Recharts and PapaParse.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((f) => (
          <Card key={f.title}>
            <CardContent className="p-5">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <f.icon className="h-4 w-4" />
              </div>
              <p className="font-semibold">{f.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
