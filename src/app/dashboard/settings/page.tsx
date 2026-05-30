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
import { LINKEDIN_URL_PREFIX } from "@/lib/supabase/config";
import { normalizeText, validateLinkedInUrl } from "@/lib/validation";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState(LINKEDIN_URL_PREFIX);
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
      setLinkedinUrl(profileRecord.linkedin_url ?? LINKEDIN_URL_PREFIX);
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

    const cleanName = normalizeText(fullName);
    if (!cleanName) {
      setError("Full name is required.");
      return;
    }

    const linkedinCheck = validateLinkedInUrl(linkedinUrl);
    if (!linkedinCheck.valid || !linkedinCheck.value) {
      setError(linkedinCheck.message);
      return;
    }

    setSaving(true);
    try {
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

      setMessage("Profile settings saved.");
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
      <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft ring-1 ring-brand-100/60 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Profile setup</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Settings</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Add your own LinkedIn profile URL. Existing tracking links will redirect to the profile saved here.</p>
      </div>

      <Card>
        <CardHeader title="Profile" description="The LinkedIn URL is required before tracking links can be created." />
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Full name" required value={fullName} onChange={(event) => setFullName(event.target.value)} />
          <Input
            label="LinkedIn profile URL"
            type="url"
            required
            value={linkedinUrl}
            onChange={(event) => setLinkedinUrl(event.target.value)}
            hint={`Must start with ${LINKEDIN_URL_PREFIX}`}
          />
          {error ? <p className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
          {message ? <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
          <Button type="submit" disabled={saving}>{saving ? "Saving" : "Save profile"}</Button>
        </form>
      </Card>
    </div>
  );
}
