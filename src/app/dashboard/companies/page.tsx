"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { Card, CardHeader } from "@/components/Card";
import { CompanyTable, type CompanyWithStats } from "@/components/CompanyTable";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/Input";
import { Loading } from "@/components/Loading";
import { ensureProfile } from "@/lib/auth";
import type { Click, Company, Profile } from "@/lib/database.types";
import { enrichCompanies, getBaseUrl } from "@/lib/format";
import { createTrackingSlug } from "@/lib/slugs";
import { createClient } from "@/lib/supabase/browser";
import { validateCompanyName } from "@/lib/validation";

export default function CompaniesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

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

      const [{ data: companiesData, error: companiesError }, { data: clicksData, error: clicksError }] = await Promise.all([
        supabase.from("companies").select("*").order("created_at", { ascending: false }),
        supabase.from("clicks").select("*").order("clicked_at", { ascending: false }),
      ]);

      if (companiesError) throw companiesError;
      if (clicksError) throw clicksError;

      setCompanies(companiesData ?? []);
      setClicks(clicksData ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load companies.");
    } finally {
      setLoading(false);
    }
  }

  async function insertCompanyWithRetry(userId: string, name: string, targetUrl: string) {
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const slug = createTrackingSlug(name);
      const { error: insertError } = await supabase.from("companies").insert({
        user_id: userId,
        name,
        slug,
        target_url: targetUrl,
        active: true,
      });

      if (!insertError) return;
      lastError = insertError;
      if (insertError.code !== "23505") break;
    }

    throw lastError instanceof Error ? lastError : new Error("Could not create company link.");
  }

  async function onAddCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const validation = validateCompanyName(companyName);
    if (!validation.valid || !validation.value) {
      setError(validation.message);
      return;
    }

    if (!profile?.linkedin_url) {
      setError("Add your LinkedIn URL in Settings before creating tracking links.");
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

      await insertCompanyWithRetry(userData.user.id, validation.value, profile.linkedin_url);
      setCompanyName("");
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not create company.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleCompany(company: CompanyWithStats) {
    setError("");
    const { error: updateError } = await supabase.from("companies").update({ active: !company.active }).eq("id", company.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await load();
  }

  async function deleteCompany(company: CompanyWithStats) {
    const confirmed = window.confirm(`Delete ${company.name}? This also deletes its click history.`);
    if (!confirmed) return;

    setError("");
    const { error: deleteError } = await supabase.from("companies").delete().eq("id", company.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await load();
  }

  function startEdit(company: CompanyWithStats) {
    setEditingId(company.id);
    setEditingName(company.name);
  }

  async function saveEdit(company: CompanyWithStats) {
    setError("");
    const validation = validateCompanyName(editingName);
    if (!validation.valid || !validation.value) {
      setError(validation.message);
      return;
    }

    const { error: updateError } = await supabase.from("companies").update({ name: validation.value }).eq("id", company.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setEditingId(null);
    setEditingName("");
    await load();
  }

  const enrichedCompanies = useMemo(() => enrichCompanies(companies, clicks), [companies, clicks]);

  if (loading) return <Loading label="Loading companies" />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Companies</h1>
        <p className="mt-2 text-sm text-slate-500">Create one tracking link for each company or application channel.</p>
      </div>

      <Card>
        <CardHeader title="Add company" description="A globally unique slug is generated automatically, for example bmw-k8x2qf." />
        <form onSubmit={onAddCompany} className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <Input label="Company name" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="BMW" />
          <Button type="submit" disabled={submitting}>{submitting ? "Adding" : "Add company"}</Button>
        </form>
        {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
      </Card>

      {enrichedCompanies.length === 0 ? (
        <EmptyState title="No companies yet" description="Add your first company to generate a tracking link." />
      ) : (
        <CompanyTable
          companies={enrichedCompanies}
          baseUrl={baseUrl}
          onToggle={toggleCompany}
          onDelete={deleteCompany}
          editingId={editingId}
          editingName={editingName}
          onStartEdit={startEdit}
          onEditName={setEditingName}
          onSaveEdit={saveEdit}
          onCancelEdit={() => {
            setEditingId(null);
            setEditingName("");
          }}
        />
      )}
    </div>
  );
}
