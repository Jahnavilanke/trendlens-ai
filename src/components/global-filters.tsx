import { useMemo } from "react";
import { Filter, RotateCcw } from "lucide-react";

import { useCampaigns } from "@/lib/store";
import { useFilters } from "@/lib/filters";
import { Card, CardContent, Button, Label, Input, Select, Option } from "@/components/ui";

export function GlobalFilters() {
  const { campaigns } = useCampaigns();
  const { channel, setChannel, startDate, setStartDate, endDate, setEndDate, reset, isActive } =
    useFilters();

  const channels = useMemo(
    () => Array.from(new Set(campaigns.map((c) => c.channel))).sort(),
    [campaigns]
  );

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-wrap items-end gap-4 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          Filters
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Channel</Label>
          <div>
            <Select value={channel} onValueChange={setChannel} className="w-[180px]">
              <Option value="all">All channels</Option>
              {channels.map((c) => (
                <Option key={c} value={c}>
                  {c}
                </Option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Start date</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[180px]"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">End date</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[180px]"
          />
        </div>
        <Button variant="ghost" size="sm" onClick={reset} disabled={!isActive} className="ml-auto">
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Reset
        </Button>
      </CardContent>
    </Card>
  );
}
