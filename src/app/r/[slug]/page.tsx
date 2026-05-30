import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { getClientIp, getCountry, hashIp, parseDevice } from "@/lib/server/request";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function TrackingError({ title, description }: { title: string; description: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <section className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
      </section>
    </main>
  );
}

export default async function TrackingRedirectPage({ params }: { params: { slug: string } }) {
  const slug = params.slug.trim().toLowerCase();

  if (!slug || !/^[a-z0-9-]{3,80}$/.test(slug)) {
    return <TrackingError title="Link not found" description="This tracking link is invalid." />;
  }

  const h = headers();
  const userAgent = h.get("user-agent");
  const referrer = h.get("referer");
  const country = getCountry(h);
  const ipHash = hashIp(getClientIp(h));
  const device = parseDevice(userAgent);

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("track_click_and_get_target", {
    p_slug: slug,
    p_referrer: referrer,
    p_user_agent: userAgent,
    p_ip_hash: ipHash,
    p_country: country,
    p_device: device,
  });

  if (error) {
    return <TrackingError title="Link error" description="The tracking link could not be processed right now." />;
  }

  const result = Array.isArray(data) ? data[0] : data;

  if (!result || result.status === "not_found") {
    return <TrackingError title="Link not found" description="This tracking link does not exist." />;
  }

  if (result.status === "inactive") {
    return <TrackingError title="Link inactive" description="This tracking link has been deactivated by its owner." />;
  }

  if (result.status === "missing_target") {
    return <TrackingError title="Missing LinkedIn URL" description="The owner of this tracking link has not configured a LinkedIn profile URL." />;
  }

  if (result.status === "ok" && result.target_url) {
    redirect(result.target_url);
  }

  return <TrackingError title="Link error" description="The tracking link returned an unexpected response." />;
}
