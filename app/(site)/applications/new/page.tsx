"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ApplicationForm from "@/components/ApplicationForm";
import UploadParser from "@/components/UploadParser";
import { vendorDraftBodyFromFormData } from "@/lib/application-payload-from-form";
import Link from "next/link";

type Tab = "build" | "upload";

type ParsedData = {
  companyName?: string | null;
  dba?: string | null;
  countryOfIncorporation?: string | null;
  websiteUrl?: string | null;
  creditAmountRequested?: string | null;
  creditTermRequested?: string | null;
  revenueBand?: string | null;
  billingContactName?: string | null;
  billingContactEmail?: string | null;
  tradeRef1?: {
    businessName?: string | null;
    engagementStart?: string | null;
    engagementEnd?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPosition?: string | null;
  };
  tradeRef2?: {
    businessName?: string | null;
    engagementStart?: string | null;
    engagementEnd?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPosition?: string | null;
  };
};

export default function NewApplicationPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("build");
  const [appliedUploadData, setAppliedUploadData] = useState<
    ParsedData | undefined
  >(undefined);
  const [formRemountKey, setFormRemountKey] = useState(0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 animate-in">
      <Link
        href="/applications"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 mb-6 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        Applications
      </Link>

      <div className="app-card p-5 sm:p-8 mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600/90 mb-2">
          New
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Credit application
        </h1>
        <p className="text-sm text-slate-500 mt-2 max-w-xl leading-relaxed">
          Save a draft with only what you know (or upload a PDF to pre-fill).
          The applicant completes and confirms the rest on the link you send
          before the application is submitted.
        </p>
      </div>

      <div
        className="flex w-full p-1.5 mb-8 rounded-2xl bg-slate-100/90 ring-1 ring-slate-200/80 shadow-inner"
        role="tablist"
        aria-label="How to create"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "build"}
          onClick={() => setTab("build")}
          className={`flex-1 flex items-center justify-center gap-2 min-h-[2.75rem] px-3 py-2.5 text-sm font-semibold rounded-xl transition-all ${
            tab === "build"
              ? "bg-white text-slate-900 shadow-md shadow-slate-900/5 ring-1 ring-slate-200/80"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <span>Build form</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "upload"}
          onClick={() => setTab("upload")}
          className={`flex-1 flex items-center justify-center gap-2 min-h-[2.75rem] px-3 py-2.5 text-sm font-semibold rounded-xl transition-all ${
            tab === "upload"
              ? "bg-white text-slate-900 shadow-md shadow-slate-900/5 ring-1 ring-slate-200/80"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Upload
        </button>
      </div>

      {tab === "upload" ? (
        <UploadParser
          onApplyToForm={(data) => {
            setAppliedUploadData(data);
            setFormRemountKey((k) => k + 1);
            setTab("build");
          }}
        />
      ) : (
        <ApplicationForm
          key={formRemountKey}
          onSubmit={async (fd) => {
            const res = await fetch("/api/applications", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(vendorDraftBodyFromFormData(fd)),
            });
            const data = (await res.json()) as { error?: string; id?: string };
            if (!res.ok) {
              return {
                error: data.error ?? "Failed to create application.",
              };
            }
            if (data.id) {
              router.push(`/applications/${data.id}`);
            }
            return {};
          }}
          initialData={appliedUploadData}
          submitLabel="Save as Draft"
          draftMode
        />
      )}
    </div>
  );
}
