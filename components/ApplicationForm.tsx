"use client";

import type { FormSubmitState } from "@/lib/form-submit-state";
import {
  applicationBodyFromFormData,
  vendorDraftBodyFromFormData,
} from "@/lib/application-payload-from-form";
import { zodErrorMessage } from "@/lib/api-parse";
import {
  recipientSubmitBodySchema,
  vendorDraftApplicationBodySchema,
} from "@/lib/schemas/application";
import { COUNTRIES, CREDIT_TERMS, REVENUE_BANDS } from "@/lib/utils";
import type { ZodIssue } from "zod";
import { useState, type FormEvent } from "react";

function isTradeRefEngagementIssue(issue: ZodIssue): boolean {
  const p0 = issue.path[0];
  const p1 = issue.path[1];
  if (p0 !== "tradeRef1" && p0 !== "tradeRef2") return false;
  return p1 === "engagementStart" || p1 === "engagementEnd";
}

function engagementMessagesByTradeRef(
  issues: ZodIssue[]
): Partial<Record<"tradeRef1" | "tradeRef2", string>> {
  const acc: Partial<Record<"tradeRef1" | "tradeRef2", string[]>> = {};
  for (const issue of issues) {
    if (!isTradeRefEngagementIssue(issue)) continue;
    const key = issue.path[0] as "tradeRef1" | "tradeRef2";
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(issue.message);
  }
  const out: Partial<Record<"tradeRef1" | "tradeRef2", string>> = {};
  for (const k of ["tradeRef1", "tradeRef2"] as const) {
    const msgs = acc[k];
    if (msgs?.length) out[k] = [...new Set(msgs)].join(" ");
  }
  return out;
}

type TradeRef = {
  businessName?: string | null;
  engagementStart?: string | null;
  engagementEnd?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPosition?: string | null;
};

type ApplicationData = {
  companyName?: string | null;
  dba?: string | null;
  countryOfIncorporation?: string | null;
  websiteUrl?: string | null;
  creditAmountRequested?: string | null;
  creditTermRequested?: string | null;
  revenueBand?: string | null;
  billingContactName?: string | null;
  billingContactEmail?: string | null;
  tradeRef1?: TradeRef;
  tradeRef2?: TradeRef;
};

type Props = {
  onSubmit: (formData: FormData) => Promise<FormSubmitState>;
  initialData?: ApplicationData;
  submitLabel?: string;
  /** Vendor draft: company name optional; recipient completes on apply link. */
  draftMode?: boolean;
  isRecipient?: boolean;
};

