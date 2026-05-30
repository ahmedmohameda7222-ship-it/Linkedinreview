import Link from "next/link";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Reset password</h1>
        <p className="mt-2 text-sm text-slate-500">Enter your account email and Supabase will send a reset link.</p>
        <div className="mt-8">
          <ResetPasswordForm />
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link className="font-semibold text-slate-950 hover:underline" href="/login">Back to login</Link>
        </p>
      </div>
    </main>
  );
}
