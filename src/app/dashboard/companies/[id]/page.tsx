"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/Badge";
import { BarList } from "@/components/BarList";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { ClicksChart } from "@/components/ClicksChart";
import { CompanyTable } from "@/components/CompanyTable";
import { CopyButton } from "@/components/CopyButton";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/Input";
import { Loading } from "@/components/Loading";
import type { ApplicationStatus, Click, Company, CvEvent, Reminder, TimelineEvent, TrackingLink, TrackingSource } from "@/lib/database.types";
import { countBy, enrichTrackingLinks, formatDate, formatDateTime, getBaseUrl } from "@/lib/format";
import { createTrackingSlug } from "@/lib/slugs";
import { createClient } from "@/lib/supabase/browser";
import { nullableClean, validateCompanyName, validateOptionalEmail, validateOptionalUrl } from "@/lib/validation";

const statusOptions: ApplicationStatus[] = ["Not applied", "Applied", "Viewed LinkedIn", "Opened CV", "Downloaded CV", "Interview", "Rejected", "Offer", "Archived"];
const sourceOptions: TrackingSource[] = ["CV", "Cover Letter", "Email", "Email Signature", "LinkedIn Message", "Portfolio", "Other"];

export default function CompanyDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [company, setCompany] = useState<Company | null>(null);
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [cvEvents, setCvEvents] = useState<CvEvent[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [baseUrl, setBaseUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [linkSource, setLinkSource] = useState<TrackingSource>("CV");

  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [recruiterName, setRecruiterName] = useState("");
  const [recruiterEmail, setRecruiterEmail] = useState("");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [appliedAt, setAppliedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("Applied");

  const [reminderDate, setReminderDate] = useState("");
  const [reminderNote, setReminderNote] = useState("");

  useEffect(() => {
    setBaseUrl(getBaseUrl());
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

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

      const [companyResult, linksResult, clicksResult, cvResult, timelineResult, remindersResult] = await Promise.all([
        supabase.from("companies").select("*").eq("id", params.id).maybeSingle(),
        supabase.from("tracking_links").select("*").eq("company_id", params.id).order("created_at", { ascending: false }),
        supabase.from("clicks").select("*").eq("company_id", params.id).order("clicked_at", { ascending: false }),
        supabase.from("cv_events").select("*").eq("company_id", params.id).order("created_at", { ascending: false }),
        supabase.from("timeline_events").select("*").eq("company_id", params.id).order("created_at", { ascending: false }),
        supabase.from("reminders").select("*").eq("company_id", params.id).order("follow_up_at", { ascending: true }),
      ]);

      if (companyResult.error) throw companyResult.error;
      if (linksResult.error) throw linksResult.error;
      if (clicksResult.error) throw clicksResult.error;
      if (cvResult.error) throw cvResult.error;
      if (timelineResult.error) throw timelineResult.error;
      if (remindersResult.error) throw remindersResult.error;

      setCompany(companyResult.data);
      setLinks(linksResult.data ?? []);
      setClicks(clicksResult.data ?? []);
      setCvEvents(cvResult.data ?? []);
      setTimeline(timelineResult.data ?? []);
      setReminders(remindersResult.data ?? []);

      if (companyResult.data) {
        setName(companyResult.data.name);
        setJobTitle(companyResult.data.job_title ?? "");
        setRecruiterName(companyResult.data.recruiter_name ?? "");
        setRecruiterEmail(companyResult.data.recruiter_email ?? "");
        setApplicationUrl(companyResult.data.application_url ?? "");
        setAppliedAt(companyResult.data.applied_at ? companyResult.data.applied_at.slice(0, 10) : "");
        setNotes(companyResult.data.notes ?? "");
        setStatus(companyResult.data.status);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load company details.");
    } finally {
      setLoading(false);
    }
  }

  async function saveCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company) return;
    setError("");

    const nameCheck = validateCompanyName(name);
    if (!nameCheck.valid || !nameCheck.value) {
      setError(nameCheck.message);
      return;
    }
    const emailCheck = validateOptionalEmail(recruiterEmail);
    if (!emailCheck.valid) {
      setError(emailCheck.message);
      return;
    }
    const applicationUrlCheck = validateOptionalUrl(applicationUrl, "application URL");
    if (!applicationUrlCheck.valid) {
      setError(applicationUrlCheck.message);
      return;
    }

    setSaving(true);
    try {
      const oldStatus = company.status;
      const oldNotes = company.notes ?? "";
      const { error: updateError } = await supabase
        .from("companies")
        .update({
          name: nameCheck.value,
          job_title: nullableClean(jobTitle),
          recruiter_name: nullableClean(recruiterName),
          recruiter_email: emailCheck.value,
          application_url: applicationUrlCheck.value,
          status,
          applied_at: appliedAt ? new Date(`${appliedAt}T12:00:00`).toISOString() : null,
          notes: notes.trim() || null,
        })
        .eq("id", company.id);

      if (updateError) throw updateError;

      if (oldStatus !== status) {
        await supabase.from("timeline_events").insert({
          user_id: company.user_id,
          company_id: company.id,
          event_type: "status_changed",
          title: "Status changed",
          description: `${oldStatus} → ${status}`,
          metadata: { from: oldStatus, to: status },
        });
      }

      if (oldNotes !== notes.trim()) {
        await supabase.from("timeline_events").insert({
          user_id: company.user_id,
          company_id: company.id,
          event_type: "notes_updated",
          title: "Notes updated",
          description: "Application notes were updated.",
          metadata: {},
        });
      }

      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save application.");
    } finally {
      setSaving(false);
    }
  }

  async function createLink() {
    if (!company) return;
    setError("");
    try {
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const slug = createTrackingSlug();
        const { data, error: insertError } = await supabase
          .from("tracking_links")
          .insert({ user_id: company.user_id, company_id: company.id, source: linkSource, slug, target_type: "linkedin", active: true })
          .select("*")
          .single();
        if (!insertError && data) {
          await supabase.from("timeline_events").insert({
            user_id: company.user_id,
            company_id: company.id,
            event_type: "tracking_link_created",
            title: "Tracking link created",
            description: `${linkSource} tracking link /profile/${data.slug} was created.`,
            metadata: { source: linkSource, slug: data.slug },
          });
          await load();
          return;
        }
        lastError = insertError;
        if (insertError?.code !== "23505") break;
      }
      throw lastError instanceof Error ? lastError : new Error("Could not create a unique tracking link.");
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : "Could not create link.");
    }
  }

  async function setSuggestedReminder(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setReminderDate(date.toISOString().slice(0, 10));
    setReminderNote(`Follow up after ${days} days`);
  }

  async function saveReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!company || !reminderDate) return;
    setError("");

    const { error: insertError } = await supabase.from("reminders").insert({
      user_id: company.user_id,
      company_id: company.id,
      follow_up_at: new Date(`${reminderDate}T09:00:00`).toISOString(),
      follow_up_note: reminderNote.trim() || null,
      follow_up_done: false,
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }

    await supabase.from("timeline_events").insert({
      user_id: company.user_id,
      company_id: company.id,
      event_type: "reminder_created",
      title: "Follow-up reminder created",
      description: reminderNote.trim() || `Reminder set for ${reminderDate}`,
      metadata: { follow_up_at: reminderDate },
    });
    setReminderDate("");
    setReminderNote("");
    await load();
  }

  async function toggleReminder(reminder: Reminder) {
    const { error: updateError } = await supabase.from("reminders").update({ follow_up_done: !reminder.follow_up_done }).eq("id", reminder.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await load();
  }

  async function deleteCompany() {
    if (!company) return;
    const confirmed = window.confirm(`Delete ${company.name}? This deletes its links, click history, CV events, timeline, and reminders.`);
    if (!confirmed) return;
    const { error: deleteError } = await supabase.from("companies").delete().eq("id", company.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    router.replace("/dashboard/companies");
  }

  if (loading) return <Loading label="Loading company" />;

  if (!company) {
    return <EmptyState title="Application not found" description="This company either does not exist or you do not have access to it." action={<Link href="/dashboard/companies"><Button>Back to companies</Button></Link>} />;
  }

  const rows = enrichTrackingLinks([company], links, clicks, cvEvents);
  const firstLink = links[0];
  const profileLink = firstLink ? `${baseUrl}/profile/${firstLink.slug}` : "";
  const cvLink = firstLink ? `${baseUrl}/cv/${firstLink.slug}` : "";
  const humanClicks = clicks.filter((click) => click.click_type === "human").length;
  const botClicks = clicks.filter((click) => click.click_type === "bot" || click.click_type === "duplicate").length;
  const cvViews = cvEvents.filter((event) => event.event_type === "view").length;
  const cvDownloads = cvEvents.filter((event) => event.event_type === "download").length;

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-glow ring-1 ring-brand-100/60 backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link href="/dashboard/companies" className="text-sm font-semibold text-brand-700 transition hover:text-brand-900 hover:underline">← Companies</Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{company.name}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{company.job_title ?? "Application detail page"} · Last updated {formatDateTime(company.updated_at)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {profileLink ? <CopyButton value={profileLink} /> : null}
            <Button type="button" variant="danger" onClick={deleteCompany}>Delete application</Button>
          </div>
        </div>
      </section>

      {error ? <p className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card><p className="text-sm font-semibold text-slate-500">Total clicks</p><p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{clicks.length}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Likely human</p><p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-700">{humanClicks}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Possible bot</p><p className="mt-2 text-3xl font-semibold tracking-tight text-amber-700">{botClicks}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">CV views</p><p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{cvViews}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">CV downloads</p><p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{cvDownloads}</p></Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Application details" description="Edit recruiter notes and status manually. Likely-human clicks can automatically move Applied → Link Opened." />
          <form onSubmit={saveCompany} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Company name" required value={name} onChange={(event) => setName(event.target.value)} />
              <Input label="Job title" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Recruiter name" value={recruiterName} onChange={(event) => setRecruiterName(event.target.value)} />
              <Input label="Recruiter email" type="email" value={recruiterEmail} onChange={(event) => setRecruiterEmail(event.target.value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Input label="Application URL" type="url" value={applicationUrl} onChange={(event) => setApplicationUrl(event.target.value)} />
              <Input label="Applied at" type="date" value={appliedAt} onChange={(event) => setAppliedAt(event.target.value)} />
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-800">Status</span>
                <select value={status} onChange={(event) => setStatus(event.target.value as ApplicationStatus)} className="w-full rounded-2xl border border-brand-100 bg-white/95 px-3.5 py-3 text-sm text-slate-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100">
                  {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-800">Notes</span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} className="w-full rounded-2xl border border-brand-100 bg-white/95 px-3.5 py-3 text-sm text-slate-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
            </label>
            <Button type="submit" disabled={saving}>{saving ? "Saving" : "Save application"}</Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Follow-up reminder" description="Set manual reminders visible inside the dashboard." />
          <form onSubmit={saveReminder} className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setSuggestedReminder(7)}>After 7 days</Button>
              <Button type="button" variant="secondary" onClick={() => setSuggestedReminder(14)}>After 14 days</Button>
              <Button type="button" variant="secondary" onClick={() => { setSuggestedReminder(2); setReminderNote("Follow up after link opened"); }}>After link opened</Button>
            </div>
            <Input label="Reminder date" type="date" required value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} />
            <Input label="Reminder note" value={reminderNote} onChange={(event) => setReminderNote(event.target.value)} />
            <Button type="submit">Add reminder</Button>
          </form>
          <div className="mt-5 space-y-3">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="rounded-2xl border border-brand-100 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{formatDate(reminder.follow_up_at)}</p>
                  <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={() => toggleReminder(reminder)}>{reminder.follow_up_done ? "Mark open" : "Mark done"}</Button>
                </div>
                <p className="mt-1 text-xs text-slate-500">{reminder.follow_up_note ?? "No note"}</p>
                <Badge tone={reminder.follow_up_done ? "green" : "amber"}>{reminder.follow_up_done ? "Done" : "Open"}</Badge>
              </div>
            ))}
            {reminders.length === 0 ? <p className="text-sm text-slate-500">No reminders yet.</p> : null}
          </div>
        </Card>
      </section>

      <Card>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardHeader title="Tracking links" description="Each company can have multiple source-specific public links." />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select value={linkSource} onChange={(event) => setLinkSource(event.target.value as TrackingSource)} className="rounded-2xl border border-brand-100 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100">
              {sourceOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <Button type="button" onClick={createLink}>Create link</Button>
          </div>
        </div>
        {rows.length === 0 ? <EmptyState title="No links" description="Create a source-specific link for this company." /> : <CompanyTable rows={rows} baseUrl={baseUrl} />}
        {firstLink ? (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl bg-brand-50 p-3 ring-1 ring-brand-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Example CV page</p>
              <code className="mt-2 block break-all text-xs text-slate-700">{cvLink}</code>
              <div className="mt-3"><CopyButton value={cvLink} compact /></div>
            </div>
            <div className="rounded-2xl bg-brand-50 p-3 ring-1 ring-brand-100">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Example LinkedIn redirect</p>
              <code className="mt-2 block break-all text-xs text-slate-700">{profileLink}</code>
              <div className="mt-3"><CopyButton value={profileLink} compact /></div>
            </div>
          </div>
        ) : null}
      </Card>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Clicks over time" />
          <ClicksChart clicks={clicks} />
        </Card>
        <Card>
          <CardHeader title="Browser / device stats" />
          <div className="space-y-5">
            <BarList data={countBy(clicks.map((click) => click.browser))} />
            <BarList data={countBy(clicks.map((click) => click.device_type))} />
          </div>
        </Card>
      </section>

      <Card>
        <CardHeader title="Click history" description="Duplicates and security scanners are stored but classified separately." />
        {clicks.length === 0 ? (
          <EmptyState title="No clicks yet" description="When someone opens a tracking link, click events will appear here." />
        ) : (
          <div className="overflow-hidden rounded-3xl border border-brand-100 bg-white/90">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-brand-100 text-sm">
                <thead className="bg-brand-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Clicked at</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Country</th>
                    <th className="px-4 py-3">Browser</th>
                    <th className="px-4 py-3">Device</th>
                    <th className="px-4 py-3">OS</th>
                    <th className="px-4 py-3">IP hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50 bg-white">
                  {clicks.map((click) => {
                    const link = links.find((item) => item.id === click.tracking_link_id);
                    return (
                      <tr key={click.id} className="transition-colors hover:bg-brand-50/35">
                        <td className="px-4 py-3 font-medium text-slate-900">{formatDateTime(click.clicked_at)}</td>
                        <td className="px-4 py-3"><Badge tone={click.click_type === "human" ? "green" : click.click_type === "duplicate" ? "amber" : "slate"}>{click.click_type}</Badge></td>
                        <td className="px-4 py-3 text-slate-600">{link?.source ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{click.country ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{click.browser ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{click.device_type ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{click.os ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-600"><code className="text-xs">{click.ip_hash ? `${click.ip_hash.slice(0, 12)}…` : "—"}</code></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Timeline" description="Application changes and public events are combined into a readable event history." />
        {timeline.length === 0 ? <EmptyState title="No timeline events" description="Create links, update status, or receive clicks to build the timeline." /> : (
          <ol className="relative space-y-4 border-l border-brand-100 pl-5">
            {timeline.map((event) => (
              <li key={event.id} className="relative rounded-2xl border border-brand-100 bg-white p-4">
                <span className="absolute -left-[29px] top-5 h-3 w-3 rounded-full bg-brand-600 ring-4 ring-brand-50" />
                <p className="text-sm font-semibold text-slate-950">{event.title}</p>
                {event.description ? <p className="mt-1 text-sm text-slate-600">{event.description}</p> : null}
                <p className="mt-2 text-xs text-slate-500">{formatDateTime(event.created_at)}</p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
