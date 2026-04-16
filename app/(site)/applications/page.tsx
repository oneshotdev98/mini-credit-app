import Link from "next/link";
import { db } from "@/db";
import { creditApplications } from "@/db/schema";
import { desc } from "drizzle-orm";
import {
  formatCurrency,
  formatStatus,
  formatCreditTerm,
  timeAgo,
} from "@/lib/utils";
import StatusFilter from "./StatusFilter";

export default async function ApplicationsPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: filterStatus } = await props.searchParams;

  let applications: (typeof creditApplications.$inferSelect)[] = [];
  try {
    applications = await db
      .select()
      .from(creditApplications)
      .orderBy(desc(creditApplications.createdAt));
  } catch {
    // DB might not be ready
  }

  // Compute status counts
  const counts: Record<string, number> = {};
  for (const app of applications) {
    counts[app.status] = (counts[app.status] || 0) + 1;
  }

  // Filter
  const filtered = filterStatus
    ? applications.filter((a) => a.status === filterStatus)
    : applications;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 animate-in">
      <div className="mb-8 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600/90">
          Pipeline
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Applications
        </h1>
        <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
          Review drafts, monitor sent forms, and decide on submissions from one
          place.
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="app-card text-center py-16 sm:py-20 px-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/80 via-transparent to-violet-50/50 pointer-events-none" />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              No applications yet
            </h3>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto text-sm leading-relaxed">
              Create your first application from scratch, or upload a document to
              pre-fill the form.
            </p>
            <Link
              href="/applications/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-500/25"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Create application
            </Link>
          </div>
        </div>
      ) : (
        <>
          <StatusFilter counts={counts} total={applications.length} activeStatus={filterStatus || null} />

          {/* Mobile / narrow: cards */}
          <ul className="md:hidden space-y-3">
            {filtered.map((app) => (
              <li key={app.id}>
                <Link
                  href={`/applications/${app.id}`}
                  className="app-card block p-4 active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">
                        {app.companyName || "Untitled"}
                      </p>
                      {app.dba ? (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          DBA: {app.dba}
                        </p>
                      ) : null}
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                    <span className="font-medium tabular-nums text-slate-800">
                      {formatCurrency(app.creditAmountRequested)}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span>{formatCreditTerm(app.creditTermRequested)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                    <span className="truncate max-w-[70%]">
                      {app.recipientEmail || "No recipient yet"}
                    </span>
                    <span className="tabular-nums shrink-0">{timeAgo(app.createdAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* md+: table */}
          <div className="hidden md:block app-card-solid overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/90">
                    <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3.5">
                      Company
                    </th>
                    <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3.5">
                      Status
                    </th>
                    <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3.5">
                      Amount
                    </th>
                    <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3.5 hidden lg:table-cell">
                      Term
                    </th>
                    <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3.5 hidden xl:table-cell">
                      Recipient
                    </th>
                    <th className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-5 py-3.5 hidden xl:table-cell">
                      Created
                    </th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((app) => (
                    <tr
                      key={app.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/applications/${app.id}`}
                          className="font-semibold text-slate-900 text-sm hover:text-indigo-600 transition-colors"
                        >
                          {app.companyName || "Untitled"}
                        </Link>
                        {app.dba && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            DBA: {app.dba}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-slate-800 tabular-nums">
                        {formatCurrency(app.creditAmountRequested)}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500 hidden lg:table-cell">
                        {formatCreditTerm(app.creditTermRequested)}
                      </td>
                      <td className="px-5 py-4 hidden xl:table-cell">
                        {app.recipientEmail ? (
                          <span className="text-sm text-slate-600 truncate block max-w-[14rem]">
                            {app.recipientEmail}
                          </span>
                        ) : (
                          <span className="text-sm text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-400 tabular-nums hidden xl:table-cell">
                        {timeAgo(app.createdAt)}
                      </td>
                      <td className="px-3 py-4">
                        <Link
                          href={`/applications/${app.id}`}
                          className="inline-flex md:opacity-0 md:group-hover:opacity-100 items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-all text-slate-400 hover:text-indigo-600"
                          aria-label={`Open ${app.companyName || "application"}`}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-14 text-sm text-slate-400">
                No applications match this filter.
              </div>
            )}
          </div>

          {filtered.length === 0 && applications.length > 0 && (
            <p className="md:hidden text-center py-8 text-sm text-slate-400">
              No applications match this filter.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80",
    sent: "bg-sky-50 text-sky-800 ring-1 ring-sky-200/80",
    submitted: "bg-violet-50 text-violet-800 ring-1 ring-violet-200/80",
    approved: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80",
    approved_with_adjustments: "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80",
    rejected: "bg-red-50 text-red-800 ring-1 ring-red-200/80",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] || "bg-slate-100 text-slate-600"}`}
    >
      {formatStatus(status)}
    </span>
  );
}
