import { db } from "@/db";
import { creditApplications, tradeReferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  formatCurrency,
  formatCreditTerm,
  formatRevenueBand,
  formatStatus,
  formatDate,
} from "@/lib/utils";
import SendPanel from "./SendPanel";
import DecisionPanel from "./DecisionPanel";
import AiAdvisoryCard from "./AiAdvisoryCard";
import EditMode from "./EditMode";
import CopyLinkButtonClient from "./CopyLinkButtonClient";

export default async function ApplicationDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const app = await db.query.creditApplications.findFirst({
    where: eq(creditApplications.id, id),
    with: { tradeReferences: true },
  });

  if (!app) notFound();

  const refs = app.tradeReferences.sort((a, b) => a.slot - b.slot);
  const ref1 = refs.find((r) => r.slot === 1);
  const ref2 = refs.find((r) => r.slot === 2);

  const isEditable = app.status === "draft";
  const isReviewable = app.status === "submitted";
  const isDecided = [
    "approved",
    "approved_with_adjustments",
    "rejected",
  ].includes(app.status);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const applyUrl = app.accessToken
    ? `${baseUrl}/apply/${app.accessToken}`
    : null;

  const editInitialData = {
    companyName: app.companyName,
    dba: app.dba,
    countryOfIncorporation: app.countryOfIncorporation,
    websiteUrl: app.websiteUrl,
    creditAmountRequested: app.creditAmountRequested,
    creditTermRequested: app.creditTermRequested,
    revenueBand: app.revenueBand,
    billingContactName: app.billingContactName,
    billingContactEmail: app.billingContactEmail,
    tradeRef1: ref1
      ? {
          businessName: ref1.businessName,
          engagementStart: ref1.engagementStart,
          engagementEnd: ref1.engagementEnd,
          contactName: ref1.contactName,
          contactEmail: ref1.contactEmail,
          contactPosition: ref1.contactPosition,
        }
      : undefined,
    tradeRef2: ref2
      ? {
          businessName: ref2.businessName,
          engagementStart: ref2.engagementStart,
          engagementEnd: ref2.engagementEnd,
          contactName: ref2.contactName,
          contactEmail: ref2.contactEmail,
          contactPosition: ref2.contactPosition,
        }
      : undefined,
  };

  const pageMaxWidth = isEditable ? "max-w-6xl" : "max-w-3xl";

  return (
    <div
      className={`${pageMaxWidth} mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 animate-in`}
    >
      <Link
        href="/applications"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 mb-6 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Applications
      </Link>

      <div className="app-card p-5 sm:p-6 mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-indigo-600/90 mb-1.5">
            Application
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight break-words">
            {app.companyName || "Untitled application"}
          </h1>
          {app.dba && (
            <p className="text-sm text-slate-500 mt-1">DBA: {app.dba}</p>
          )}
        </div>
        <div className="shrink-0 sm:pt-1">
          <StatusBadge status={app.status} />
        </div>
      </div>

      <div className="app-card-solid p-5 sm:p-6 mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Progress
        </p>
        <StatusStepper
          status={app.status}
          createdAt={app.createdAt}
          sentAt={app.sentAt}
          submittedAt={app.submittedAt}
          decidedAt={app.decidedAt}
        />
      </div>

      {app.recipientEmail && (
        <div className="app-card p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-sky-100 bg-sky-50/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white border border-sky-200/80 flex items-center justify-center shrink-0 shadow-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-sky-950 truncate">
                Sent to {app.recipientName}
              </p>
              <p className="text-xs text-sky-800/90 truncate">
                {app.recipientEmail}
              </p>
            </div>
          </div>
          {applyUrl && (
            <div className="shrink-0 sm:self-center">
              <CopyLinkButtonClient url={applyUrl} />
            </div>
          )}
        </div>
      )}

      {isDecided && (
        <DecisionBanner
          status={app.status}
          revisedAmount={app.decisionRevisedCreditAmount}
          revisedTerm={app.decisionRevisedCreditTerm}
        />
      )}

      {isDecided && app.aiRecommendationSummary?.trim() && (
        <AiAdvisoryCard
          applicationId={app.id}
          initialSummary={app.aiRecommendationSummary}
          fetchIfEmpty={false}
        />
      )}

      {isEditable ? (
        <div className="mt-6 lg:mt-8 lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
          <aside className="mb-6 lg:mb-0 lg:col-span-5 xl:col-span-4 lg:order-2 lg:sticky lg:top-28 lg:self-start shrink-0">
            <SendPanel applicationId={app.id} />
          </aside>
          <div className="min-w-0 lg:col-span-7 xl:col-span-8 lg:order-1">
            <EditMode applicationId={app.id} initialData={editInitialData} />
          </div>
        </div>
      ) : (
        /* Read-only view */
        <div className="space-y-5">
          <ReadOnlySection title="Company Information" icon="building">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <DataField label="Company Name" value={app.companyName} />
              <DataField label="DBA" value={app.dba} />
              <DataField label="Country" value={app.countryOfIncorporation} />
              <DataField label="Website" value={app.websiteUrl} isUrl />
            </div>
          </ReadOnlySection>

          {refs.map((ref) => (
            <ReadOnlySection
              key={ref.id}
              title={`Trade Reference ${ref.slot}`}
              icon="users"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <DataField
                  label="Business Name"
                  value={ref.businessName}
                  span2
                />
                <DataField
                  label="Engagement Start"
                  value={ref.engagementStart ? formatDate(ref.engagementStart) : null}
                />
                <DataField
                  label="Engagement End"
                  value={ref.engagementEnd ? formatDate(ref.engagementEnd) : null}
                />
                <DataField label="Contact Name" value={ref.contactName} />
                <DataField label="Contact Email" value={ref.contactEmail} />
                <DataField label="Contact Position" value={ref.contactPosition} span2 />
              </div>
            </ReadOnlySection>
          ))}

          <ReadOnlySection title="Credit Details" icon="dollar">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <DataField
                label="Amount Requested"
                value={formatCurrency(app.creditAmountRequested)}
                highlight
              />
              <DataField
                label="Credit Term"
                value={formatCreditTerm(app.creditTermRequested)}
              />
              <DataField
                label="Revenue Band"
                value={formatRevenueBand(app.revenueBand)}
              />
            </div>
          </ReadOnlySection>

          <ReadOnlySection title="Billing Contact" icon="receipt">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <DataField label="Name" value={app.billingContactName} />
              <DataField label="Email" value={app.billingContactEmail} />
            </div>
          </ReadOnlySection>
        </div>
      )}

      {/* Decision Panel */}
      {isReviewable && (
        <div className="mt-8 space-y-6">
          <AiAdvisoryCard
            applicationId={app.id}
            initialSummary={app.aiRecommendationSummary}
          />
          <DecisionPanel applicationId={app.id} />
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

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
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || "bg-slate-100 text-slate-600"}`}>
      {formatStatus(status)}
    </span>
  );
}

function StatusStepper({
  status,
  createdAt,
  sentAt,
  submittedAt,
  decidedAt,
}: {
  status: string;
  createdAt: Date;
  sentAt: Date | null;
  submittedAt: Date | null;
  decidedAt: Date | null;
}) {
  const steps = [
    { label: "Created", date: createdAt, done: true },
    { label: "Sent", date: sentAt, done: !!sentAt },
    { label: "Submitted", date: submittedAt, done: !!submittedAt },
    {
      label: status === "rejected" ? "Rejected" : "Decided",
      date: decidedAt,
      done: !!decidedAt,
    },
  ];

  return (
    <>
      {/* Mobile: vertical timeline */}
      <ol className="sm:hidden relative space-y-0 pl-1">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const next = steps[i + 1];
          const segmentComplete = !isLast && !!next?.done;
          return (
            <li key={step.label} className="relative flex gap-3 pb-6 last:pb-0">
              {!isLast && (
                <span
                  className={`absolute left-[13px] top-7 bottom-0 w-0.5 rounded-full ${
                    segmentComplete ? "bg-indigo-500" : "bg-slate-200"
                  }`}
                  aria-hidden
                />
              )}
              <div
                className={`relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  step.done
                    ? status === "rejected" && i === steps.length - 1
                      ? "bg-red-100 text-red-700 ring-2 ring-red-200/80"
                      : "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                    : "bg-slate-100 text-slate-400 ring-1 ring-slate-200/80"
                }`}
              >
                {step.done ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  i + 1
                )}
              </div>
              <div className="min-w-0 pt-0.5">
                <p className={`text-sm font-semibold ${step.done ? "text-slate-900" : "text-slate-400"}`}>
                  {step.label}
                </p>
                {step.date ? (
                  <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    {formatDate(step.date)}
                  </p>
                ) : step.done ? null : (
                  <p className="text-xs text-slate-400 mt-0.5">Not yet</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* sm+: horizontal */}
      <div className="hidden sm:flex items-start w-full">
        {steps.map((step, i) => (
          <div key={step.label} className="contents">
            <div className="flex flex-col items-center w-[5.5rem] shrink-0 pt-0.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  step.done
                    ? status === "rejected" && i === steps.length - 1
                      ? "bg-red-100 text-red-700 ring-2 ring-red-200/80"
                      : "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
                    : "bg-slate-100 text-slate-400 ring-1 ring-slate-200/80"
                }`}
              >
                {step.done ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`text-[11px] mt-2 font-semibold text-center leading-tight px-0.5 ${step.done ? "text-slate-900" : "text-slate-400"}`}>
                {step.label}
              </span>
              {step.date ? (
                <span className="text-[10px] text-slate-500 mt-0.5 tabular-nums text-center">
                  {formatDate(step.date)}
                </span>
              ) : null}
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mt-[1.125rem] mx-2 rounded-full min-w-[0.75rem] self-start ${
                  steps[i + 1]?.done ? "bg-indigo-500" : "bg-slate-200"
                }`}
                aria-hidden
              />
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function DecisionBanner({
  status,
  revisedAmount,
  revisedTerm,
}: {
  status: string;
  revisedAmount: string | null;
  revisedTerm: string | null;
}) {
  const config: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    approved: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-800",
      icon: "#059669",
    },
    approved_with_adjustments: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-800",
      icon: "#d97706",
    },
    rejected: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      icon: "#dc2626",
    },
  };
  const c = config[status] || config.rejected;

  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-4 mb-6`}>
      <div className="flex items-center gap-2.5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.icon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {status === "rejected" ? (
            <><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></>
          ) : (
            <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
          )}
        </svg>
        <p className={`font-semibold text-sm ${c.text}`}>
          {formatStatus(status)}
        </p>
      </div>
      {status === "approved_with_adjustments" && (revisedAmount || revisedTerm) && (
        <div className="mt-3 pl-7 space-y-1">
          {revisedAmount && (
            <p className="text-sm text-amber-700">
              Revised Amount: <span className="font-semibold">{formatCurrency(revisedAmount)}</span>
            </p>
          )}
          {revisedTerm && (
            <p className="text-sm text-amber-700">
              Revised Term: <span className="font-semibold">{formatCreditTerm(revisedTerm)}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ReadOnlySection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  const iconColors: Record<string, string> = {
    building: "bg-indigo-50 text-indigo-600",
    users: "bg-orange-50 text-orange-600",
    dollar: "bg-emerald-50 text-emerald-600",
    receipt: "bg-purple-50 text-purple-600",
  };
  const iconSvg: Record<string, React.ReactNode> = {
    building: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>,
    users: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    dollar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    receipt: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>,
  };

  return (
    <div className="app-card-solid overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/40">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-black/[0.04] ${iconColors[icon] || "bg-slate-50"}`}>
          {iconSvg[icon]}
        </span>
        <h3 className="text-sm font-semibold text-slate-900 tracking-tight">{title}</h3>
      </div>
      <div className="px-5 py-5 sm:py-6">{children}</div>
    </div>
  );
}

function DataField({
  label,
  value,
  isUrl,
  span2,
  highlight,
}: {
  label: string;
  value: string | null | undefined;
  isUrl?: boolean;
  span2?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={span2 ? "sm:col-span-2" : ""}>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      {isUrl && value ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline inline-flex items-center gap-1 font-medium"
        >
          {value}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      ) : (
        <p className={`text-sm ${highlight ? "font-semibold text-slate-900" : "text-slate-700"} ${!value ? "text-slate-300" : ""}`}>
          {value || "—"}
        </p>
      )}
    </div>
  );
}
