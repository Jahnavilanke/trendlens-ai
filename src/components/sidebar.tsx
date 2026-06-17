import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  BarChart3,
  Sparkles,
  Settings,
  Sparkle,
  Layers3,
  FileText,
  Users,
  LineChart,
  Info,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

type Item = { title: string; url: string; icon: LucideIcon };

const analytics: Item[] = [
  { title: "Executive Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Executive Summary", url: "/executive", icon: FileText },
  { title: "Channel Performance", url: "/channels", icon: Layers3 },
  { title: "Campaign Analysis", url: "/campaigns", icon: BarChart3 },
  { title: "Audience Insights", url: "/audience", icon: Users },
  { title: "Forecasting", url: "/forecasting", icon: LineChart },
  { title: "AI Recommendations", url: "/insights", icon: Sparkles },
];

const workspace: Item[] = [
  { title: "Upload Data", url: "/upload", icon: Upload },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "About Project", url: "/about", icon: Info },
];

function Group({ label, items }: { label: string; items: Item[] }) {
  return (
    <div className="px-2 py-2">
      <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <nav className="space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-foreground/70 hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-sm">
          <Sparkle className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold leading-tight">trendlens-ai</span>
          <span className="text-[11px] text-muted-foreground">Fashion Marketing Intelligence</span>
        </div>
      </div>
      <Group label="Analytics" items={analytics} />
      <Group label="Workspace" items={workspace} />
    </aside>
  );
}
