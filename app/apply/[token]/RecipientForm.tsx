"use client";

import { useState } from "react";
import { applicationBodyFromFormData } from "@/lib/application-payload-from-form";
import ApplicationForm from "@/components/ApplicationForm";
import type { CustomFieldDefinition } from "@/lib/custom-field-definitions";

type TradeRef = {
  businessName?: string | null;
  engagementStart?: string | null;
  engagementEnd?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPosition?: string | null;
};

type Props = {
  token: string;
  customFieldDefinitions: CustomFieldDefinition[];
  initialData: {
    companyName?: string | null;
    dba?: string | null;
    countryOfIncorporation?: string | null;
    websiteUrl?: string | null;
    creditAmountRequested?: string | null;
    creditTermRequested?: string | null;
    revenueBand?: string | null;
    billingContactName?: string | null;
    billingContactEmail?: string | null;
    customFieldValues?: Record<string, string>;
    tradeRef1?: TradeRef;
    tradeRef2?: TradeRef;
  };
};

type ApolloData = {
  companyName: string | null;
  dba: string | null;
  countryOfIncorporation: string | null;
  websiteUrl: string | null;
  revenueBand: string | null;
};

function pickNonEmpty(
  server: string | null | undefined,
  apollo: string | null | undefined
): string | undefined {
  const a =
    server != null && String(server).trim() !== ""
      ? String(server).trim()
      : undefined;
  if (a) return a;
  const b =
    apollo != null && String(apollo).trim() !== ""
      ? String(apollo).trim()
      : undefined;
  return b;
}

/**
 * Prefer non-empty Apollo data, then vendor draft, then the legal name the user
 * typed on step 1 (always keep at least that for company name when external
 * data is missing).
 */
function mergeRecipientInitial(
  server: Props["initialData"],
  apollo: ApolloData | null,
  typedBusinessName: string,
  options?: { apolloMatched?: boolean }
): Props["initialData"] {
  const typed = typedBusinessName.trim();

  let merged: Props["initialData"];

  if (options?.apolloMatched && apollo) {
    const a = apollo;
    merged = {
      companyName: pickNonEmpty(a.companyName, server.companyName) ?? typed,
      dba: pickNonEmpty(server.dba, a.dba),
      countryOfIncorporation: pickNonEmpty(
        a.countryOfIncorporation,
        server.countryOfIncorporation
      ),
      websiteUrl: pickNonEmpty(a.websiteUrl, server.websiteUrl),
      creditAmountRequested: pickNonEmpty(server.creditAmountRequested, undefined),
      creditTermRequested: pickNonEmpty(server.creditTermRequested, undefined),
      revenueBand: pickNonEmpty(a.revenueBand, server.revenueBand),
      billingContactName: pickNonEmpty(server.billingContactName, undefined),
      billingContactEmail: pickNonEmpty(server.billingContactEmail, undefined),
      customFieldValues: server.customFieldValues ?? {},
      tradeRef1: server.tradeRef1,
      tradeRef2: server.tradeRef2,
    };
  } else {
    merged = {
      companyName:
        pickNonEmpty(apollo?.companyName, server.companyName) ?? typed,
      dba: pickNonEmpty(server.dba, apollo?.dba),
      countryOfIncorporation: pickNonEmpty(
        server.countryOfIncorporation,
        apollo?.countryOfIncorporation
      ),
      websiteUrl: pickNonEmpty(server.websiteUrl, apollo?.websiteUrl),
      creditAmountRequested: pickNonEmpty(server.creditAmountRequested, undefined),
      creditTermRequested: pickNonEmpty(server.creditTermRequested, undefined),
      revenueBand: pickNonEmpty(server.revenueBand, apollo?.revenueBand),
      billingContactName: pickNonEmpty(server.billingContactName, undefined),
      billingContactEmail: pickNonEmpty(server.billingContactEmail, undefined),
      customFieldValues: server.customFieldValues ?? {},
      tradeRef1: server.tradeRef1,
      tradeRef2: server.tradeRef2,
    };
  }

  const cn = merged.companyName?.trim();
  if (!cn && typed) {
    merged = { ...merged, companyName: typed };
  }

  return merged;
}

