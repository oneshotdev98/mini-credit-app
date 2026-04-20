import { db } from "@/db";
import { creditApplications } from "@/db/schema";
import { listCustomFieldDefinitions } from "@/lib/custom-field-definitions";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import RecipientForm from "./RecipientForm";

export default async function ApplyPage(props: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await props.params;

  const customFieldDefinitions = await listCustomFieldDefinitions();

  const app = await db.query.creditApplications.findFirst({
    where: eq(creditApplications.accessToken, token),
    with: { tradeReferences: true },
  });

  if (!app) notFound();

  const alreadySubmitted = app.status !== "sent";
  const greeting = app.recipientName?.trim()
    ? app.recipientName.trim().split(/\s+/)[0]
    : null;

  const refs = app.tradeReferences.sort((a, b) => a.slot - b.slot);
  const ref1 = refs.find((r) => r.slot === 1);
  const ref2 = refs.find((r) => r.slot === 2);

  return (
    <div
      className="min-h-screen flex flex-col bg-slate-100 text-slate-900"
      style={{
        backgroundImage: `
          radial-gradient(ellipse 120% 80% at 50% -35%, rgb(199 210 254 / 0.5), transparent 52%),
          radial-gradient(ellipse 70% 45% at 100% 0%, rgb(224 231 255 / 0.4), transparent 42%),
          radial-gradient(ellipse 55% 40% at 0% 25%, rgb(241 245 249 / 0.9), transparent 48%)
        `,
        backgroundAttachment: "fixed",
      }}
    >
      <main
        id="main-content"
        className="flex-1 flex flex-col px-4 sm:px-6 py-10 sm:py-14"
      >
        <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col">
          <p className="text-center text-xs text-slate-600 mb-6 flex flex-wrap items-center justify-center gap-2 leading-snug">
            <ShieldCheck
              className="w-4 h-4 shrink-0 text-emerald-600"
              strokeWidth={2}
              aria-hidden
            />
            <span>
              Private link — your answers go only to the vendor. No account
              needed.
            </span>
          </p>

          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04),0_24px_48px_-12px_rgb(15_23_42/0.08)] overflow-hidden">
            {alreadySubmitted ? (
              <div className="px-6 sm:px-10 py-16 sm:py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-6">
                  <svg
                    width="28"
                    height="28"
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
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Already submitted
                </h1>
                <p className="mt-3 text-sm sm:text-base text-slate-600 max-w-md mx-auto leading-relaxed">
                  This application is with the vendor for review. You do not
                  need to do anything else.
                </p>
              </div>
            ) : (
              <>
                <div className="px-6 sm:px-8 pt-8 sm:pt-10 pb-6 border-b border-slate-100 bg-gradient-to-b from-indigo-50/40 via-white to-white">
                  <h1
                    id="apply-title"
                    className="text-2xl sm:text-[1.65rem] font-bold text-slate-900 tracking-tight leading-tight"
                  >
                    {greeting ? (
                      <>
                        Hi {greeting},{" "}
                        <span className="text-slate-700 font-semibold">
                          complete your credit application
                        </span>
                      </>
                    ) : (
                      "Complete your credit application"
                    )}
                  </h1>
                  <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-2xl">
                    Some fields may be pre-filled—review each section, then use
                    <span className="font-semibold text-slate-800">
                      {" "}
                      Submit application
                    </span>{" "}
                    at the bottom when everything looks correct.
                  </p>
                </div>

                <div className="px-4 sm:px-6 py-6 sm:py-8 bg-slate-50/50">
                  <RecipientForm
                    token={token}
                    customFieldDefinitions={customFieldDefinitions}
                    initialData={{
                      companyName: app.companyName,
                      dba: app.dba,
                      countryOfIncorporation: app.countryOfIncorporation,
                      websiteUrl: app.websiteUrl,
                      creditAmountRequested: app.creditAmountRequested,
                      creditTermRequested: app.creditTermRequested,
                      revenueBand: app.revenueBand,
                      billingContactName: app.billingContactName,
                      billingContactEmail: app.billingContactEmail,
                      customFieldValues: app.customFieldValues ?? {},
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
                    }}
                  />
                </div>
              </>
            )}
          </div>

          <p className="text-center text-[11px] sm:text-xs text-slate-500 mt-8 max-w-md mx-auto leading-relaxed">
            If you did not expect this link, you can close this page.
          </p>
        </div>
      </main>
    </div>
  );
}
