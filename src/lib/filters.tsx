import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Campaign } from "./types";

type FilterState = {
  channel: string; // "all" or a specific channel
  startDate: string; // YYYY-MM-DD or ""
  endDate: string; // YYYY-MM-DD or ""
};

type FilterCtx = FilterState & {
  setChannel: (v: string) => void;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
  reset: () => void;
  isActive: boolean;
};

const Ctx = createContext<FilterCtx | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [channel, setChannel] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const value: FilterCtx = {
    channel,
    startDate,
    endDate,
    setChannel,
    setStartDate,
    setEndDate,
    reset: () => {
      setChannel("all");
      setStartDate("");
      setEndDate("");
    },
    isActive: channel !== "all" || !!startDate || !!endDate,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFilters() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useFilters must be used within FilterProvider");
  return c;
}

export function applyFilters(
  rows: Campaign[],
  f: { channel: string; startDate: string; endDate: string }
): Campaign[] {
  return rows.filter((r) => {
    if (f.channel !== "all" && r.channel !== f.channel) return false;
    if (f.startDate && r.start_date < f.startDate) return false;
    if (f.endDate && r.start_date > f.endDate) return false;
    return true;
  });
}

export function useFilteredCampaigns(rows: Campaign[]): Campaign[] {
  const { channel, startDate, endDate } = useFilters();
  return useMemo(
    () => applyFilters(rows, { channel, startDate, endDate }),
    [rows, channel, startDate, endDate]
  );
}
