import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { SignupForm } from "./SignupForm";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/80 bg-white/90 p-8 shadow-glow ring-1 ring-brand-100/60 backdrop-blur">
        <div className="mb-8">
          <BrandLogo />
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">Create account</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Each user gets a private dashboard and must add their own LinkedIn profile URL.</p>
        </div>
        <SignupForm />
        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account? <Link className="font-semibold text-brand-700 hover:text-brand-900 hover:underline" href="/login">Log in</Link>
        </p>
      </div>
    </main>
  );
}