export default function ApplicationForm({
  onSubmit,
  initialData,
  submitLabel = "Save Application",
  draftMode = false,
  isRecipient = false,
}: Props) {
  const [state, setState] = useState<FormSubmitState>({});
  const [pending, setPending] = useState(false);
  const [ref1Open, setRef1Open] = useState(true);
  const [ref2Open, setRef2Open] = useState(true);
  const [engagementErrors, setEngagementErrors] = useState<
    Partial<Record<"tradeRef1" | "tradeRef2", string>>
  >({});

  const recipientStrict = isRecipient && !draftMode;
  const creditTermRequired = recipientStrict || draftMode;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setState({});
    setEngagementErrors({});
    const fd = new FormData(e.currentTarget);
    if (recipientStrict) {
      const body = applicationBodyFromFormData(fd);
      const parsed = recipientSubmitBodySchema.safeParse(body);
      if (!parsed.success) {
        setEngagementErrors(
          engagementMessagesByTradeRef(parsed.error.issues)
        );
        const top = parsed.error.issues.find((i) => !isTradeRefEngagementIssue(i));
        setState({
          error:
            top?.message ??
            "Please fix the trade reference engagement dates below.",
        });
        setPending(false);
        return;
      }
    } else if (draftMode) {
      const body = vendorDraftBodyFromFormData(fd);
      const parsed = vendorDraftApplicationBodySchema.safeParse(body);
      if (!parsed.success) {
        const engagementByRef = engagementMessagesByTradeRef(
          parsed.error.issues
        );
        setEngagementErrors(engagementByRef);
        const top = parsed.error.issues.find(
          (i) => !isTradeRefEngagementIssue(i)
        );
        const hasEngagementIssue =
          Boolean(engagementByRef.tradeRef1) ||
          Boolean(engagementByRef.tradeRef2);
        setState({
          error:
            top?.message ??
            (hasEngagementIssue
              ? "Please fix the trade reference engagement dates below."
              : zodErrorMessage(parsed.error)),
        });
        setPending(false);
        return;
      }
    }
    try {
      const next = await onSubmit(fd);
      setState(next);
    } catch {
      setState({ error: "Something went wrong. Please try again." });
    } finally {
      setPending(false);
    }
  }

  const formBottomPad = recipientStrict
    ? "pb-[max(5.75rem,calc(4.25rem+env(safe-area-inset-bottom)))]"
    : "pb-[max(7.5rem,calc(5.5rem+env(safe-area-inset-bottom)))]";

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-5 sm:space-y-6 animate-in ${formBottomPad}`}
    >
      {state.error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200/90 shadow-sm" role="alert">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p className="text-sm text-red-700">{state.error}</p>
        </div>
      )}
      {state.success && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200/90 shadow-sm" role="status">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <p className="text-sm text-emerald-700">{state.success}</p>
        </div>
      )}

      <FormSection icon="building" title="Company Information" number={1}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
          <div>
            <label htmlFor="companyName">
              Company Name{" "}
              {recipientStrict && <span className="text-red-400">*</span>}
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              required={recipientStrict}
              defaultValue={initialData?.companyName ?? ""}
              placeholder="Acme Corporation"
            />
          </div>
          <div>
            <label htmlFor="dba">DBA (Doing Business As)</label>
            <input
              id="dba"
              name="dba"
              type="text"
              defaultValue={initialData?.dba ?? ""}
              placeholder="Acme Co"
            />
          </div>
          <div>
            <label htmlFor="countryOfIncorporation">
              Country of Incorporation
              {recipientStrict && (
                <span className="text-red-400"> *</span>
              )}
            </label>
            <select
              id="countryOfIncorporation"
              name="countryOfIncorporation"
              required={recipientStrict}
              defaultValue={initialData?.countryOfIncorporation ?? ""}
            >
              <option value="">Select country...</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="websiteUrl">
              Website URL
              {recipientStrict && <span className="text-red-400"> *</span>}
            </label>
            <input
              id="websiteUrl"
              name="websiteUrl"
              type={recipientStrict ? "text" : "url"}
              inputMode={recipientStrict ? "url" : undefined}
              required={recipientStrict}
              defaultValue={initialData?.websiteUrl ?? ""}
              placeholder="https://example.com"
            />
          </div>
        </div>
      </FormSection>

      {[1, 2].map((slot) => {
        const ref = slot === 1 ? initialData?.tradeRef1 : initialData?.tradeRef2;
        const isOpen = slot === 1 ? ref1Open : ref2Open;
        const toggle = slot === 1 ? setRef1Open : setRef2Open;
        const tradeRefKey = slot === 1 ? "tradeRef1" : "tradeRef2";
        const showEngagementHints = recipientStrict || draftMode;
        const engagementHint = showEngagementHints
          ? engagementErrors[tradeRefKey]
          : undefined;

        return (
          <div
            key={slot}
            className="app-card-solid overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggle(!isOpen)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/80 transition-colors cursor-pointer text-left"
              aria-expanded={isOpen}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="text-[11px] font-bold text-slate-400 tabular-nums w-6 shrink-0"
                  aria-hidden
                >
                  {String(slot + 1).padStart(2, "0")}
                </span>
                <span className="w-9 h-9 rounded-xl bg-orange-50 ring-1 ring-orange-100 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </span>
                <div className="min-w-0 text-left">
                  <span className="text-sm font-semibold text-slate-900 block">
                    Trade reference {slot}
                  </span>
                  <span className="text-xs text-slate-400 block mt-0.5">
                    {recipientStrict
                      ? "Required — include business name for each reference"
                      : "Optional — supplier or client reference"}
                  </span>
                </div>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {isOpen && (
              <div className="px-5 pb-5 pt-1 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 mt-3">
                  <div className="sm:col-span-2">
                    <label htmlFor={`tradeRef${slot}_businessName`}>
                      Business Name
                      {recipientStrict && (
                        <span className="text-red-400"> *</span>
                      )}
                    </label>
                    <input
                      id={`tradeRef${slot}_businessName`}
                      name={`tradeRef${slot}_businessName`}
                      type="text"
                      required={recipientStrict}
                      defaultValue={ref?.businessName ?? ""}
                      placeholder="Reference company name"
                      onChange={(e) => {
                        if (!draftMode || e.target.value?.trim()) return;
                        setEngagementErrors((prev) => {
                          if (!prev[tradeRefKey]) return prev;
                          const next = { ...prev };
                          delete next[tradeRefKey];
                          return next;
                        });
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor={`tradeRef${slot}_engagementStart`}>
                      Engagement Start
                    </label>
                    <input
                      id={`tradeRef${slot}_engagementStart`}
                      name={`tradeRef${slot}_engagementStart`}
                      type="date"
                      defaultValue={ref?.engagementStart ?? ""}
                      onChange={() =>
                        setEngagementErrors((prev) => {
                          if (!prev[tradeRefKey]) return prev;
                          const next = { ...prev };
                          delete next[tradeRefKey];
                          return next;
                        })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor={`tradeRef${slot}_engagementEnd`}>
                      Engagement End
                    </label>
                    <input
                      id={`tradeRef${slot}_engagementEnd`}
                      name={`tradeRef${slot}_engagementEnd`}
                      type="date"
                      defaultValue={ref?.engagementEnd ?? ""}
                      onChange={() =>
                        setEngagementErrors((prev) => {
                          if (!prev[tradeRefKey]) return prev;
                          const next = { ...prev };
                          delete next[tradeRefKey];
                          return next;
                        })
                      }
                    />
                  </div>
                  {engagementHint ? (
                    <p
                      className="sm:col-span-2 text-sm text-red-600 -mt-1"
                      role="alert"
                    >
                      {engagementHint}
                    </p>
                  ) : null}
                  <div>
                    <label htmlFor={`tradeRef${slot}_contactName`}>
                      Contact Name
                    </label>
                    <input
                      id={`tradeRef${slot}_contactName`}
                      name={`tradeRef${slot}_contactName`}
                      type="text"
                      defaultValue={ref?.contactName ?? ""}
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <label htmlFor={`tradeRef${slot}_contactEmail`}>
                      Contact Email
                    </label>
                    <input
                      id={`tradeRef${slot}_contactEmail`}
                      name={`tradeRef${slot}_contactEmail`}
                      type="email"
                      defaultValue={ref?.contactEmail ?? ""}
                      placeholder="jane@company.com"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor={`tradeRef${slot}_contactPosition`}>
                      Contact Position
                    </label>
                    <input
                      id={`tradeRef${slot}_contactPosition`}
                      name={`tradeRef${slot}_contactPosition`}
                      type="text"
                      defaultValue={ref?.contactPosition ?? ""}
                      placeholder="Account Manager"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <FormSection icon="dollar" title="Credit Details" number={4}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-5 gap-y-4">
          <div>
            <label htmlFor="creditAmountRequested">
              Amount Requested
              {recipientStrict && <span className="text-red-400"> *</span>}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
                $
              </span>
              <input
                id="creditAmountRequested"
                name="creditAmountRequested"
                type="text"
                required={recipientStrict}
                defaultValue={initialData?.creditAmountRequested ?? ""}
                placeholder="50,000"
                style={{ paddingLeft: "1.5rem" }}
              />
            </div>
          </div>
          <div>
            <label htmlFor="creditTermRequested">
              Credit Term
              {creditTermRequired && <span className="text-red-400"> *</span>}
            </label>
            <select
              id="creditTermRequested"
              name="creditTermRequested"
              required={creditTermRequired}
              defaultValue={initialData?.creditTermRequested ?? ""}
            >
              <option value="">Select term...</option>
              {CREDIT_TERMS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="revenueBand">
              Business Revenue
              {recipientStrict && <span className="text-red-400"> *</span>}
            </label>
            <select
              id="revenueBand"
              name="revenueBand"
              required={recipientStrict}
              defaultValue={initialData?.revenueBand ?? ""}
            >
              <option value="">Select range...</option>
              {REVENUE_BANDS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>
        </div>
      </FormSection>

      {/* Billing Contact */}
      <FormSection icon="receipt" title="Billing Contact" number={5}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
          <div>
            <label htmlFor="billingContactName">
              Contact Name
              {recipientStrict && <span className="text-red-400"> *</span>}
            </label>
            <input
              id="billingContactName"
              name="billingContactName"
              type="text"
              required={recipientStrict}
              defaultValue={initialData?.billingContactName ?? ""}
              placeholder="John Doe"
            />
          </div>
          <div>
            <label htmlFor="billingContactEmail">
              Contact Email
              {recipientStrict && <span className="text-red-400"> *</span>}
            </label>
            <input
              id="billingContactEmail"
              name="billingContactEmail"
              type="email"
              required={recipientStrict}
              defaultValue={initialData?.billingContactEmail ?? ""}
              placeholder="billing@company.com"
            />
          </div>
        </div>
      </FormSection>

      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/90 bg-white/95 backdrop-blur-md px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgb(15_23_42/0.06)]"
        role="toolbar"
        aria-label="Form actions"
      >
        <div className="max-w-3xl mx-auto flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-center sm:text-left text-[11px] sm:text-xs text-slate-400">
            {draftMode ? (
              <span>
                <span className="text-red-500 font-medium">*</span> Credit term
                is required. If you enter a trade reference business name,
                engagement start and end must both be set or both empty, and end
                on or after start. Otherwise leave fields blank if unknown — the
                applicant completes and confirms on their link before
                submitting.
              </span>
            ) : recipientStrict ? (
              <span>
                <span className="text-red-500 font-medium">*</span> All starred
                fields are required. Trade references need a business name each;
                engagement dates must be both filled or both empty, and end must
                be on or after start.
              </span>
            ) : (
              <>
                <span className="text-red-500 font-medium">*</span> Required fields
              </>
            )}
            {isRecipient ? (
              <span className="hidden sm:inline">
                {" "}
                · Please verify everything before submitting
              </span>
            ) : null}
          </p>
          <button
            type="submit"
            disabled={pending}
            className="w-full sm:w-auto sm:min-w-[14rem] inline-flex items-center justify-center gap-2 px-8 py-3 sm:py-2.5 sm:px-10 bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-500/25 ring-1 ring-indigo-500/15"
          >
            {pending && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            )}
            {pending ? "Saving…" : submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
}

function FormSection({
  icon,
  title,
  number,
  children,
}: {
  icon: string;
  title: string;
  number: number;
  children: React.ReactNode;
}) {
  const iconMap: Record<string, React.ReactNode> = {
    building: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
    ),
    dollar: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
    ),
    receipt: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>
    ),
  };

  const colors: Record<string, string> = {
    building: "bg-indigo-50 text-indigo-600",
    dollar: "bg-emerald-50 text-emerald-600",
    receipt: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="app-card-solid overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/40">
        <span
          className="text-[11px] font-bold text-slate-400 tabular-nums w-6 shrink-0 pt-0.5"
          aria-hidden
        >
          {String(number).padStart(2, "0")}
        </span>
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-black/[0.04] ${colors[icon] || "bg-slate-50 text-slate-600"}`}>
          {iconMap[icon]}
        </span>
        <h3 className="text-sm font-semibold text-slate-900 tracking-tight">{title}</h3>
      </div>
      <div className="px-5 py-5 sm:py-6">{children}</div>
    </div>
  );
}
