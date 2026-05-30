import Link from "next/link";
import { APP_NAME } from "@/lib/supabase/config";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <article className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <Link href="/dashboard" className="text-sm font-semibold text-slate-500 hover:text-slate-950">← Dashboard</Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">Privacy note</h1>
        <p className="mt-4 text-slate-600">
          {APP_NAME} records click events only when someone opens a generated tracking link such as <code className="rounded bg-slate-100 px-1">/r/company-slug</code>.
        </p>
        <div className="mt-8 space-y-6 text-sm leading-6 text-slate-600">
          <section>
            <h2 className="text-base font-semibold text-slate-950">What is stored</h2>
            <p className="mt-2">For each click, the app stores timestamp, company link, referrer if available, user agent, optional country header, a simple device/browser label, and a hashed IP value.</p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-slate-950">Raw IP addresses</h2>
            <p className="mt-2">Raw IP addresses are not stored. The server hashes the IP address with a salt before inserting the click record.</p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-slate-950">What is not tracked</h2>
            <p className="mt-2">The app does not access LinkedIn analytics, does not scrape LinkedIn, and cannot detect direct LinkedIn profile views that do not pass through a generated tracking link.</p>
          </section>
          <section>
            <h2 className="text-base font-semibold text-slate-950">User data isolation</h2>
            <p className="mt-2">Dashboard data is protected by Supabase Row Level Security so authenticated users can only read their own profile, companies, and click events.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
