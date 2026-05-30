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
import { normalizeText, validateEmail, validateLinkedInUrl, validateOptionalUrl } from "@/lib/validation";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState(LINKEDIN_URL_PREFIX);
  const [cvFileUrl, setCvFileUrl] = useState("");
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
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
      setNotificationEmail(profileRecord.notification_email ?? userData.user.email ?? "");
      setLinkedinUrl(profileRecord.linkedin_url ?? LINKEDIN_URL_PREFIX);
      setCvFileUrl(profileRecord.cv_file_url ?? "");
      setEmailNotificationsEnabled(profileRecord.email_notifications_enabled);
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

    const emailCheck = validateEmail(notificationEmail);
    if (!emailCheck.valid || !emailCheck.value) {
      setError(emailCheck.message);
      return;
    }

    const linkedinCheck = validateLinkedInUrl(linkedinUrl);
    if (!linkedinCheck.valid || !linkedinCheck.value) {
      setError(linkedinCheck.message);
      return;
    }

    const cvCheck = validateOptionalUrl(cvFileUrl, "CV file URL");
    if (!cvCheck.valid) {
      setError(cvCheck.message);
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: cleanName,
          notification_email: emailCheck.value,
          linkedin_url: linkedinCheck.value,
          cv_file_url: cvCheck.value,
          email_notifications_enabled: emailNotificationsEnabled,
        })
        .eq("id", profile.id);

      if (updateError) throw updateError;
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
    <div className="max-w-4xl space-y-8">
      <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft ring-1 ring-brand-100/60 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Profile setup</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Settings</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Configure your LinkedIn destination, CV file URL, and first-click notification preference.</p>
      </div>

      <Card>
        <CardHeader title="Profile and tracking targets" description="The LinkedIn URL is required. The CV file URL is optional but required for CV download tracking." />
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Full name" required value={fullName} onChange={(event) => setFullName(event.target.value)} />
            <Input label="Notification email" type="email" required value={notificationEmail} onChange={(event) => setNotificationEmail(event.target.value)} />
          </div>
          <Input label="LinkedIn profile URL" type="url" required value={linkedinUrl} onChange={(event) => setLinkedinUrl(event.target.value)} hint={`Must start with ${LINKEDIN_URL_PREFIX}`} />
          <Input label="CV file URL" type="url" value={cvFileUrl} onChange={(event) => setCvFileUrl(event.target.value)} hint="Paste a public PDF link. If empty, /cv/[slug]/download shows a clean error." />
          <label className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
            <input type="checkbox" checked={emailNotificationsEnabled} onChange={(event) => setEmailNotificationsEnabled(event.target.checked)} className="mt-1 h-4 w-4 rounded border-brand-300 text-brand-700 focus:ring-brand-500" />
            <span>
              <span className="block text-sm font-semibold text-slate-900">Enable first-click email notifications</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Notifications are sent only for the first likely-human click after an email provider is configured server-side.</span>
            </span>
          </label>
          {error ? <p className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
          {message ? <p className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{message}</p> : null}
          <Button type="submit" disabled={saving}>{saving ? "Saving" : "Save settings"}</Button>
        </form>
      </Card>
    </div>
  );
}
