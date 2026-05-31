import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/server/api";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { supabase, response } = await requireUser();
  if (response) return response;
  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from("companies")
      .update({
        name: body.name,
        job_title: body.jobTitle ?? body.job_title,
        recruiter_name: body.recruiterName ?? body.recruiter_name,
        recruiter_email: body.recruiterEmail ?? body.recruiter_email,
        application_url: body.applicationUrl ?? body.application_url,
        status: body.status,
        applied_at: body.dateApplied ?? body.applied_at,
        notes: body.notes,
      })
      .eq("id", params.id)
      .select("*")
      .single();
    if (error) return jsonError(error);
    return NextResponse.json({ company: data });
  } catch (error) {
    return jsonError(error, "Invalid company payload");
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const { supabase, response } = await requireUser();
  if (response) return response;
  const { error } = await supabase.from("companies").delete().eq("id", params.id);
  if (error) return jsonError(error);
  return NextResponse.json({ ok: true });
}
