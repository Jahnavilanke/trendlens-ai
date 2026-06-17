import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, Download, RotateCcw, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useCampaigns, parseCsvText, COLUMN_MAP, type ParseResult } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from "@/components/ui";
import { fmtNum } from "@/lib/format";

export default function UploadPage() {
  const { replaceAll, resetToSample, campaigns } = useCampaigns();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<(ParseResult & { fileName: string }) | null>(null);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const res = parseCsvText(text);
    setPreview({ ...res, fileName: file.name });
    setDone(false);
  };

  const confirmImport = () => {
    if (!preview || preview.rows.length === 0) return;
    replaceAll(preview.rows);
    setDone(true);
    setTimeout(() => navigate("/"), 700);
  };

  const downloadTemplate = () => {
    const headers = Object.keys(COLUMN_MAP);
    const csv =
      headers.join(",") +
      "\n" +
      "CMP-001,2025-06-01,2025-06-30,Google Ads,20000,420,80,38,540.50,2300,325.5\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "campaign-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const canImport = preview && preview.rows.length > 0 && preview.errors.length === 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload Data</h1>
        <p className="text-sm text-muted-foreground">
          Import a campaign CSV. Files are parsed and validated in your browser — nothing is uploaded
          to a server. Review the validation report before committing.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFile(f);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
              dragging ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"
            }`}
          >
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Drop your CSV here, or click to browse</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Standard headers: {Object.keys(COLUMN_MAP).join(", ")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Common variations are auto-detected (Spend, Sales, Platform, Date, $ and commas, MM/DD/YYYY).
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> Download CSV template
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { resetToSample(); setPreview(null); }}>
              <RotateCcw className="mr-2 h-4 w-4" /> Reset to sample data
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Currently loaded: {fmtNum(campaigns.length)} records.</p>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Validation report · {preview.fileName}</CardTitle>
              <CardDescription>
                {fmtNum(preview.rows.length)} valid rows · {preview.errors.length} errors ·{" "}
                {preview.warnings.length} warnings
              </CardDescription>
            </div>
            {done ? (
              <span className="flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" /> Imported
              </span>
            ) : (
              <Button size="sm" onClick={confirmImport} disabled={!canImport}>
                Confirm import
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {preview.errors.map((e, i) => (
              <div key={`e${i}`} className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-700 dark:text-rose-400">
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {e}
              </div>
            ))}
            {preview.warnings.map((w, i) => (
              <div key={`w${i}`} className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {w}
              </div>
            ))}
            {preview.errors.length === 0 && preview.warnings.length === 0 && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> No issues found — clean dataset.
              </div>
            )}

            {preview.rows.length > 0 && (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                      <th className="px-3 py-2">Campaign</th>
                      <th className="px-3 py-2">Channel</th>
                      <th className="px-3 py-2">Start</th>
                      <th className="px-3 py-2 text-right">Clicks</th>
                      <th className="px-3 py-2 text-right">Conv.</th>
                      <th className="px-3 py-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 5).map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="px-3 py-1.5 font-medium">{r.campaign_id}</td>
                        <td className="px-3 py-1.5">{r.channel}</td>
                        <td className="px-3 py-1.5">{r.start_date}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{fmtNum(r.clicks)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{fmtNum(r.conversions)}</td>
                        <td className="px-3 py-1.5 text-right tabular-nums">{fmtNum(r.revenue_usd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.rows.length > 5 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    + {fmtNum(preview.rows.length - 5)} more rows
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Column reference</CardTitle>
          <CardDescription>How CSV headers map to fields</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-2.5">CSV header</th>
                <th className="px-6 py-2.5">Field</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(COLUMN_MAP).map(([h, f]) => (
                <tr key={h} className="border-b last:border-0">
                  <td className="px-6 py-2 font-medium">{h}</td>
                  <td className="px-6 py-2 text-muted-foreground">{f}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
