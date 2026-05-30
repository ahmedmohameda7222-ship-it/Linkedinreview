import type { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: ReactNode;
  error?: string;
}

export function Input({ label, hint, error, className = "", id, ...props }: InputProps) {
  const inputId = id ?? props.name ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label htmlFor={inputId} className="block space-y-2">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      <input
        id={inputId}
        aria-invalid={error ? "true" : undefined}
        className={`w-full rounded-2xl border bg-white/95 px-3.5 py-3 text-sm text-slate-950 outline-none transition-all duration-200 placeholder:text-slate-400 focus:ring-4 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-100"
            : "border-brand-100 focus:border-brand-500 focus:ring-brand-100"
        } ${className}`}
        {...props}
      />
      {hint ? <span className="block text-xs leading-5 text-slate-500">{hint}</span> : null}
      {error ? <span className="block text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}
