import { NextResponse } from "next/server";
import { requireUser, jsonError } from "@/lib/server/api";

export async function GET() {
  const { supabase, user, response } = await requireUser();
  if (response) return response;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
  if (error) return jsonError(error);
  return NextResponse.json({ settings: data });
}

export async function PATCH(request: Request) {
  const { supabase, user, response } = await requireUser();
  if (response) return response;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: body.fullName ?? body.full_name,
        notification_email: body.notificationEmail ?? body.notification_email,
        linkedin_url: body.linkedinProfileUrl ?? body.linkedin_url,
        cv_file_url: body.cvFileUrl ?? body.cv_file_url,
        email_notifications_enabled: body.emailNotificationsEnabled ?? body.email_notifications_enabled,
      })
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (error) return jsonError(error);
    return NextResponse.json({ settings: data });
  } catch (error) {
    return jsonError(error, "Invalid settings payload.");
  }
}
