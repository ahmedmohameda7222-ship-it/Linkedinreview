export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-3xl border border-dashed border-brand-200 bg-white/80 text-sm font-medium text-slate-500 shadow-soft backdrop-blur">
      <span className="mr-3 h-2.5 w-2.5 animate-pulse rounded-full bg-brand-500" />
      {label}…
    </div>
  );
}
