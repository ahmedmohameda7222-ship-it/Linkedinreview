"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { Input } from "@/components/Input";
import { Loading } from "@/components/Loading";
import { ensureProfile } from "@/lib/auth";
import type { Profile } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/browser";
import { normalizeText, validateLinkedInUrl } from "@/lib/validation";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) {
        router.replace("/login");
        return;
      }

      const profileRecord = await ensureProfile(supabase, userData.user);
      setProfile(profileRecord);
      setFullName(profileRecord.full_name ?? "");
      setLinkedinUrl(profileRecord.linkedin_url ?? "");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load settings.");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!profile) return;

    const linkedinCheck = validateLinkedInUrl(linkedinUrl);
    if (!linkedinCheck.valid || !linkedinCheck.value) {
      setError(linkedinCheck.message);
      return;
    }

    setSaving(true);
    try {
      const cleanName = normalizeText(fullName);
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ full_name: cleanName, linkedin_url: linkedinCheck.value })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      const { error: companyUpdateError } = await supabase
        .from("companies")
        .update({ target_url: linkedinCheck.value })
        .eq("user_id", profile.user_id);

      if (companyUpdateError) throw companyUpdateError;

      setMessage("Settings saved.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading label="Loading settings" />;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Settings</h1>
        <p className="mt-2 text-sm text-slate-500">Change your LinkedIn target URL. Existing tracking links will redirect to this profile.</p>
      </div>

      <Card>
        <CardHeader title="Profile" description="This information is private to your account." />
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          <Input label="LinkedIn profile URL" type="url" value={linkedinUrl} onChange={(event) => setLinkedinUrl(event.target.value)} />
          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
          {message ? <p className="rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{message}</p> : null}
          <Button type="submit" disabled={saving}>{saving ? "Saving" : "Save LinkedIn URL"}</Button>
        </form>
      </Card>
    </div>
  );
}
