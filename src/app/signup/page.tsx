import Link from "next/link";
import { SignupForm } from "./SignupForm";
import { APP_NAME } from "@/lib/supabase/config";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <div className="mb-8">
          <p className="text-sm font-semibold text-slate-500">{APP_NAME}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Create account</h1>
          <p className="mt-2 text-sm text-slate-500">Each user gets a private dashboard and their own LinkedIn tracking links.</p>
        </div>
        <SignupForm />
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account? <Link className="font-semibold text-slate-950 hover:underline" href="/login">Log in</Link>
        </p>
      </div>
    </main>
  );
}
