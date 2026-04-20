"use client";

import ApplicationForm from "@/components/ApplicationForm";
import { vendorDraftBodyFromFormData } from "@/lib/application-payload-from-form";
import type { CustomFieldDefinition } from "@/lib/custom-field-definitions";
import { useRouter } from "next/navigation";

type TradeRef = {
  businessName?: string | null;
  engagementStart?: string | null;
  engagementEnd?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPosition?: string | null;
};

type Props = {
  applicationId: string;
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
    tradeRef1?: TradeRef;
    tradeRef2?: TradeRef;
    customFieldValues?: Record<string, string>;
  };
};

export default function EditMode({
  applicationId,
  customFieldDefinitions,
  initialData,
}: Props) {
  const router = useRouter();

  return (
    <div>
      <div className="app-card mb-6 flex items-start gap-3 p-4 sm:p-5 border-indigo-100 bg-indigo-50/40">
        <div className="w-9 h-9 rounded-xl bg-white border border-indigo-100 flex items-center justify-center shrink-0 shadow-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-indigo-950">Draft</p>
          <p className="text-xs text-indigo-900/80 mt-1 leading-relaxed">
            Add only what you already know (or upload a PDF). The recipient will
            complete and confirm the rest on the apply link before submit.
          </p>
        </div>
      </div>
      <ApplicationForm
        customFieldDefinitions={customFieldDefinitions}
        onSubmit={async (fd) => {
          const slugs = customFieldDefinitions.map((d) => d.slug);
          const res = await fetch(`/api/applications/${applicationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              vendorDraftBodyFromFormData(fd, slugs, initialData)
            ),
          });
          const data = (await res.json()) as { error?: string };
          if (!res.ok) {
            return {
              error: data.error ?? "Failed to update application.",
            };
          }
          router.refresh();
          return { success: "Application updated successfully." };
        }}
        initialData={initialData}
        submitLabel="Save Changes"
        draftMode
      />
    </div>
  );
}
