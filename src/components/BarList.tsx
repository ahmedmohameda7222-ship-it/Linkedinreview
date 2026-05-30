export function BarList({ data, emptyLabel = "No data yet" }: { data: { label: string; value: number }[]; emptyLabel?: string }) {
  const max = Math.max(...data.map((item) => item.value), 1);
  if (data.length === 0) return <p className="rounded-2xl bg-brand-50 p-4 text-sm text-slate-500">{emptyLabel}</p>;

  return (
    <div className="space-y-3">
      {data.slice(0, 8).map((item) => (
        <div key={item.label} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-700">{item.label}</span>
            <span className="font-semibold text-slate-950">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-brand-50 ring-1 ring-brand-100">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 6 : 0)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
