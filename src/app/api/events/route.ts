import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/server/api";

export async function GET() {
  const { supabase, response } = await requireUser();
  if (response) return response;
  const [clicksResult, cvResult, timelineResult] = await Promise.all([
    supabase.from("clicks").select("*").order("clicked_at", { ascending: false }),
    supabase.from("cv_events").select("*").order("created_at", { ascending: false }),
    supabase.from("timeline_events").select("*").order("created_at", { ascending: false }),
  ]);
  if (clicksResult.error) return jsonError(clicksResult.error);
  if (cvResult.error) return jsonError(cvResult.error);
  if (timelineResult.error) return jsonError(timelineResult.error);
  return NextResponse.json({ clicks: clicksResult.data ?? [], cvEvents: cvResult.data ?? [], timelineEvents: timelineResult.data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (response) return response;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from("timeline_events")
      .insert({
        user_id: user.id,
        company_id: body.companyId ?? body.company_id,
        event_type: body.eventType ?? body.event_type ?? "manual",
        title: body.title ?? "Manual event",
        description: body.description ?? null,
        metadata: body.metadata ?? {},
      })
      .select("*")
      .single();
    if (error) return jsonError(error);
    return NextResponse.json({ event: data }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Invalid event payload.");
  }
}
