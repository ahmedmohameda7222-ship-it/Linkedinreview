import { headers } from "next/headers";
import { redirect } from "next/navigation";
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

async function recordCvEvent(slug: string, eventType: "link_opened" | "download") {
  const h = headers();
  const userAgent = h.get("user-agent");
  const parsed = parseUserAgent(userAgent);
  const supabase = createPublicClient();
  return supabase.rpc("track_cv_event_and_get_payload", {
    p_slug: slug,
    p_event_type: eventType,
    p_user_agent: userAgent,
    p_ip_hash: hashIp(getClientIp(h)),
    p_country: getCountry(h),
    p_browser: parsed.browser,
    p_device_type: parsed.device_type,
    p_os: parsed.os,
    p_is_bot: isLikelyBotUserAgent(userAgent),
  });
}

export default async function CvDownloadPage({ params }: { params: { slug: string } }) {
  const slug = params.slug.trim().toLowerCase();
  if (!isValidPublicSlug(slug)) return <PublicError title="CV link not found" description="This CV link is invalid." />;

  const opened = await recordCvEvent(slug, "link_opened");
  if (opened.error) {
    console.error("track_cv_event_and_get_payload link_opened failed", { slug, message: opened.error.message });
    return <PublicError title="CV link error" description="The CV link could not be processed right now." />;
  }

  const downloaded = await recordCvEvent(slug, "download");
  if (downloaded.error) {
    console.error("track_cv_event_and_get_payload download failed", { slug, message: downloaded.error.message });
    return <PublicError title="CV download error" description="The CV download could not be processed right now." />;
  }

  const result = Array.isArray(downloaded.data) ? downloaded.data[0] : downloaded.data;
  if (!result || result.status === "not_found") return <PublicError title="CV link not found" description="This CV link does not exist." />;
  if (result.status === "inactive") return <PublicError title="CV link inactive" description="This CV link has been deactivated by its owner." />;
  if (!result.cv_file_url) return <PublicError title="Missing CV file" description="No uploaded CV PDF is configured for this profile yet." />;

  redirect(result.cv_file_url);
}
