import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import { APP_NAME } from "@/lib/supabase/config";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <div className="mb-8">
          <p className="text-sm font-semibold text-slate-500">{APP_NAME}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Log in</h1>
          <p className="mt-2 text-sm text-slate-500">Open your private dashboard and manage tracking links.</p>
        </div>
        <Suspense fallback={<div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-500">Loading login form…</div>}>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-sm text-slate-500">
          No account? <Link className="font-semibold text-slate-950 hover:underline" href="/signup">Create one</Link>
        </p>
      </div>
    </main>
  );
}
