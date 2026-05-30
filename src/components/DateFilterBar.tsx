"use client";

import type { DateFilter } from "@/lib/format";

const options: { value: DateFilter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

export function DateFilterBar({
  value,
  onChange,
  customFrom,
  customTo,
  onCustomFrom,
  onCustomTo,
}: {
  value: DateFilter;
  onChange: (value: DateFilter) => void;
  customFrom: string;
  customTo: string;
  onCustomFrom: (value: string) => void;
  onCustomTo: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-brand-100 bg-white/85 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
              value === option.value ? "bg-brand-700 text-white shadow-sm" : "bg-brand-50 text-slate-700 hover:bg-brand-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {value === "custom" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input type="date" value={customFrom} onChange={(event) => onCustomFrom(event.target.value)} className="rounded-xl border border-brand-100 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
          <input type="date" value={customTo} onChange={(event) => onCustomTo(event.target.value)} className="rounded-xl border border-brand-100 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
        </div>
      ) : null}
    </div>
  );
}
