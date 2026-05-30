"use client";

import Link from "next/link";
import { Button } from "@/components/Button";
import { CopyButton } from "@/components/CopyButton";
import type { Company } from "@/lib/database.types";
import { formatDateTime } from "@/lib/format";

export type CompanyWithStats = Company & {
  clickCount: number;
  lastClick: string | null;
};

export function CompanyTable({
  companies,
  baseUrl,
  onToggle,
  onDelete,
  editingId,
  editingName,
  onStartEdit,
  onEditName,
  onSaveEdit,
  onCancelEdit,
}: {
  companies: CompanyWithStats[];
  baseUrl: string;
  onToggle?: (company: CompanyWithStats) => void;
  onDelete?: (company: CompanyWithStats) => void;
  editingId?: string | null;
  editingName?: string;
  onStartEdit?: (company: CompanyWithStats) => void;
  onEditName?: (value: string) => void;
  onSaveEdit?: (company: CompanyWithStats) => void;
  onCancelEdit?: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-brand-100 bg-white/90 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-brand-100 text-sm">
          <thead className="bg-brand-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Tracking link</th>
              <th className="px-4 py-3">Clicks</th>
              <th className="px-4 py-3">Last click</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-50">
            {companies.map((company) => {
              const trackingLink = `${baseUrl}/r/${company.slug}`;
              const editing = editingId === company.id;

              return (
                <tr key={company.id} className="align-top transition-colors hover:bg-brand-50/35">
                  <td className="px-4 py-4 font-semibold text-slate-950">
                    {editing ? (
                      <input
                        required
                        value={editingName}
                        onChange={(event) => onEditName?.(event.target.value)}
                        className="w-44 rounded-xl border border-brand-100 px-2.5 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
                      />
                    ) : (
                      company.name
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <code className="break-all rounded-xl bg-brand-50 px-2.5 py-1.5 text-xs text-slate-700 ring-1 ring-brand-100">{trackingLink}</code>
                      <CopyButton value={trackingLink} compact />
                    </div>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-800">{company.clickCount}</td>
                  <td className="px-4 py-4 text-slate-600">{formatDateTime(company.lastClick)}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        company.active ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                      }`}
                    >
                      {company.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link className="rounded-xl border border-brand-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-brand-50 hover:text-brand-800" href={`/dashboard/companies/${company.id}`}>
                        View details
                      </Link>
                      {editing ? (
                        <>
                          <Button type="button" variant="primary" className="px-3 py-2 text-xs" onClick={() => onSaveEdit?.(company)}>
                            Save
                          </Button>
                          <Button type="button" variant="ghost" className="px-3 py-2 text-xs" onClick={onCancelEdit}>
                            Cancel
                          </Button>
                        </>
                      ) : onStartEdit ? (
                        <Button type="button" variant="secondary" className="px-3 py-2 text-xs" onClick={() => onStartEdit(company)}>
                          Edit
                        </Button>
                      ) : null}
                      {onToggle ? (
                        <Button type="button" variant="secondary" className="px-3 py-2 text-xs" onClick={() => onToggle(company)}>
                          {company.active ? "Deactivate" : "Activate"}
                        </Button>
                      ) : null}
                      {onDelete ? (
                        <Button type="button" variant="danger" className="px-3 py-2 text-xs" onClick={() => onDelete(company)}>
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
