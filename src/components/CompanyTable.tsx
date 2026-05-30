"use client";

import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { Button } from "@/components/Button";
import { formatDateTime } from "@/lib/format";
import type { Company } from "@/lib/database.types";

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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Tracking link</th>
              <th className="px-4 py-3">Clicks</th>
              <th className="px-4 py-3">Last click</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map((company) => {
              const trackingLink = `${baseUrl}/r/${company.slug}`;
              const editing = editingId === company.id;

              return (
                <tr key={company.id} className="align-top">
                  <td className="px-4 py-4 font-medium text-slate-950">
                    {editing ? (
                      <input
                        value={editingName}
                        onChange={(event) => onEditName?.(event.target.value)}
                        className="w-44 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
                      />
                    ) : (
                      company.name
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <code className="break-all rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">{trackingLink}</code>
                      <CopyButton value={trackingLink} compact />
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{company.clickCount}</td>
                  <td className="px-4 py-4 text-slate-700">{formatDateTime(company.lastClick)}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        company.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {company.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" href={`/dashboard/companies/${company.id}`}>
                        View details
                      </Link>
                      {editing ? (
                        <>
                          <Button type="button" variant="primary" className="px-3 py-1.5 text-xs" onClick={() => onSaveEdit?.(company)}>
                            Save
                          </Button>
                          <Button type="button" variant="ghost" className="px-3 py-1.5 text-xs" onClick={onCancelEdit}>
                            Cancel
                          </Button>
                        </>
                      ) : onStartEdit ? (
                        <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => onStartEdit(company)}>
                          Edit
                        </Button>
                      ) : null}
                      {onToggle ? (
                        <Button type="button" variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => onToggle(company)}>
                          {company.active ? "Deactivate" : "Activate"}
                        </Button>
                      ) : null}
                      {onDelete ? (
                        <Button type="button" variant="danger" className="px-3 py-1.5 text-xs" onClick={() => onDelete(company)}>
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
