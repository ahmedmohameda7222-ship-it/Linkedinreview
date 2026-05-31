import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/server/api";
import { createTrackingSlug } from "@/lib/slugs";

export async function GET() {
  const { supabase, response } = await requireUser();
  if (response) return response;
  const { data, error } = await supabase.from("tracking_links").select("*").order("created_at", { ascending: false });
  if (error) return jsonError(error);
  return NextResponse.json({ trackingLinks: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (response) return response;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const slug = String(body.slug || createTrackingSlug()).trim().toLowerCase();
    const { data, error } = await supabase
      .from("tracking_links")
      .insert({
        user_id: user.id,
        company_id: body.companyId ?? body.company_id,
        source: body.source ?? "Other",
        slug,
        target_type: body.type === "CV_DOWNLOAD" ? "cv_download" : body.type === "CV_VIEW" ? "cv_view" : "linkedin",
        destination_url: body.destinationUrl ?? body.destination_url ?? null,
        active: true,
      })
      .select("*")
      .single();
    if (error) return jsonError(error);
    return NextResponse.json({ trackingLink: data }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Invalid tracking link payload");
  }
}
