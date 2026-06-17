import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui";

export function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
}) {
  const positive = delta?.startsWith("+");
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
            {delta && (
              <p
                className={`mt-1 text-xs font-medium ${
                  positive ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {delta} vs prev period
              </p>
            )}
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