export default function RecipientForm({
  token,
  customFieldDefinitions,
  initialData,
}: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState<"business" | "form">("business");
  const [businessNameInput, setBusinessNameInput] = useState(
    () => initialData.companyName?.trim() ?? ""
  );
  const [formInitial, setFormInitial] = useState(initialData);
  const [formKey, setFormKey] = useState(0);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  /** Shown on the form step when lookup failed but we continued with your typed name */
  const [prefillNotice, setPrefillNotice] = useState<string | null>(null);

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-6 py-12 sm:py-14 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white border border-emerald-100 flex items-center justify-center mx-auto mb-5 shadow-sm">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#059669"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Application submitted
        </h2>
        <p className="mt-3 text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          Thank you. The vendor has been notified and will follow up. You can
          safely close this window.
        </p>
      </div>
    );
  }

  if (step === "business") {
    return (
      <div className="space-y-5 sm:space-y-6 px-2 sm:px-0">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-4 py-4 sm:px-5 sm:py-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700/90 mb-2">
            Step 1 — Confirm your business
          </p>
          <label
            htmlFor="recipientBusinessName"
            className="block text-sm font-medium text-slate-800 mb-1.5"
          >
            Legal business name
          </label>
          <input
            id="recipientBusinessName"
            name="recipientBusinessName"
            type="text"
            autoComplete="organization"
            value={businessNameInput}
            onChange={(e) => setBusinessNameInput(e.target.value)}
            placeholder="e.g. Acme Corporation"
            className="w-full"
          />
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            We use this to look up public company signals (when enabled) and
            pre-fill the form. You can edit every field before submitting.
          </p>
        </div>

        {lookupError && (
          <div
            className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200"
            role="alert"
          >
            <p className="text-sm text-red-700">{lookupError}</p>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <button
            type="button"
            disabled={lookupBusy || !businessNameInput.trim()}
            onClick={() => {
              const name = businessNameInput.trim();
              if (!name) return;
              setLookupError(null);
              setPrefillNotice(null);
              setFormInitial(mergeRecipientInitial(initialData, null, name));
              setFormKey((k) => k + 1);
              setStep("form");
            }}
            className="inline-flex justify-center items-center px-4 py-2.5 text-sm font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            Skip lookup
          </button>
          <button
            type="button"
            disabled={lookupBusy || !businessNameInput.trim()}
            onClick={async () => {
              const name = businessNameInput.trim();
              if (!name) return;
              setLookupBusy(true);
              setLookupError(null);
              setPrefillNotice(null);
              try {
                const res = await fetch(
                  `/api/apply/${encodeURIComponent(token)}/apollo-prefill`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ businessName: name }),
                  }
                );
                const payload = (await res.json()) as {
                  error?: string;
                  matched?: boolean;
                  data?: ApolloData;
                };
                if (!res.ok) {
                  setPrefillNotice(
                    `${payload.error ?? "Company lookup failed."} Your legal business name below is filled from what you entered.`
                  );
                  setFormInitial(mergeRecipientInitial(initialData, null, name));
                  setFormKey((k) => k + 1);
                  setStep("form");
                  return;
                }
                const apollo = payload.data ?? null;
                const apolloMatched = payload.matched === true;
                setFormInitial(
                  mergeRecipientInitial(initialData, apollo, name, {
                    apolloMatched,
                  })
                );
                if (!apolloMatched) {
                  setPrefillNotice(
                    "No close match was found in the directory. Your legal business name is filled from what you entered; add other details manually."
                  );
                } else {
                  setPrefillNotice(null);
                }
                setFormKey((k) => k + 1);
                setStep("form");
              } catch {
                setPrefillNotice(
                  "Company lookup could not complete. Your legal business name below is filled from what you entered."
                );
                setFormInitial(mergeRecipientInitial(initialData, null, name));
                setFormKey((k) => k + 1);
                setStep("form");
              } finally {
                setLookupBusy(false);
              }
            }}
            className="inline-flex justify-center items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            {lookupBusy && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="animate-spin"
                aria-hidden
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            Look up & continue
          </button>
        </div>
      </div>
    );
  }

  const customSlugs = customFieldDefinitions.map((d) => d.slug);

  return (
    <div className="space-y-4">
      {prefillNotice ? (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          {prefillNotice}
        </div>
      ) : null}
      <ApplicationForm
        key={formKey}
        customFieldDefinitions={customFieldDefinitions}
        onSubmit={async (fd) => {
          const res = await fetch(
            `/api/apply/${encodeURIComponent(token)}/submit`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
              applicationBodyFromFormData(fd, customSlugs, formInitial)
            ),
            }
          );
          const data = (await res.json()) as { error?: string; success?: string };
          if (!res.ok) {
            return { error: data.error ?? "Failed to submit application." };
          }
          if (data.success === "submitted") {
            setSubmitted(true);
          }
          return {};
        }}
        initialData={formInitial}
        submitLabel="Submit application"
        isRecipient
      />
    </div>
  );
}
