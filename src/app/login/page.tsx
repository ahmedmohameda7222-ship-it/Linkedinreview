import Link from "next/link";
import { Suspense } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-glow ring-1 ring-brand-100/60 backdrop-blur">
        <div className="mb-8">
          <BrandLogo />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">Log in</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Open your private dashboard and manage tracking links.</p>
        </div>
        <Suspense fallback={<div className="rounded-2xl bg-brand-50 p-4 text-sm text-slate-500">Loading login form…</div>}>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-slate-500">
          No account? <Link className="font-semibold text-brand-700 hover:text-brand-900 hover:underline" href="/signup">Create one</Link>
        </p>
      </div>
    </main>
  );
}
