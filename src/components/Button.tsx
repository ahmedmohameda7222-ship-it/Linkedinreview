import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  children: ReactNode;
}

const variants = {
  primary: "bg-brand-700 text-white shadow-sm shadow-brand-900/10 hover:-translate-y-0.5 hover:bg-brand-800 hover:shadow-glow disabled:translate-y-0 disabled:bg-slate-400 disabled:shadow-none",
  secondary: "border border-brand-100 bg-white/90 text-slate-900 shadow-sm hover:-translate-y-0.5 hover:border-brand-200 hover:bg-brand-50 disabled:translate-y-0 disabled:text-slate-400",
  danger: "bg-red-600 text-white shadow-sm hover:-translate-y-0.5 hover:bg-red-700 disabled:translate-y-0 disabled:bg-red-300",
  ghost: "bg-transparent text-slate-700 hover:bg-brand-50 hover:text-brand-800 disabled:text-slate-400",
};

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
