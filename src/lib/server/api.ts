import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { supabase, user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { supabase, user: data.user, response: null };
}

export function jsonError(error: unknown, fallback = "Request failed", status = 400) {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status });
}
