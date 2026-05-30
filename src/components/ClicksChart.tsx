import { buildDailyClickSeries } from "@/lib/format";
import type { Click } from "@/lib/database.types";

export function ClicksChart({ clicks }: { clicks: Click[] }) {
  const series = buildDailyClickSeries(clicks, 14);
  const max = Math.max(...series.map((item) => item.count), 1);

  return (
    <div className="space-y-4">
      <div className="flex h-52 items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        {series.map((item) => {
          const height = Math.max((item.count / max) * 100, item.count > 0 ? 8 : 2);
          return (
            <div key={item.dateKey} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-36 w-full items-end">
                <div
                  className="w-full rounded-t-lg bg-slate-900 transition-all"
                  style={{ height: `${height}%` }}
                  title={`${item.label}: ${item.count} clicks`}
                />
              </div>
              <span className="max-w-full truncate text-[10px] text-slate-500">{item.label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">Last 14 days. Bars count recorded tracking-link openings.</p>
    </div>
  );
}
