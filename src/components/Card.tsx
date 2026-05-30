import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`animate-fade-up rounded-3xl border border-white/70 bg-white/90 p-5 shadow-soft ring-1 ring-brand-100/50 backdrop-blur transition-all duration-200 hover:shadow-glow ${className}`}>
      {children}
    </section>
  );
}

export function CardHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
      {description ? <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p> : null}
    </div>
  );
}
