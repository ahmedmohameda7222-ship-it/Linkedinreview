import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/server/api";

export async function GET() {
  const { supabase, response } = await requireUser();
  if (response) return response;
  const { data, error } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
  if (error) return jsonError(error);
  return NextResponse.json({ companies: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (response) return response;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from("companies")
      .insert({
        user_id: user.id,
        name: body.name,
        job_title: body.jobTitle ?? body.job_title ?? null,
        recruiter_name: body.recruiterName ?? body.recruiter_name ?? null,
        recruiter_email: body.recruiterEmail ?? body.recruiter_email ?? null,
        application_url: body.applicationUrl ?? body.application_url ?? null,
        status: body.status ?? "Applied",
        applied_at: body.dateApplied ?? body.applied_at ?? null,
        notes: body.notes ?? null,
      })
      .select("*")
      .single();
    if (error) return jsonError(error);
    return NextResponse.json({ company: data }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Invalid company payload");
  }
}
