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

export default async function CvOnlineViewPage({ params }: { params: { slug: string } }) {
  const slug = params.slug.trim().toLowerCase();
  if (!isValidPublicSlug(slug)) return <PublicError title="CV link not found" description="This CV viewer link is invalid." />;

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

  if (error) {
    console.error("track_cv_event_and_get_payload view failed", { slug, message: error.message, details: error.details, hint: error.hint, code: error.code });
    return <PublicError title="CV viewer error" description="The online CV viewer could not be loaded right now." />;
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result || result.status === "not_found") return <PublicError title="CV link not found" description="This CV link does not exist." />;
  if (result.status === "inactive") return <PublicError title="CV link inactive" description="This CV link has been deactivated by its owner." />;
  if (!result.cv_file_url) return <PublicError title="Missing CV file" description="No uploaded CV PDF is configured for this profile yet." />;

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Tracked online CV</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">{result.full_name || "Candidate CV"}</h1>
            <p className="mt-1 text-sm text-slate-500">{result.company_name ?? "General application"}{result.job_title ? ` - ${result.job_title}` : ""}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.linkedin_url ? (
              <Link href={`/profile/${slug}`} className="rounded-xl border border-brand-100 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-brand-50">
                View LinkedIn
              </Link>
            ) : null}
            <Link href={`/cv/${slug}/download`} className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800">
              Download PDF
            </Link>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-4 py-5">
        <p className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          Direct offline PDF opens cannot be reliably tracked. Use this tracked CV link or online CV viewer for reliable tracking.
        </p>
        <object data={result.cv_file_url} type="application/pdf" className="h-[78vh] w-full rounded-2xl border border-slate-200 bg-white shadow-sm">
          <iframe src={result.cv_file_url} className="h-[78vh] w-full rounded-2xl border-0" title="Online CV PDF" />
        </object>
      </section>
    </main>
  );
}
