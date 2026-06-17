import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Moon, Sun, Info, Upload, X } from "lucide-react";
import { AppSidebar } from "./sidebar";
import { Button } from "@/components/ui";
import { useCampaigns } from "@/lib/store";

function SampleBanner() {
  const { isSample, campaigns, clearAll } = useCampaigns();
  const [dismissed, setDismissed] = useState(false);
  if (!isSample || campaigns.length === 0 || dismissed) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-sm text-amber-800 dark:text-amber-300">
      <Info className="h-4 w-4 shrink-0" />
      <span>
        You're viewing <strong>sample data</strong> — this is demo content, not your campaigns.
      </span>
      <div className="ml-auto flex items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/upload">
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload your data
          </Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={clearAll}>
          Clear sample
        </Button>
        <button onClick={() => setDismissed(true)} className="text-amber-700/70 hover:text-amber-900 dark:hover:text-amber-200">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
          <p className="text-sm text-muted-foreground">Fashion Marketing Intelligence Platform</p>
          <Button variant="ghost" size="icon" onClick={() => setDark((d) => !d)} title="Toggle theme">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </header>
        <SampleBanner />
        <main className="mx-auto w-full max-w-7xl flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
