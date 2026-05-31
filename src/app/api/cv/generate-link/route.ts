import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/server/api";
import { createTrackingSlug } from "@/lib/slugs";

export async function POST(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (response) return response;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const companyId = body.companyId ?? body.company_id;
    const slug = String(body.slug || createTrackingSlug()).trim().toLowerCase();
    const { data, error } = await supabase
      .from("tracking_links")
      .insert({
        user_id: user.id,
        company_id: companyId,
        source: "CV",
        slug,
        target_type: "cv_download",
        active: true,
      })
      .select("*")
      .single();
    if (error) return jsonError(error);
    return NextResponse.json({ trackingLink: data, downloadPath: `/cv/${data.slug}`, viewPath: `/cv/${data.slug}/view` }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Invalid CV link payload.");
  }
}
