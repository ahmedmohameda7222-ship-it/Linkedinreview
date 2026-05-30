export function StatCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="animate-fade-up rounded-3xl border border-white/70 bg-white/90 p-5 shadow-soft ring-1 ring-brand-100/60 backdrop-blur transition-all duration-200 hover:-translate-y-1 hover:shadow-glow">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      {detail ? <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p> : null}
    </div>
  );
}
