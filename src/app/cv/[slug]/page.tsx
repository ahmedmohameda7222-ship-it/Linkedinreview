import Link from "next/link";
import { headers } from "next/headers";
import { createPublicClient } from "@/lib/supabase/public";
import { getClientIp, getCountry, hashIp, isLikelyBotUserAgent, parseUserAgent } from "@/lib/server/request";
import { isValidPublicSlug } from "@/lib/slugs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function PublicError({ title, description }: { title: string; description: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
      </section>
    </main>
  );
}

export default async function CvLandingPage({ params }: { params: { slug: string } }) {
  const slug = params.slug.trim().toLowerCase();
  if (!isValidPublicSlug(slug)) return <PublicError title="CV link not found" description="This CV link is invalid." />;

  const h = headers();
  const userAgent = h.get("user-agent");
  const parsed = parseUserAgent(userAgent);
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("track_cv_event_and_get_payload", {
    p_slug: slug,
    p_event_type: "view",
    p_user_agent: userAgent,
    p_ip_hash: hashIp(getClientIp(h)),
    p_country: getCountry(h),
    p_browser: parsed.browser,
    p_device_type: parsed.device_type,
    p_os: parsed.os,
    p_is_bot: isLikelyBotUserAgent(userAgent),
  });

  if (error) return <PublicError title="CV link error" description="The CV page could not be loaded right now." />;
  const result = Array.isArray(data) ? data[0] : data;
  if (!result || result.status === "not_found") return <PublicError title="CV link not found" description="This CV link does not exist." />;
  if (result.status === "inactive") return <PublicError title="CV link inactive" description="This CV link has been deactivated by its owner." />;
  if (result.status === "missing_target") return <PublicError title="Missing LinkedIn URL" description="The owner of this CV link has not configured a LinkedIn profile URL." />;

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-50 px-4 py-12">
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-glow ring-1 ring-brand-100/60 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Professional CV</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">{result.full_name || "Candidate profile"}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">This page records a CV view, then lets the recruiter open LinkedIn or download the CV file.</p>
        <div className="mt-6 grid gap-3 rounded-3xl border border-brand-100 bg-brand-50/60 p-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Company</p>
            <p className="mt-1 font-semibold text-slate-950">{result.company_name ?? "General application"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</p>
            <p className="mt-1 font-semibold text-slate-950">{result.job_title ?? "—"}</p>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={`/profile/${slug}`} className="inline-flex items-center justify-center rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-800">
            View LinkedIn
          </Link>
          <Link href={`/cv/${slug}/download`} className="inline-flex items-center justify-center rounded-xl border border-brand-100 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-50">
            Download CV
          </Link>
        </div>
        {!result.cv_file_url ? <p className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-semibold text-amber-800">CV download URL is not configured yet.</p> : null}
      </section>
    </main>
  );
}
