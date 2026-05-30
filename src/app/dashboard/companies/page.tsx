"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { CompanyTable } from "@/components/CompanyTable";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/Input";
import { Loading } from "@/components/Loading";
import { ensureProfile } from "@/lib/auth";
import type { Click, Company, CvEvent, Profile, TrackingLink, TrackingSource } from "@/lib/database.types";
import { enrichTrackingLinks, getBaseUrl } from "@/lib/format";
import { createTrackingSlug } from "@/lib/slugs";
import { createClient } from "@/lib/supabase/browser";
import { nullableClean, validateCompanyName, validateOptionalEmail, validateOptionalUrl } from "@/lib/validation";

const sourceOptions: TrackingSource[] = ["CV", "Cover Letter", "Email", "Email Signature", "LinkedIn Message", "Portfolio", "Other"];

export default function CompaniesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [trackingLinks, setTrackingLinks] = useState<TrackingLink[]>([]);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [cvEvents, setCvEvents] = useState<CvEvent[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [baseUrl, setBaseUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [existingCompanyId, setExistingCompanyId] = useState("new");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [recruiterName, setRecruiterName] = useState("");
  const [recruiterEmail, setRecruiterEmail] = useState("");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [appliedAt, setAppliedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState<TrackingSource>("CV");

  useEffect(() => {
    setBaseUrl(getBaseUrl());
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

      const [companiesResult, linksResult, clicksResult, cvResult] = await Promise.all([
        supabase.from("companies").select("*").order("created_at", { ascending: false }),
        supabase.from("tracking_links").select("*").order("created_at", { ascending: false }),
        supabase.from("clicks").select("*").order("clicked_at", { ascending: false }),
        supabase.from("cv_events").select("*").order("created_at", { ascending: false }),
      ]);

      if (companiesResult.error) throw companiesResult.error;
      if (linksResult.error) throw linksResult.error;
      if (clicksResult.error) throw clicksResult.error;
      if (cvResult.error) throw cvResult.error;

      setCompanies(companiesResult.data ?? []);
      setTrackingLinks(linksResult.data ?? []);
      setClicks(clicksResult.data ?? []);
      setCvEvents(cvResult.data ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load companies.");
    } finally {
      setLoading(false);
    }
  }

  async function insertTrackingLinkWithRetry(userId: string, companyId: string, selectedSource: TrackingSource) {
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const slug = createTrackingSlug();
      const { data, error: insertError } = await supabase
        .from("tracking_links")
        .insert({ user_id: userId, company_id: companyId, source: selectedSource, slug, target_type: "linkedin", active: true })
        .select("*")
        .single();
      if (!insertError && data) return data;
      lastError = insertError;
      if (insertError?.code !== "23505") break;
    }
    throw lastError instanceof Error ? lastError : new Error("Could not create a unique tracking link.");
  }

  async function onAddLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!profile?.linkedin_url) {
      setError("Add your LinkedIn URL in Settings before creating tracking links.");
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

    setSubmitting(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) {
        router.replace("/login");
        return;
      }

      let companyId = existingCompanyId;
      if (existingCompanyId === "new") {
        const validation = validateCompanyName(companyName);
        if (!validation.valid || !validation.value) {
          setError(validation.message);
          return;
        }

        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .insert({
            user_id: userData.user.id,
            name: validation.value,
            job_title: nullableClean(jobTitle),
            recruiter_name: nullableClean(recruiterName),
            recruiter_email: emailCheck.value,
            application_url: applicationUrlCheck.value,
            status: "Applied",
            applied_at: appliedAt ? new Date(`${appliedAt}T12:00:00`).toISOString() : null,
            notes: notes.trim() || null,
          })
          .select("*")
          .single();

        if (companyError) throw companyError;
        companyId = companyData.id;

        await supabase.from("timeline_events").insert({
          user_id: userData.user.id,
          company_id: companyId,
          event_type: "company_created",
          title: "Company created",
          description: `${validation.value} was added to the application tracker.`,
          metadata: {},
        });
      }

      const link = await insertTrackingLinkWithRetry(userData.user.id, companyId, source);
      await supabase.from("timeline_events").insert({
        user_id: userData.user.id,
        company_id: companyId,
        event_type: "tracking_link_created",
        title: "Tracking link created",
        description: `${source} tracking link /profile/${link.slug} was created.`,
        metadata: { source, slug: link.slug },
      });

      setCompanyName("");
      setJobTitle("");
      setRecruiterName("");
      setRecruiterEmail("");
      setApplicationUrl("");
      setAppliedAt("");
      setNotes("");
      setExistingCompanyId("new");
      setSource("CV");
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create tracking link.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleLink(row: ReturnType<typeof enrichTrackingLinks>[number]) {
    setError("");
    const { error: updateError } = await supabase.from("tracking_links").update({ active: !row.active }).eq("id", row.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await load();
  }

  async function deleteLink(row: ReturnType<typeof enrichTrackingLinks>[number]) {
    const confirmed = window.confirm(`Delete ${row.company.name} / ${row.source} tracking link? Click history for this link will also be deleted.`);
    if (!confirmed) return;
    setError("");
    const { error: deleteError } = await supabase.from("tracking_links").delete().eq("id", row.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await load();
  }

  const rows = useMemo(() => enrichTrackingLinks(companies, trackingLinks, clicks, cvEvents), [companies, trackingLinks, clicks, cvEvents]);
  const visibleRows = rows.filter((row) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [row.company.name, row.company.job_title, row.company.recruiter_name, row.source, row.slug, row.company.status].some((value) => value?.toLowerCase().includes(q));
  });

  if (loading) return <Loading label="Loading applications" />;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft ring-1 ring-brand-100/60 backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-700">Applications and source links</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Companies</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Create multiple neutral links per company, such as CV, cover letter, email, and LinkedIn message links.</p>
      </div>

      <Card>
        <CardHeader title="Create application / tracking link" description="Public slugs are random, globally unique, and do not include company names." />
        <form onSubmit={onAddLink} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-800">Company/application</span>
              <select value={existingCompanyId} onChange={(event) => setExistingCompanyId(event.target.value)} className="w-full rounded-2xl border border-brand-100 bg-white/95 px-3.5 py-3 text-sm text-slate-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100">
                <option value="new">Create new company/application</option>
                {companies.map((company) => <option key={company.id} value={company.id}>{company.name}{company.job_title ? ` — ${company.job_title}` : ""}</option>)}
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-800">Source</span>
              <select value={source} onChange={(event) => setSource(event.target.value as TrackingSource)} className="w-full rounded-2xl border border-brand-100 bg-white/95 px-3.5 py-3 text-sm text-slate-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100">
                {sourceOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>

          {existingCompanyId === "new" ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Company name" required value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="BMW" />
                <Input label="Job title" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} placeholder="Werkstudent Software Testautomatisierung" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Recruiter name" value={recruiterName} onChange={(event) => setRecruiterName(event.target.value)} />
                <Input label="Recruiter email" type="email" value={recruiterEmail} onChange={(event) => setRecruiterEmail(event.target.value)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Application URL" type="url" value={applicationUrl} onChange={(event) => setApplicationUrl(event.target.value)} />
                <Input label="Applied at" type="date" value={appliedAt} onChange={(event) => setAppliedAt(event.target.value)} />
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-800">Notes</span>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="w-full rounded-2xl border border-brand-100 bg-white/95 px-3.5 py-3 text-sm text-slate-950 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" placeholder="Multiline notes, contact context, next steps..." />
              </label>
            </>
          ) : null}

          {!profile?.linkedin_url ? <p className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-semibold text-amber-800">Add your LinkedIn URL in Settings before creating tracking links.</p> : null}
          {error ? <p className="rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
          <Button type="submit" disabled={submitting}>{submitting ? "Creating" : "Create tracking link"}</Button>
        </form>
      </Card>

      <Card>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardHeader title="Tracking links" description="Use /profile/[slug] for LinkedIn tracking or /cv/[slug] for CV landing pages." />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company, source, status..." className="rounded-2xl border border-brand-100 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100" />
        </div>
        {visibleRows.length === 0 ? (
          <EmptyState title="No tracking links" description="Create your first source-specific tracking link above." />
        ) : (
          <CompanyTable rows={visibleRows} baseUrl={baseUrl} onToggle={toggleLink} onDelete={deleteLink} />
        )}
      </Card>
    </div>
  );
}
