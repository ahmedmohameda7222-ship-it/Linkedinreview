import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createPublicClient } from "@/lib/supabase/public";
import { getClientIp, getCountry, hashIp, isLikelyBotUserAgent, parseUserAgent } from "@/lib/server/request";
import { isValidPublicSlug } from "@/lib/slugs";

function htmlError(title: string, description: string, status = 400) {
  return new NextResponse(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:system-ui;padding:48px;background:#f8fafc;color:#0f172a"><main style="max-width:520px;margin:auto;background:white;border:1px solid #e2e8f0;border-radius:24px;padding:32px;text-align:center"><h1>${title}</h1><p>${description}</p></main></body></html>`, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const slug = params.slug.trim().toLowerCase();
  if (!isValidPublicSlug(slug)) return htmlError("CV link not found", "This CV download link is invalid.", 404);

  const h = headers();
  const userAgent = h.get("user-agent");
  const parsed = parseUserAgent(userAgent);
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("track_cv_event_and_get_payload", {
    p_slug: slug,
    p_event_type: "download",
    p_user_agent: userAgent,
    p_ip_hash: hashIp(getClientIp(h)),
    p_country: getCountry(h),
    p_browser: parsed.browser,
    p_device_type: parsed.device_type,
    p_os: parsed.os,
    p_is_bot: isLikelyBotUserAgent(userAgent),
  });

  if (error) return htmlError("CV download error", "The CV download could not be processed right now.", 500);
  const result = Array.isArray(data) ? data[0] : data;
  if (!result || result.status === "not_found") return htmlError("CV link not found", "This CV link does not exist.", 404);
  if (result.status === "inactive") return htmlError("CV link inactive", "This CV link has been deactivated by its owner.", 410);
  if (!result.cv_file_url) return htmlError("Missing CV file", "No CV file URL is configured for this profile yet.", 404);

  return NextResponse.redirect(result.cv_file_url, 302);
}
