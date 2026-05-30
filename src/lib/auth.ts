import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/database.types";
import type { createClient } from "@/lib/supabase/browser";
import { validateLinkedInUrl } from "@/lib/validation";

type AppSupabaseClient = ReturnType<typeof createClient>;

export async function ensureProfile(supabase: AppSupabaseClient, user: User) {
  const { data: existing, error: selectError } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  if (selectError) throw selectError;
  if (existing) return existing as Profile;

  const fullName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "";
  const metadataLinkedInUrl = typeof user.user_metadata?.linkedin_url === "string" ? user.user_metadata.linkedin_url : "";
  const linkedinCheck = validateLinkedInUrl(metadataLinkedInUrl);

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      full_name: fullName,
      notification_email: user.email ?? null,
      linkedin_url: linkedinCheck.valid && linkedinCheck.value ? linkedinCheck.value : null,
      cv_file_url: null,
      email_notifications_enabled: true,
    })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return created as Profile;
}
