import type { ReactNode } from "react";

const toneClasses = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-brand-50 text-brand-800 ring-brand-100",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "bg-amber-50 text-amber-800 ring-amber-100",
  red: "bg-red-50 text-red-700 ring-red-100",
  purple: "bg-violet-50 text-violet-700 ring-violet-100",
};

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: keyof typeof toneClasses }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${toneClasses[tone]}`}>{children}</span>;
}
